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
    panelCursorSymbol: string
    panelCursorColor: CursorColor
    panelEditorGroup: EditorGroup
    panelMaxLines: number
    panelScale: number
    parseTeXFilesEnabled: boolean
    macroFile: string
}

export function getConfig(): Config {
    const cfg = vscode.workspace.getConfiguration(NS)
    return {
        panelCursorEnabled: cfg.get<boolean>('mathPreviewPanel.cursor.enabled', false),
        panelCursorSymbol: cfg.get<string>('mathPreviewPanel.cursor.symbol', '\\!|\\!'),
        panelCursorColor: cfg.get<CursorColor>('mathPreviewPanel.cursor.color', 'auto'),
        panelEditorGroup: cfg.get<EditorGroup>('mathPreviewPanel.editorGroup', 'below'),
        panelMaxLines: cfg.get<number>('mathPreviewPanel.maxLines', 20),
        panelScale: cfg.get<number>('mathPreviewPanel.scale', 1),
        parseTeXFilesEnabled: cfg.get<boolean>('macros.parseTeXFiles.enabled', true),
        macroFile: cfg.get<string>('macros.file', '')
    }
}

export const configNamespace = NS
