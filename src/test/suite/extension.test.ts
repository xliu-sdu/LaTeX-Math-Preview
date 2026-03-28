import * as assert from 'node:assert'
import * as path from 'node:path'
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
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
        assert.ok(workspace)
        const texDoc = await vscode.workspace.openTextDocument(path.join(workspace!, 'test.tex'))
        await vscode.window.showTextDocument(texDoc)
        await vscode.commands.executeCommand('latex-math-preview.openMathPreviewPanel')
        await vscode.commands.executeCommand('type', { text: ' ' })
        await vscode.commands.executeCommand('undo')

        const mdDoc = await vscode.workspace.openTextDocument(path.join(workspace!, 'test.md'))
        await vscode.window.showTextDocument(mdDoc)
        await vscode.commands.executeCommand('type', { text: ' ' })
        await vscode.commands.executeCommand('undo')
        await vscode.commands.executeCommand('latex-math-preview.closeMathPreviewPanel')
        assert.ok(true)
    })
})
