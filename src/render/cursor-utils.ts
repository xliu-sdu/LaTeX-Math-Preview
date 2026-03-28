import type { CursorColor } from '../config'

export function insertCursorIntoSnippet(
    snippetTex: string,
    snippetStart: { line: number, character: number },
    cursor: { line: number, character: number },
    cursorString: string
): string | undefined {
    const line = cursor.line - snippetStart.line
    const character = line === 0 ? cursor.character - snippetStart.character : cursor.character
    if (line < 0 || character < 0) {
        return undefined
    }
    const texLines = snippetTex.split('\n')
    if (!texLines[line]) {
        return undefined
    }
    texLines[line] = texLines[line].slice(0, character) + cursorString + texLines[line].slice(character)
    return texLines.join('\n')
}

export function normalizeCursorSymbolForTeX(symbol: string): string {
    return symbol.replace(/\\\\/g, '\\')
}

export function buildCursorTeX(symbol: string, color: CursorColor): string {
    const normalizedSymbol = normalizeCursorSymbolForTeX(symbol)
    if (color === 'auto') {
        return normalizedSymbol
    }
    return `{\\color{${color}}${normalizedSymbol}}`
}
