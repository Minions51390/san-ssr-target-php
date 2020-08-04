import { Emitter } from 'san-ssr'
import { Stringifier } from '../compilers/stringifier'

export class PHPEmitter extends Emitter {
    private stringifier: Stringifier
    buffer: string = ''

    /**
     * @param emitHeader 输出 PHP 头 `<?php`
     * @param helpersNamespace helpers 所在的命名空间
     */
    constructor (emitHeader = false, public helpersNamespace = '') {
        super()
        if (emitHeader) this.writeLine('<?php')
        this.stringifier = new Stringifier(helpersNamespace)
    }

    fullText () {
        this.clearStringLiteralBuffer()
        return super.fullText()
    }

    public stringify (val: any): string {
        return this.stringifier.any(val)
    }

    public write (str: string) {
        this.clearStringLiteralBuffer()
        return this.defaultWrite(str)
    }

    public beginNamespace (ns: string = '') {
        const code = ns === ''
            ? 'namespace {'
            : `namespace ${ns} {`

        this.writeLine(code)
        this.indent()
    }

    public endNamespace () {
        this.unindent()
        this.writeLine('}')
    }

    public writeNamespace (ns: string, cb?: Function) {
        if (cb) {
            this.beginNamespace(ns)
            cb()
            this.endNamespace()
        } else {
            this.writeLine(`namespace ${ns};`)
        }
    }

    public writeHTMLLiteral (str: string) {
        this.buffer += str
    }

    public writeHTMLExpression (code: string) {
        this.writeLine(`$html .= ${code};`)
    }

    public clearStringLiteralBuffer () {
        if (this.buffer === '') return
        const buffer = this.buffer
        this.buffer = ''
        this.writeHTMLExpression(this.stringify(buffer))
    }

    public writeSwitch (expr: string, body: Function) {
        this.writeLine(`switch (${expr}) {`)
        this.indent()
        body()
        this.unindent()
        this.writeLine('}')
    }

    public writeCase (expr: string, body: Function = () => null) {
        this.writeLine(`case ${expr}:`)
        this.indent()
        body()
        this.unindent()
    }

    public writeBreak () {
        this.writeLine('break;')
    }

    public writeDefault (body: Function = () => null) {
        this.writeLine('default:')
        this.indent()
        body()
        this.unindent()
    }

    public writeFunction (name = '', args: string[] = [], use: string[] = [], body: Function = () => null) {
        const nameStr = name ? `${name} ` : ''
        const argsStr = args.join(', ')
        const useStr = use.length ? `use (${use.join(', ')}) ` : ''
        this.feedLine(`function ${nameStr}(${argsStr}) ${useStr}{`)
        this.indent()
        body()
        this.unindent()
        this.nextLine('}')
    }

    public writeAnonymousFunction (args: string[] = [], use: string[] = [], body: Function = () => null) {
        this.writeFunction('', args, use, body)
    }

    public writeFunctionCall (name: string, args: string[]) {
        this.write(`${name}(${args.join(', ')})`)
    }

    public writeIf (expr: string, cb: Function) {
        this.beginIf(expr)
        cb()
        this.endIf()
    }

    public beginIf (expr: string) {
        this.beginBlock(`if (${expr})`)
    }

    public beginElseIf (expr: string) {
        this.beginBlock(`else if (${expr})`)
    }

    public beginElse () {
        this.beginBlock('else')
    }

    public endIf () {
        this.endBlock()
    }

    public writeForeach (expr: string, cb: Function) {
        this.beginForeach(expr)
        cb()
        this.endForeach()
    }

    public beginForeach (expr: string) {
        this.beginBlock(`foreach (${expr})`)
    }

    public endForeach () {
        this.endBlock()
    }

    public writeContinue () {
        this.writeLine('continue;')
    }

    public writeBlock (expr: string, cb: Function) {
        this.beginBlock(expr)
        cb()
        this.endBlock()
    }

    public beginBlock (expr: string) {
        this.writeLine(`${expr} {`)
        this.indent()
    }

    public endBlock () {
        this.clearStringLiteralBuffer()
        this.unindent()
        this.writeLine('}')
    }
}
