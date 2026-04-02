import * as path from 'node:path'
import * as vscode from 'vscode'
import { disposeLogs, log, logError } from './logging'
import { getConfig } from './config'
import { MathPreviewPanelController } from './preview/mathPreviewPanel'
import { MathJaxService } from './render/mathjax'

let controller: MathPreviewPanelController | undefined
let mathJax: MathJaxService | undefined

export async function activate(context: vscode.ExtensionContext) {
    log('Extension', 'Activating LaTeX Math Preview extension.')
    const extensionRoot = path.resolve(context.extensionPath)
    const cfg = getConfig()
    mathJax = new MathJaxService(extensionRoot)
    await mathJax.initialize(cfg.mathJaxPackages)
    controller = new MathPreviewPanelController(context, mathJax)

    context.subscriptions.push(
        vscode.commands.registerCommand('latex-math-preview.openMathPreviewPanel', () => controller?.toggle('open')),
        vscode.commands.registerCommand('latex-math-preview.closeMathPreviewPanel', () => controller?.toggle('close')),
        vscode.commands.registerCommand('latex-math-preview.toggleMathPreviewPanel', () => controller?.toggle()),
        vscode.window.registerWebviewPanelSerializer('latex-math-preview-mathpreview', controller.serializer),
        vscode.workspace.onDidChangeConfiguration((event) => {
            void handleConfigurationChange(event)
        }),
        controller
    )
    log('Extension', 'LaTeX Math Preview activated.')
}

export async function deactivate() {
    controller?.dispose()
    controller = undefined
    await mathJax?.dispose()
    mathJax = undefined
    disposeLogs()
}

async function handleConfigurationChange(event: vscode.ConfigurationChangeEvent) {
    if (!event.affectsConfiguration('latex-math-preview.mathJax.packages')
        && !event.affectsConfiguration('latex-math-preview.mathJax.macros')) {
        return
    }

    try {
        const cfg = getConfig()
        if (event.affectsConfiguration('latex-math-preview.mathJax.packages')) {
            await mathJax?.initialize(cfg.mathJaxPackages)
        }
        controller?.refresh()
    } catch (err) {
        logError('Extension', 'Failed applying MathJax configuration update.', err)
    }
}
