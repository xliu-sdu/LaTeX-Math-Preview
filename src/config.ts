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
    panelSelectionStartSymbol: string
    panelSelectionEndSymbol: string
    panelEditorGroup: EditorGroup
    panelMaxLines: number
    panelScale: number
    mathJaxPackages: string[]
    mathJaxMacros: string
}

export function getConfig(): Config {
    const cfg = vscode.workspace.getConfiguration(NS)
    return {
        panelCursorEnabled: cfg.get<boolean>('mathPreviewPanel.cursor.enabled', false),
        panelCursorSymbol: cfg.get<string>('mathPreviewPanel.cursor.symbol', '\\!|\\!'),
        panelCursorColor: cfg.get<CursorColor>('mathPreviewPanel.cursor.color', 'auto'),
        panelSelectionStartSymbol: cfg.get<string>('mathPreviewPanel.selection.startSymbol', '\\{'),
        panelSelectionEndSymbol: cfg.get<string>('mathPreviewPanel.selection.endSymbol', '\\}'),
        panelEditorGroup: cfg.get<EditorGroup>('mathPreviewPanel.editorGroup', 'below'),
        panelMaxLines: cfg.get<number>('mathPreviewPanel.maxLines', 20),
        panelScale: cfg.get<number>('mathPreviewPanel.scale', 1),
        mathJaxPackages: cfg.get<string[]>('mathJax.packages', []),
        mathJaxMacros: cfg.get<string>('mathJax.macros', '')
    }
}

export const configNamespace = NS
