import * as vscode from 'vscode'
import type { CursorColor } from '../config'
import type { MathSnippet } from '../text-model'
import { containsPoint, isPointEqual } from '../text-model'
import { buildCursorTeX, insertCursorIntoSnippet } from './cursor-utils'

export type CursorOptions = {
    enabled: boolean
    symbol: string
    color: CursorColor
}

export function getThemeTextColor(): string {
    return vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? '#000000' : '#ffffff'
}

export function renderCursor(document: vscode.TextDocument, snippet: MathSnippet, options: CursorOptions): string {
    if (!options.enabled) {
        return snippet.texString
    }
    const editor = vscode.window.activeTextEditor
    if (!editor) {
        return snippet.texString
    }
    const cursor = { line: editor.selection.active.line, character: editor.selection.active.character }
    if (!containsPoint(snippet.range, cursor)) {
        return snippet.texString
    }
    if (isPointEqual(snippet.range.start, cursor) || isPointEqual(snippet.range.end, cursor)) {
        return snippet.texString
    }
    if (isCursorInTeXMacro(document, editor.selection.active)) {
        return snippet.texString
    }
    const cursorString = buildCursorTeX(options.symbol, options.color)
    const rendered = insertCursorIntoSnippet(snippet.texString, snippet.range.start, cursor, cursorString)
    if (!rendered) {
        return snippet.texString
    }
    return rendered
}

function isCursorInTeXMacro(document: vscode.TextDocument, cursor: vscode.Position): boolean {
    const line = document.lineAt(cursor.line).text
    const regex = /\\(?:begin|end|label)\{.*?\}|\\[a-zA-Z]+\{?|\\[()[\]]|\\\\/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(line)) !== null) {
        const start = m.index
        const end = start + m[0].length
        if (start < cursor.character && cursor.character < end) {
            return true
        }
    }
    return false
}

export { insertCursorIntoSnippet as insertCursorHelper }
