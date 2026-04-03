import * as vscode from 'vscode'
import type { CursorColor } from '../config'
import type { MathSnippet } from '../text-model'
import { buildCursorTeX, insertCursorIntoSnippet, resolveCursorAnchor } from './cursor-utils'

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
    const insertionPoint = resolveCursorAnchor(snippet, document.lineAt(cursor.line).text, cursor)
    if (!insertionPoint) {
        return snippet.texString
    }

    const cursorString = buildCursorTeX(options.symbol, options.color)
    return insertCursorIntoSnippet(snippet.texString, snippet.range.start, insertionPoint, cursorString)
}
