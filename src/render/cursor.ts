import * as vscode from 'vscode'
import type { CursorColor } from '../config'
import type { MathSnippet, Point } from '../text-model'
import { buildMarkerTeX, insertCursorIntoSnippet, insertMarkersIntoSnippet, resolveMarkerAnchor } from './cursor-utils'

export type CursorOptions = {
    enabled: boolean
    symbol: string
    color: CursorColor
    selectionStartSymbol: string
    selectionEndSymbol: string
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

    const selection = editor.selection
    if (!selection.isEmpty) {
        const selectionMarkers = []
        // anchor point
        const anchorPoint: Point = selection.anchor
        const anchorSymbol = selection.isReversed ? options.selectionEndSymbol : options.selectionStartSymbol
        const anchorInsertionPoint = resolveMarkerAnchor(snippet, document.lineAt(anchorPoint.line).text, anchorPoint)!
        selectionMarkers.push({
            point: anchorInsertionPoint,
            markerString: buildMarkerTeX(anchorSymbol, options.color)
        })
        // active point
        const activePoint: Point = selection.active
        const activeSymbol = selection.isReversed ? options.selectionStartSymbol : options.selectionEndSymbol
        const activeInsertionPoint = resolveMarkerAnchor(snippet, document.lineAt(activePoint.line).text, activePoint)
        if (activeInsertionPoint) {
            selectionMarkers.push({
                point: activeInsertionPoint,
                markerString: buildMarkerTeX(activeSymbol, options.color)
            })
        }

        if (selectionMarkers.length === 0) {
            return snippet.texString
        }
        return insertMarkersIntoSnippet(snippet.texString, snippet.range.start, selectionMarkers)
    }
    // empty selection
    const cursor: Point = selection.active
    const insertionPoint = resolveMarkerAnchor(snippet, document.lineAt(cursor.line).text, cursor)
    if (!insertionPoint) {
        return snippet.texString
    }
    const cursorString = buildMarkerTeX(options.symbol, options.color)
    return insertCursorIntoSnippet(snippet.texString, snippet.range.start, insertionPoint, cursorString)
}
