import { ANode, ASlotNode, ATextNode, AForNode, ComponentConstructor, AIfNode, ExprStringNode } from 'san'
import { ComponentTree, TypeGuards, ComponentInfo, getANodePropByName, getANodeProps } from 'san-ssr'
import { ElementCompiler } from './element-compiler'
import { PHPEmitter } from '../emitters/emitter'
import * as compileExprSource from '../compilers/expr-compiler'

type ComponentInfoGetter = (CompilerClass: ComponentConstructor<{}, {}>) => ComponentInfo

/**
 * ANode 语义的表达，其中普通 DOM 元素类型的 ANode 实现在 ElementCompiler 中
 *
 * @param owner 所述的组件
 * @param root 组件树
 * @param emitter 输出器
*/
export class ANodeCompiler {
    private id = 0

    constructor (
        private owner: ComponentInfo,
        private root: ComponentTree,
        private emitter: PHPEmitter,
        private elementCompiler: ElementCompiler
    ) {}

    compile (aNode: ANode) {
        if (TypeGuards.isATextNode(aNode)) return this.compileText(aNode)
        if (TypeGuards.isAIfNode(aNode)) return this.compileIf(aNode)
        if (TypeGuards.isAForNode(aNode)) return this.compileFor(aNode)
        if (TypeGuards.isASlotNode(aNode)) return this.compileSlot(aNode)
        if (TypeGuards.isATemplateNode(aNode)) return this.compileTemplate(aNode)

        const ComponentClass = this.owner.getChildComponentClass(aNode)
        if (ComponentClass) {
            const info = this.root.addComponentClass(ComponentClass)
            return info ? this.compileComponent(aNode, info) : undefined
        }

        this.compileElement(aNode)
    }

    compileText (aNode: ATextNode) {
        const { emitter } = this
        if (aNode.textExpr.original) {
            emitter.writeIf('!$noDataOutput', () => {
                emitter.bufferHTMLLiteral('<!--s-text-->')
                emitter.clearStringLiteralBuffer()
            })
        }

        if (aNode.textExpr.value != null) {
            emitter.bufferHTMLLiteral((aNode.textExpr.segs[0] as ExprStringNode).literal!)
        } else {
            emitter.writeHTML(compileExprSource.expr(aNode.textExpr))
        }

        if (aNode.textExpr.original) {
            emitter.writeIf('!$noDataOutput', () => {
                emitter.bufferHTMLLiteral('<!--/s-text-->')
                emitter.clearStringLiteralBuffer()
            })
        }
    }

    compileTemplate (aNode: ANode) {
        this.elementCompiler.inner(aNode)
    }

    compileIf (aNode: AIfNode) {
        const { emitter } = this
        // output if
        const ifDirective = aNode.directives['if'] // eslint-disable-line dot-notation
        emitter.writeIf(compileExprSource.expr(ifDirective.value), () => {
            this.compile(aNode.ifRinsed)
        })

        // output elif and else
        for (const elseANode of aNode.elses || []) {
            const elifDirective = elseANode.directives.elif
            if (elifDirective) {
                emitter.beginElseIf(compileExprSource.expr(elifDirective.value))
            } else {
                emitter.beginElse()
            }

            this.compile(elseANode)
            emitter.endBlock()
        }
    }

    compileFor (aNode: AForNode) {
        const forElementANode: ANode = {
            children: aNode.children,
            props: aNode.props,
            events: aNode.events,
            tagName: aNode.tagName,
            directives: { ...aNode.directives }
        }
        delete forElementANode.directives.for

        const forDirective = aNode.directives.for
        const itemName = forDirective.item
        const indexName = forDirective.index || this.nextID()
        const listName = this.nextID()
        const { emitter } = this

        emitter.writeLine(`$${listName} = ${compileExprSource.expr(forDirective.value)};`)
        emitter.writeIf(`is_array($${listName}) || is_object($${listName})`, () => {
            emitter.writeForeach(`$${listName} as $${indexName} => $value`, () => {
                emitter.writeLine(`$ctx->data["${indexName}"] = $${indexName};`)
                emitter.writeLine(`$ctx->data["${itemName}"] = $value;`)
                this.compile(forElementANode)
            })
        })
    }

    // 编译 slot 节点
    compileSlot (aNode: ASlotNode) {
        const rendererId = this.nextID()
        const { emitter } = this

        emitter.writeIf(`!isset($ctx->slotRenderers["${rendererId}"])`, () => {
            emitter.carriageReturn()
            emitter.write(`$ctx->slotRenderers["${rendererId}"] = `)
            emitter.writeAnonymousFunction([], ['&$ctx', '&$html'], () => {
                emitter.carriageReturn()
                emitter.write('$defaultSlotRender = ')
                emitter.writeAnonymousFunction(['$ctx'], [], () => {
                    emitter.writeLine('$html = "";')
                    for (const aNodeChild of aNode.children) this.compile(aNodeChild)
                    emitter.writeLine('return $html;')
                })
                emitter.write(';')

                emitter.writeLine('$isInserted = false;')
                emitter.writeLine('$ctxSourceSlots = $ctx->sourceSlots;')
                emitter.writeLine('$mySourceSlots = [];')

                const nameProp = getANodePropByName(aNode, 'name')
                if (nameProp) {
                    emitter.writeLine('$slotName = ' + compileExprSource.expr(nameProp.expr) + ';')

                    emitter.writeForeach('$ctxSourceSlots as $i => $slot', () => {
                        emitter.writeIf('count($slot) > 1 && $slot[1] == $slotName', () => {
                            emitter.writeLine('array_push($mySourceSlots, $slot[0]);')
                            emitter.writeLine('$isInserted = true;')
                        })
                    })
                } else {
                    emitter.writeIf('count($ctxSourceSlots) > 0 && !isset($ctxSourceSlots[0][1])', () => {
                        emitter.writeLine('array_push($mySourceSlots, $ctxSourceSlots[0][0]);')
                        emitter.writeLine('$isInserted = true;')
                    })
                }

                emitter.writeIf('!$isInserted', () => {
                    emitter.writeLine('array_push($mySourceSlots, $defaultSlotRender);')
                })
                emitter.writeLine('$slotCtx = $isInserted ? $ctx->owner : $ctx;')

                if (aNode.vars || aNode.directives.bind) {
                    emitter.writeLine('$slotCtx = (object)["sanssrCid" => $slotCtx->sanssrCid, "data" => $slotCtx->data, "instance" => $slotCtx->instance, "owner" => $slotCtx->owner];')
                }
                if (aNode.directives.bind) {
                    emitter.writeLine('_::extend($slotCtx->data, ' + compileExprSource.expr(aNode.directives.bind.value) + ');'); // eslint-disable-line
                }

                if (aNode.vars) {
                    for (const varItem of aNode.vars) {
                        emitter.writeLine(
                            `$slotCtx->data["${varItem.name}"] = ` +
                            compileExprSource.expr(varItem.expr) + ';'
                        )
                    }
                }

                emitter.writeForeach('$mySourceSlots as $renderIndex => $slot', () => {
                    emitter.writeHTML('$slot($slotCtx);')
                })
            })
            emitter.write(';')
            emitter.writeNewLine()
        })
        emitter.writeLine(`call_user_func($ctx->slotRenderers["${rendererId}"]);`)
    }

    compileElement (aNode: ANode) {
        this.elementCompiler.tagStart(aNode)
        this.elementCompiler.inner(aNode)
        this.elementCompiler.tagEnd(aNode)
    }

    /**
     * @param aNode 要被编译的 aNode
     * @param componentInfo 这个 aNode 关联的组件（与 aNode 所属的 owner 组件不同）
     */
    compileComponent (aNode: ANode, componentInfo: ComponentInfo) {
        const { emitter } = this
        let dataLiteral = '[]'

        emitter.writeLine('$sourceSlots = [];')
        const defaultSourceSlots: ANode[] = []
        const sourceSlotCodes = {}

        for (const child of aNode.children!) {
            const slotBind = !child.textExpr && getANodePropByName(child, 'slot')
            if (slotBind) {
                if (!sourceSlotCodes[slotBind.raw]) {
                    sourceSlotCodes[slotBind.raw] = {
                        children: [],
                        prop: slotBind
                    }
                }

                sourceSlotCodes[slotBind.raw].children.push(child)
            } else {
                defaultSourceSlots.push(child)
            }
        }

        if (defaultSourceSlots.length) {
            emitter.nextLine('array_push($sourceSlots, [')
            emitter.writeAnonymousFunction(['$ctx'], [], () => {
                emitter.writeLine('$html = "";')
                defaultSourceSlots.forEach((child: ANode) => this.compile(child))
                emitter.writeLine('return $html;')
            })
            emitter.feedLine(']);')
        }

        for (const key in sourceSlotCodes) {
            const sourceSlotCode = sourceSlotCodes[key]
            emitter.nextLine('array_push($sourceSlots, [')
            emitter.writeAnonymousFunction(['$ctx'], [], () => {
                emitter.writeLine('$html = "";')
                sourceSlotCode.children.forEach((child: ANode) => this.compile(child))
                emitter.writeLine('return $html;')
            })
            emitter.feedLine(', ' + compileExprSource.expr(sourceSlotCode.prop.expr) + ']);')
        }

        const givenData = []
        for (const prop of getANodeProps(aNode)) {
            const key = compileExprSource.stringLiteralize(prop.name)
            const val = compileExprSource.expr(prop.expr)
            givenData.push(`${key} => ${val}`)
        }

        dataLiteral = '[' + givenData.join(',\n') + ']'
        if (aNode.directives.bind) {
            const bindData = compileExprSource.expr(aNode.directives.bind.value)
            dataLiteral = `_::combine(${bindData}, ${dataLiteral})`
        }

        const renderId = 'sanssrRenderer' + componentInfo.cid
        emitter.nextLine(`$html .= `)
        emitter.writeFunctionCall(renderId, [dataLiteral, 'true', '$ctx', emitter.stringify(aNode.tagName), '$sourceSlots'])
        emitter.feedLine(';')
        emitter.writeLine('$sourceSlots = null;')
    }

    private nextID () {
        return 'sanssrId' + (this.id++)
    }
}
