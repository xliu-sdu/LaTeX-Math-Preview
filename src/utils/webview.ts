import * as vscode from 'vscode'
import type { EditorGroup } from '../config'

function getMoveCommands(group: EditorGroup) {
    if (group === 'left') {
        return {
            move: 'workbench.action.moveEditorToLeftGroup',
            focus: 'workbench.action.focusRightGroup'
        }
    }
    if (group === 'right') {
        return {
            move: 'workbench.action.moveEditorToRightGroup',
            focus: 'workbench.action.focusLeftGroup'
        }
    }
    if (group === 'above') {
        return {
            move: 'workbench.action.moveEditorToAboveGroup',
            focus: 'workbench.action.focusBelowGroup'
        }
    }
    if (group === 'below') {
        return {
            move: 'workbench.action.moveEditorToBelowGroup',
            focus: 'workbench.action.focusAboveGroup'
        }
    }
    return undefined
}

export async function moveWebviewPanel(panel: vscode.WebviewPanel, group: EditorGroup) {
    const actions = getMoveCommands(group)
    if (!actions) {
        return
    }
    panel.reveal(undefined, false)
    await vscode.commands.executeCommand(actions.move)
    await vscode.commands.executeCommand(actions.focus)
}

