export class Stringifier {
    private helpers = ''

    constructor (helpersNamespace: string) {
        this.helpers = helpersNamespace
    }

    obj (source: object) {
        let prefixComma
        let result = '['

        for (const key in source) {
            if (!source.hasOwnProperty(key) || typeof source[key] === 'undefined') {
                continue
            }

            if (prefixComma) {
                result += ','
            }
            prefixComma = 1

            const k = this.str(key)
            const v = this.any(source[key])
            result += `${k} => ${v}`
        }

        return result + ']'
    }

    arr (source: any[]) {
        let prefixComma
        let result = '['

        for (const value of source) {
            if (prefixComma) {
                result += ','
            }
            prefixComma = 1

            result += this.any(value)
        }

        return result + ']'
    }

    str (source: string) {
        return '"' + source
            .replace(/\x5C/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/(\\)?\$/g, '\\$$') // php 变量解析 fix, 方案同 ts2php
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
            .replace(/\r/g, '\\r') + '"'
    }

    date (source: Date) {
        return `new ${this.helpers}\\Ts2Php_Date(` + source.getTime() + ')'
    }

    any (source: any): string {
        switch (typeof source) {
        case 'string':
            return this.str(source)

        case 'number':
            if (isNaN(source)) return 'null'
            return '' + source

        case 'boolean':
            return source ? 'true' : 'false'

        case 'object':
            if (!source) {
                return 'null'
            }

            if (source instanceof Array) {
                return this.arr(source)
            }

            if (source instanceof Date) {
                return this.date(source)
            }

            return this.obj(source)
        }

        throw new Error('Cannot Stringify:' + source)
    }
}
