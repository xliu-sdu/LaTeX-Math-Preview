import type { CursorColor } from '../config'
import type { Point, TextRange } from '../text-model'

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

export function findControlWordCommandStart(lineText: string, cursorCharacter: number): number | undefined {
    const regex = /\\(?!(?:begin|end|label)\b)[a-zA-Z]+/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(lineText)) !== null) {
        const start = m.index
        const end = start + m[0].length
        if (start <= cursorCharacter && cursorCharacter <= end) {
            return start
        }
    }
    return undefined
}

export function findBackslashRun(lineText: string, cursorCharacter: number): { start: number, end: number } | undefined {
    const anchor = lineText[cursorCharacter] === '\\'
        ? cursorCharacter
        : lineText[cursorCharacter - 1] === '\\'
            ? cursorCharacter - 1
            : -1
    if (anchor < 0) {
        return undefined
    }
    let start = anchor
    while (start > 0 && lineText[start - 1] === '\\') {
        start -= 1
    }
    let end = anchor + 1
    while (end < lineText.length && lineText[end] === '\\') {
        end += 1
    }
    return { start, end }
}

export function shouldSuppressCursorAtBoundary(range: TextRange, insertionPoint: Point, allowSnippetStart: boolean): boolean {
    if (range.start.line === insertionPoint.line && range.start.character === insertionPoint.character) {
        return !allowSnippetStart
    }
    return range.end.line === insertionPoint.line && range.end.character === insertionPoint.character
}
