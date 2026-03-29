import * as path from 'node:path'
import * as vscode from 'vscode'
import { disposeLogs, log } from './logging'
import { MathPreviewPanelController } from './preview/mathPreviewPanel'
import { MathJaxService } from './render/mathjax'

let controller: MathPreviewPanelController | undefined
let mathJax: MathJaxService | undefined

export async function activate(context: vscode.ExtensionContext) {
    log('Extension', 'Activating LaTeX Math Preview extension.')
    const extensionRoot = path.resolve(context.extensionPath)
    mathJax = new MathJaxService(extensionRoot)
    await mathJax.initialize()
    controller = new MathPreviewPanelController(context, mathJax)

    context.subscriptions.push(
        vscode.commands.registerCommand('latex-math-preview.openMathPreviewPanel', () => controller?.toggle('open')),
        vscode.commands.registerCommand('latex-math-preview.closeMathPreviewPanel', () => controller?.toggle('close')),
        vscode.commands.registerCommand('latex-math-preview.toggleMathPreviewPanel', () => controller?.toggle()),
        vscode.window.registerWebviewPanelSerializer('latex-math-preview-mathpreview', controller.serializer),
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
