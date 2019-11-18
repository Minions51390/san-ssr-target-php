import camelCase from 'camelcase'
import { startMeasure } from './timing'
import { readdirSync, writeFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { SanProject } from 'san-ssr'
import debugFactory from 'debug'
import ToPHPCompiler from '../index'

const debug = debugFactory('case')
const caseRoot = resolve(__dirname, '../../test/cases')
const tsConfigFilePath = resolve(__dirname, '../../test/tsconfig.json')
const cases = readdirSync(caseRoot)
const sanProject = new SanProject({
    tsConfigFilePath,
    modules: {
        './php': 'exports.htmlspecialchars = x => x' // case: depend-on-declaration
    }
})

export function compileToPHP (caseName) {
    const ts = join(caseRoot, caseName, 'component.ts')
    const js = resolve(caseRoot, caseName, 'component.js')
    const targetCode = sanProject.compile(
        existsSync(ts) ? ts : js,
        ToPHPCompiler,
        {
            nsPrefix: `san\\${camelCase(caseName)}\\`,
            modules: {
                './php': {
                    required: true
                }
            }
        }
    )

    writeFileSync(join(caseRoot, caseName, 'ssr.php'), targetCode)
}

export function compileAllToPHP () {
    const timing = startMeasure()
    for (const caseName of cases) {
        console.log(`compiling ${caseName} to php`)
        compileToPHP(caseName)
    }
    console.log('compiled in', timing.duration())
}
