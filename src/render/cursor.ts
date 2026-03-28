import * as vscode from 'vscode'
import type { CursorColor } from '../config'
import type { MathSnippet } from '../text-model'
import { containsPoint } from '../text-model'
import { buildCursorTeX, findBackslashRun, findControlWordCommandStart, insertCursorIntoSnippet, shouldSuppressCursorAtBoundary } from './cursor-utils'

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
    const lineText = document.lineAt(cursor.line).text
    const controlWordStart = findControlWordCommandStart(lineText, cursor.character)
    const backslashRun = controlWordStart === undefined
        ? findBackslashRun(lineText, cursor.character)
        : undefined
    const insertionPoint = controlWordStart === undefined && backslashRun === undefined
        ? cursor
        : { line: cursor.line, character: controlWordStart ?? backslashRun!.start }
    if (!containsPoint(snippet.range, insertionPoint)) {
        return snippet.texString
    }
    if (shouldSuppressCursorAtBoundary(snippet.range, insertionPoint, controlWordStart !== undefined || backslashRun !== undefined)) {
        return snippet.texString
    }
    if (isCursorInSuppressedTeXToken(lineText, cursor.character, backslashRun)) {
        return snippet.texString
    }
    const cursorString = buildCursorTeX(options.symbol, options.color)
    const rendered = insertCursorIntoSnippet(snippet.texString, snippet.range.start, insertionPoint, cursorString)
    if (!rendered) {
        return snippet.texString
    }
    return rendered
}

function isCursorInSuppressedTeXToken(
    lineText: string,
    cursorCharacter: number,
    backslashRun?: { start: number, end: number }
): boolean {
    const regex = /\\(?:begin|end|label)\{.*?\}|\\(?:begin|end|label)\{?|\\[()[\]]|\\\\/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(lineText)) !== null) {
        const start = m.index
        const end = start + m[0].length
        if (backslashRun && start === backslashRun.start && cursorCharacter > backslashRun.start && cursorCharacter <= backslashRun.end) {
            continue
        }
        if (start < cursorCharacter && cursorCharacter < end) {
            return true
        }
    }
    return false
}

export { insertCursorIntoSnippet as insertCursorHelper }
