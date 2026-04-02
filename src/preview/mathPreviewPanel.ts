import * as vscode from 'vscode'
import { getConfig } from '../config'
import { findMathSnippet, isSupportedMathLanguage } from '../extract'
import { log, logError } from '../logging'
import { MathJaxService, texToSvg } from '../render/mathjax'
import { getThemeTextColor, renderCursor } from '../render/cursor'
import { moveWebviewPanel } from '../utils/webview'

type UpdateEvent = {
    type: 'edit'
    event: vscode.TextDocumentChangeEvent
} | {
    type: 'selection'
    event: vscode.TextEditorSelectionChangeEvent
} | {
    type: 'manual'
}

type State = {
    panel: vscode.WebviewPanel | undefined
    prevEditTime: number
    updateToken: number
}

export class MathPreviewPanelController implements vscode.Disposable {
    private readonly state: State = {
        panel: undefined, // Current preview panel instance, if one is open.
        prevEditTime: 0, // Timestamp of the last processed editor change.
        updateToken: 0 // Incrementing token used to discard stale async updates.
    }

    public readonly serializer: vscode.WebviewPanelSerializer

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly mathJax: MathJaxService
    ) {
        this.serializer = {
            deserializeWebviewPanel: async (panel) => {
                this.initializePanel(panel)
                panel.webview.options = this.webviewOptions()
                panel.webview.html = this.getHtml(panel.webview)
                log('Preview', 'Math preview panel restored from serializer.')
            }
        }
    }

    open() {
        const activeDocument = vscode.window.activeTextEditor?.document
        if (this.state.panel) {
            // Reuse the existing preview instead of creating duplicate panels.
            if (!this.state.panel.visible) {
                // Reveal without stealing focus from the editor that triggered the command.
                this.state.panel.reveal(undefined, true)
            }
            return
        }
        // Create the panel beside the active editor; later config may move it to a target group.
        const panel = vscode.window.createWebviewPanel(
            'latex-math-preview-mathpreview',
            'Math Preview',
            { viewColumn: vscode.ViewColumn.Active, preserveFocus: true },
            this.webviewOptions()
        )
        this.initializePanel(panel)
        panel.webview.html = this.getHtml(panel.webview)
        const cfg = getConfig()
        if (activeDocument) {
            // Only relocate when there is an editor-backed document to anchor the move.
            void moveWebviewPanel(panel, cfg.panelEditorGroup)
        }
        log('Preview', 'Math preview panel opened.')
    }

    close() {
        this.state.panel?.dispose()
        this.state.panel = undefined
        this.clearState()
        log('Preview', 'Math preview panel closed.')
    }

    toggle(action?: 'open' | 'close') {
        if (action === 'open') {
            this.open()
            return
        }
        if (action === 'close') {
            this.close()
            return
        }
        if (this.state.panel) {
            this.close()
            return
        }
        this.open()
    }

    dispose() {
        this.close()
    }

    private webviewOptions(): vscode.WebviewOptions & vscode.WebviewPanelOptions {
        return {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
        }
    }

    /** Connects a new preview panel to VS Code events, webview events, and cleanup hooks. */
    private initializePanel(panel: vscode.WebviewPanel) {
        const disposables = vscode.Disposable.from(
            vscode.workspace.onDidChangeTextDocument((event) => {
                void this.update({ type: 'edit', event })
            }),
            vscode.window.onDidChangeTextEditorSelection((event) => {
                void this.update({ type: 'selection', event })
            })
        )
        this.state.panel = panel

        panel.onDidDispose(() => {
            disposables.dispose()
            this.clearState()
            this.state.panel = undefined
            log('Preview', 'Math preview panel disposed.')
        })

        panel.onDidChangeViewState((event) => {
            if (event.webviewPanel.visible) {
                void this.update({ type: 'manual' })
            }
        })

        panel.webview.onDidReceiveMessage((msg) => {
            if (msg?.type === 'initialized') {
                void this.update({ type: 'manual' })
            }
        })
    }

    private clearState() {
        this.state.prevEditTime = 0
    }

    refresh() {
        void this.update({ type: 'manual' })
    }

    /**
     * Builds the initial webview HTML shell for the math preview panel.
     * Includes CSP and script wiring; the rendered math image is populated later
     * when mathpreview.js receives mathImage messages and updates the #math element.
     */
    private getHtml(webview: vscode.Webview): string {
        // mathpreview.js listens for mathImage messages and sets the HTML element with id="math".
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'mathpreview.js'))
        const csp = [
            `default-src 'none'`,
            `base-uri 'none'`,
            `script-src ${webview.cspSource}`,
            `img-src data:`,
            `style-src 'unsafe-inline'`
        ].join('; ')
        // This HTML is only the static shell; rendered LaTeX is injected after initialization.
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <style>
    body { padding: 0; margin: 0; overflow: auto; }
    #math { padding-top: 35px; padding-left: 50px; max-width: calc(100vw - 60px); }
  </style>
  <script src="${scriptUri}" defer></script>
</head>
<body>
  <div id="mathBlock"><img src="" id="math" /></div>
</body>
</html>`
    }

    async update(ev: UpdateEvent) {
        const panel = this.state.panel
        // Hidden or disposed panels do not need refresh work, and skipping here avoids
        // spending time on MathJax renders the user cannot see.
        if (!panel || !panel.visible) {
            return
        }
        const cfg = getConfig()
        if (!cfg.panelCursorEnabled) {
            if (ev.type === 'edit') {
                this.state.prevEditTime = Date.now()
            } else if (ev.type === 'selection' && Date.now() - this.state.prevEditTime < 100) {
                // Ignore the selection event that VS Code usually emits immediately after an edit.
                return
            }
        }

        const editor = vscode.window.activeTextEditor
        const document = editor?.document
        // The preview always follows the active editor. When focus leaves an editor-backed
        // document, clear cached state so the next real update starts fresh.
        if (!editor || !document) {
            this.clearState()
            return
        }
        // Only TeX/Markdown-style sources participate in math extraction.
        if (!isSupportedMathLanguage(document.languageId)) {
            this.clearState()
            return
        }

        const documentUri = document.uri.toString()
        // Ignore edits from background documents; selection/manual updates will refresh when
        // the user comes back to the active editor.
        if (ev.type === 'edit' && documentUri !== ev.event.document.uri.toString()) {
            return
        }

        // Extraction is done against the full document text so the finder can honor
        // surrounding delimiters and line-based limits.
        const snippet = findMathSnippet(
            document.getText(),
            { line: editor.selection.active.line, character: editor.selection.active.character },
            cfg.panelMaxLines
        )
        if (!snippet) {
            // No math at the cursor means the webview should be blank instead of leaving a
            // stale render visible from a previous location.
            this.clearState()
            await panel.webview.postMessage({ type: 'mathImage', src: '' })
            return
        }

        this.state.updateToken += 1
        const token = this.state.updateToken

        try {
            const renderTarget = cfg.panelCursorEnabled
                // Cursor rendering mutates the TeX source before MathJax so the preview can
                // reflect the insertion point directly in the rendered output.
                ? { ...snippet, texString: renderCursor(document, snippet, { enabled: true, symbol: cfg.panelCursorSymbol, color: cfg.panelCursorColor }) }
                : snippet
            const result = await texToSvg(this.mathJax, renderTarget, cfg.mathJaxMacros, cfg.panelScale, getThemeTextColor())
            if (token !== this.state.updateToken) {
                // Drop slower renders once a newer update has started.
                return
            }
            await panel.webview.postMessage({ type: 'mathImage', src: result.svgDataUrl })
        } catch (err) {
            // Rendering failures should clear the panel rather than leave the last good image
            // onscreen, which would misrepresent the current cursor location or TeX source.
            logError('Preview', 'Failed updating math preview.', err)
            await panel.webview.postMessage({ type: 'mathImage', src: '' })
        }
    }
}
