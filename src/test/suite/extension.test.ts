import * as assert from 'node:assert'
import * as vscode from 'vscode'

describe('Extension Integration', () => {
    it('command lifecycle open/toggle/close works', async () => {
        await vscode.commands.executeCommand('latex-math-preview.openMathPreviewPanel')
        await vscode.commands.executeCommand('latex-math-preview.toggleMathPreviewPanel')
        await vscode.commands.executeCommand('latex-math-preview.toggleMathPreviewPanel')
        await vscode.commands.executeCommand('latex-math-preview.closeMathPreviewPanel')
        assert.ok(true)
    })

    it('updates can run for tex and markdown fixtures without throwing', async () => {
        const texDoc = await vscode.workspace.openTextDocument({
            language: 'latex',
            content: '$a+b$'
        })
        const texEditor = await vscode.window.showTextDocument(texDoc)
        await vscode.commands.executeCommand('latex-math-preview.openMathPreviewPanel')
        texEditor.selection = new vscode.Selection(0, 1, 0, 4)
        await vscode.commands.executeCommand('type', { text: ' ' })
        await vscode.commands.executeCommand('undo')

        const mdDoc = await vscode.workspace.openTextDocument({
            language: 'markdown',
            content: 'Inline math $a+b$ here.'
        })
        const mdEditor = await vscode.window.showTextDocument(mdDoc)
        mdEditor.selection = new vscode.Selection(0, 13, 0, 16)
        await vscode.commands.executeCommand('type', { text: ' ' })
        await vscode.commands.executeCommand('undo')
        await vscode.commands.executeCommand('latex-math-preview.closeMathPreviewPanel')
        assert.ok(true)
    })
})
