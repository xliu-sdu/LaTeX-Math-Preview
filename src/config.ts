import * as vscode from 'vscode'

const NS = 'latex-math-preview'

export type CursorColor =
    | 'auto'
    | 'black'
    | 'blue'
    | 'brown'
    | 'cyan'
    | 'darkgray'
    | 'gray'
    | 'green'
    | 'lightgray'
    | 'lime'
    | 'magenta'
    | 'olive'
    | 'orange'
    | 'pink'
    | 'purple'
    | 'red'
    | 'teal'
    | 'violet'
    | 'white'
    | 'yellow'

export type EditorGroup = 'current' | 'left' | 'right' | 'above' | 'below'

type Config = {
    panelCursorEnabled: boolean
    panelEditorGroup: EditorGroup
    previewMaxLines: number
    previewScale: number
    parseTeXFileEnabled: boolean
    macroFile: string
    hoverCursorEnabled: boolean
    hoverCursorSymbol: string
    hoverCursorColor: CursorColor
}

export function getConfig(): Config {
    const cfg = vscode.workspace.getConfiguration(NS)
    return {
        panelCursorEnabled: cfg.get<boolean>('mathPreviewPanel.cursor.enabled', false),
        panelEditorGroup: cfg.get<EditorGroup>('mathPreviewPanel.editorGroup', 'below'),
        previewMaxLines: cfg.get<number>('hover.preview.maxLines', 20),
        previewScale: cfg.get<number>('hover.preview.scale', 1),
        parseTeXFileEnabled: cfg.get<boolean>('hover.preview.newcommand.parseTeXFile.enabled', true),
        macroFile: cfg.get<string>('hover.preview.newcommand.newcommandFile', ''),
        hoverCursorEnabled: cfg.get<boolean>('hover.preview.cursor.enabled', true),
        hoverCursorSymbol: cfg.get<string>('hover.preview.cursor.symbol', '\\!|\\!'),
        hoverCursorColor: cfg.get<CursorColor>('hover.preview.cursor.color', 'auto')
    }
}

export const configNamespace = NS
