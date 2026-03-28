import * as vscode from 'vscode'

const channels = new Map<string, vscode.OutputChannel>()

export function log(scope: string, message: string) {
    const channel = getChannel(scope)
    channel.appendLine(`[${new Date().toISOString()}] ${message}`)
}

export function logError(scope: string, message: string, err: unknown) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err)
    log(scope, `${message} :: ${detail}`)
}

function getChannel(scope: string): vscode.OutputChannel {
    if (!channels.has(scope)) {
        channels.set(scope, vscode.window.createOutputChannel(`LaTeX Math Preview: ${scope}`))
    }
    return channels.get(scope)!
}

export function disposeLogs() {
    channels.forEach((channel) => channel.dispose())
    channels.clear()
}
