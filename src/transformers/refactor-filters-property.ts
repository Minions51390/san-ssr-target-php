import { FunctionExpression, MethodDeclaration, TypeGuards, PropertyDeclaration } from 'ts-morph'

export function refactorFiltersProperty (filters: PropertyDeclaration, sanssr = 'san-ssr') {
    filters.setType(`import("${sanssr}").SanSSRFiltersDeclarations`)

    const filtersDefinitions = filters.getInitializer()
    if (!filtersDefinitions) return
    if (!TypeGuards.isObjectLiteralExpression(filtersDefinitions)) return
    for (const prop of filtersDefinitions.getProperties()) {
        let body: MethodDeclaration | FunctionExpression
        if (TypeGuards.isMethodDeclaration(prop)) {
            body = prop
        }
        if (TypeGuards.isPropertyAssignment(prop)) {
            const init = prop.getInitializer()
            if (TypeGuards.isFunctionExpression(init)) body = init
        }
        if (body) {
            const parameterLength = body.getParameters().length
            body.insertParameter(parameterLength, {
                name: 'sanssrSelf',
                type: filters.getParentOrThrow().getName()
            })
            body.forEachDescendant(node => {
                if (TypeGuards.isThisExpression(node)) {
                    node.replaceWithText('sanssrSelf')
                }
            })
        }
    }
}
