/**
 * 将组件树编译成 render 函数之间的递归调用
 * 提供 generateRenderModule 方法
 */
import { compileExprSource } from '../compilers/expr-compiler'
import { noop } from 'lodash'
import { Component } from 'san'
import { Stringifier } from './stringifier'
import { ANodeCompiler } from './anode-compiler'
import { ElementCompiler } from './element-compiler'

export class RendererCompiler {
    private namespacePrefix = ''
    private stringifier: Stringifier
    private aNodeCompiler: ANodeCompiler
    private elementCompiler: ElementCompiler
    private emitter
    private component
    private hasInitedMethod = false
    private noTemplateOutput: boolean

    constructor (ComponentClass, emitter, noTemplateOutput: boolean, nsPrefix: string) {
        this.emitter = emitter
        this.noTemplateOutput = noTemplateOutput

        if (typeof ComponentClass.prototype.inited === 'function') {
            this.hasInitedMethod = true
            delete ComponentClass.prototype.inited
        }
        this.component = this.createComponentInstance(ComponentClass)
        this.stringifier = new Stringifier(nsPrefix)
        this.elementCompiler = new ElementCompiler(
            (aNodeChild, emitter) => this.aNodeCompiler.compile(aNodeChild, emitter)
        )
        this.aNodeCompiler = new ANodeCompiler(this.component, this.elementCompiler, this.stringifier)
    }

    /**
    * 生成组件渲染的函数体
    */
    compile () {
        const emitter = this.emitter
        emitter.writeLine('$html = "";')

        this.genComponentContextCode(this.component, emitter)

        // call initData()
        const defaultData = (this.component.initData && this.component.initData()) || {}
        for (const key of Object.keys(defaultData)) {
            const val = this.stringifier.any(defaultData[key])
            if (val === 'NaN') continue
            emitter.writeLine(`$ctx->data->${key} = isset($ctx->data->${key}) ? $ctx->data->${key} : ${val};`)
        }

        // calc inited()
        if (this.hasInitedMethod) {
            emitter.writeLine('$ctx->instance->inited();')
        }

        // populate computed data
        emitter.writeForeach('$ctx->computedNames as $i => $computedName', () => {
            emitter.writeLine('$data->$computedName = _::callComputed($ctx, $computedName);')
        })

        const ifDirective = this.component.aNode.directives['if']
        if (ifDirective) {
            emitter.writeLine('if (' + compileExprSource.expr(ifDirective.value) + ') {')
            emitter.indent()
        }

        this.elementCompiler.tagStart(emitter, this.component.aNode, 'tagName', this.noTemplateOutput)
        emitter.writeIf('!$noDataOutput', () => emitter.writeDataComment())
        this.elementCompiler.inner(emitter, this.component.aNode)
        this.elementCompiler.tagEnd(emitter, this.component.aNode, 'tagName', this.noTemplateOutput)

        if (ifDirective) {
            emitter.unindent()
            emitter.writeLine('}')
        }

        emitter.writeLine('return $html;')
    }

    /**
    * 生成组件 renderer 时 ctx 对象构建的代码
    */
    genComponentContextCode (component, emitter) {
        emitter.nextLine('$ctx = (object)[')
        emitter.indent()

        emitter.nextLine('"computedNames" => [')
        emitter.write(Object.keys(component.computed).map(x => `"${x}"`).join(','))
        emitter.feedLine('],')

        emitter.writeLine(`"sanssrCid" => ${component.constructor.sanssrCid || 0},`)
        emitter.writeLine('"sourceSlots" => $sourceSlots,')
        emitter.writeLine('"data" => $data ? $data : (object)[],')
        emitter.writeLine('"owner" => $parentCtx,')
        emitter.writeLine('"slotRenderers" => []')

        emitter.unindent()
        emitter.writeLine('];')
        emitter.writeLine('$ctx->instance = _::createComponent($ctx);')
    }

    private createComponentInstance (ComponentClass) {
        // TODO Do not `new Component` during SSR,
        // see https://github.com/searchfe/san-ssr/issues/42
        const proto = ComponentClass.prototype.__proto__    // eslint-disable-line
        const calcComputed = proto['_calcComputed']
        proto['_calcComputed'] = noop
        const instance = new ComponentClass()
        proto['_calcComputed'] = calcComputed
        return instance
    }
}
