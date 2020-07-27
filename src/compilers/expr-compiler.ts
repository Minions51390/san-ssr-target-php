/**
 * 把 ExprNode 转为 PHP 表达式
 */
import { ExprNumberNode, ExprStringNode, ExprNode, ExprTertiaryNode, ExprBinaryNode, ExprUnaryNode, ExprInterpNode, ExprAccessorNode, ExprCallNode, ExprTextNode, ExprObjectNode, ExprArrayNode } from 'san'
import { TypeGuards, _ } from 'san-ssr'
import { Stringifier } from './stringifier'

// 二元表达式操作符映射表
const binaryOp = {
    43: '+',
    45: '-',
    42: '*',
    47: '/',
    60: '<',
    62: '>',
    76: '&&',
    94: '!=',
    121: '<=',
    122: '==',
    123: '>=',
    155: '!==',
    183: '===',
    248: '||'
}

export class ExprCompiler {
    constructor (
        private readonly stringifier: Stringifier
    ) {}

    // 生成数据访问表达式代码
    dataAccess (accessorExpr?: ExprAccessorNode): string {
        let code = '$ctx->data'
        for (const path of (accessorExpr ? accessorExpr.paths : [])) {
            if (TypeGuards.isExprAccessorNode(path)) {
                code += `[${this.dataAccess(path)}]`
            } else {
                code += `[${this.stringifier.any(path.value)}]`
            }
        }
        return code
    }

    // 生成调用表达式代码
    callExpr (callExpr: ExprCallNode) {
        const paths = callExpr.name.paths
        let code = `$ctx->instance->${paths[0].value}`

        for (let i = 1; i < paths.length; i++) {
            const path = paths[i]

            switch (path.type) {
            case 1:
                code += '.' + path.value
                break

            case 2:
                code += '[' + path.value + ']'
                break

            default:
                code += '[' + this.compile(path) + ']'
            }
        }

        code += '('
        code += callExpr.args
            .map(arg => this.compile(arg))
            .join(', ')
        code += ')'

        return code
    }

    /*
     * 生成插值代码，需要处理转义，几个场景
     *
     * - 并非所有表达式都需要转义，例如：
     *     ExprTextNode[text=Hi {{san}}!]，只有其中的 ExprInterpNode[{{san}}] 部分需要转义
     * - 插值有时不需要转义，比如：
     *     <x-list list={{data | square}}></x-list>，list 作为数据传递给 <x-list> 时不转义
     */
    interp (interpExpr: ExprInterpNode, escapeHTML = !interpExpr.original) {
        let code = this.compile(interpExpr.expr)

        for (const filter of interpExpr.filters) {
            const filterName = filter.name.paths[0].value

            switch (filterName) {
            case '_style':
            case '_class':
                code = `_::${filterName}Filter(${code})`
                break

            case '_xstyle':
            case '_xclass':
                code = `_::${filterName}Filter(${code}, ${this.compile(filter.args[0])})`
                break

            case 'url':
                code = `encodeURIComponent(${code})`
                break

            default:
                code = `_::callFilter($ctx, "${filterName}", [${code}`
                for (const arg of filter.args) {
                    code += ', ' + this.compile(arg)
                }
                code += '])'
            }
        }
        return escapeHTML ? `_::escapeHTML(${code})` : code
    }

    /**
     * 常量字符串生成 PHP 表达式（字面量语法），需要处理转义。几个场景：
     *
     * - 作为 PHP 语句的一部分时，不需要转义。
     * - 输出到 HTML 时，需要转义。
     */
    str (e: ExprStringNode, escapeHTML = false): string {
        return escapeHTML
            ? this.stringifier.str(_.escapeHTML(e.value))
            : this.stringifier.str(e.value)
    }

    number (e: ExprNumberNode) {
        return this.stringifier.number(e.value)
    }

    // 生成文本片段代码
    text (textExpr: ExprTextNode) {
        if (textExpr.segs.length === 0) {
            return `''`
        }

        return textExpr.segs
            .map(seg => this.compile(seg))
            .map(seg => `(${seg})`)
            .join(' . ')
    }

    // 生成数组字面量代码
    array (arrayExpr: ExprArrayNode) {
        const items = []
        let spread = ''

        for (const item of arrayExpr.items) {
            items.push(this.compile(item.expr))
            spread += item.spread ? 1 : 0
        }

        return `_::spread([${items.join(', ')}], '${spread}')`
    }

    // 生成对象字面量代码
    object (objExpr: ExprObjectNode) {
        const items = []
        let spread = ''

        for (const item of objExpr.items) {
            if (item.spread) {
                spread += 1
                items.push(this.compile(item.expr))
            } else {
                spread += 0
                const key = this.compile(item.name)
                const val = this.compile(item.expr)
                items.push(`[${key}, ${val}]`)
            }
        }
        return `_::objSpread([${items.join(', ')}], '${spread}')`
    }

    unary (e: ExprUnaryNode) {
        if (e.operator === 33) return '!' + this.compile(e.expr)
        if (e.operator === 45) return '-' + this.compile(e.expr)
        throw new Error(`unexpected unary operator "${String.fromCharCode(e.operator)}"`)
    }

    binary (e: ExprBinaryNode) {
        const lhs = this.compile(e.segs[0])
        const rhs = this.compile(e.segs[1])
        const op = binaryOp[e.operator]
        if (op === '||') {
            return `(${lhs} ? ${lhs} : ${rhs})`
        }
        return `${lhs} ${op} ${rhs}`
    }

    tertiary (e: ExprTertiaryNode) {
        return this.compile(e.segs[0]) +
            '?' + this.compile(e.segs[1]) +
            ':' + this.compile(e.segs[2])
    }

    compile (e: ExprNode, escapeHTML?: boolean): string {
        let code = ''
        if (TypeGuards.isExprUnaryNode(e)) code = this.unary(e)
        else if (TypeGuards.isExprBinaryNode(e)) code = this.binary(e)
        else if (TypeGuards.isExprTertiaryNode(e)) code = this.tertiary(e)
        else if (TypeGuards.isExprStringNode(e)) code = this.str(e, escapeHTML)
        else if (TypeGuards.isExprNumberNode(e)) code = this.number(e)
        else if (TypeGuards.isExprBoolNode(e)) code = e.value ? 'true' : 'false'
        else if (TypeGuards.isExprAccessorNode(e)) code = this.dataAccess(e)
        else if (TypeGuards.isExprInterpNode(e)) code = this.interp(e, escapeHTML)
        else if (TypeGuards.isExprTextNode(e)) code = this.text(e)
        else if (TypeGuards.isExprArrayNode(e)) code = this.array(e)
        else if (TypeGuards.isExprObjectNode(e)) code = this.object(e)
        else if (TypeGuards.isExprCallNode(e)) code = this.callExpr(e)
        else if (TypeGuards.isExprNullNode(e)) code = 'null'
        else throw new Error(`unexpected expression ${JSON.stringify(e)}`)
        return e.parenthesized ? `(${code})` : code
    }
}
