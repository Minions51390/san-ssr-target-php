const { SanProject } = require('san-ssr')
const { writeFileSync } = require('fs')

const project = new SanProject()
const targetCode = project.compile(
    './src/index.ts',
    'php',
    { nsPrefix: 'demo\\' }
)

writeFileSync('./dist/index.php', targetCode)
