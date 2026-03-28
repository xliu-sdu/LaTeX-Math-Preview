import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as vscode from 'vscode'
import { isTexLanguage } from '../extract'
import { log, logError } from '../logging'

export async function collectMacros(
    activeDocument: vscode.TextDocument | undefined,
    parseTeXFiles: boolean,
    macroFileConfig: string
): Promise<string> {
    const candidates = new Set<string>()
    const resolvedMacroFile = resolveMacroFile(macroFileConfig, activeDocument)
    if (resolvedMacroFile) {
        candidates.add(resolvedMacroFile)
    }
    if (parseTeXFiles) {
        if (activeDocument && isTexLanguage(activeDocument.languageId) && activeDocument.uri.scheme === 'file') {
            candidates.add(activeDocument.uri.fsPath)
        }
        const files = await vscode.workspace.findFiles('**/*.tex', '**/{.git,node_modules,out}/**', 200)
        files.forEach((uri) => {
            if (uri.scheme === 'file') {
                candidates.add(uri.fsPath)
            }
        })
    }

    const macros: string[] = []
    for (const filePath of candidates) {
        try {
            const content = await fs.readFile(filePath, 'utf8')
            macros.push(...extractMacroDefinitions(content))
        } catch (err) {
            logError('Macro', `Failed reading macro source ${filePath}`, err)
        }
    }

    const result = Array.from(new Set(macros)).join('\n')
    log('Macro', `Collected ${macros.length.toString()} macro definitions from ${candidates.size.toString()} files.`)
    return result ? `${result}\n` : ''
}

function resolveMacroFile(macroFileConfig: string, activeDocument: vscode.TextDocument | undefined): string | undefined {
    if (!macroFileConfig.trim()) {
        return undefined
    }
    if (path.isAbsolute(macroFileConfig)) {
        return macroFileConfig
    }
    const root = workspaceRootForDocument(activeDocument) ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    if (!root) {
        return undefined
    }
    return path.join(root, macroFileConfig)
}

function workspaceRootForDocument(document: vscode.TextDocument | undefined): string | undefined {
    if (!document) {
        return undefined
    }
    const folder = vscode.workspace.getWorkspaceFolder(document.uri)
    return folder?.uri.fsPath
}

function extractMacroDefinitions(content: string): string[] {
    const definitions: string[] = []
    const commandRegex = /\\(?:newcommand|renewcommand|newrobustcmd|renewrobustcmd|providecommand|DeclareMathOperator|DeclareRobustCommand|DeclarePairedDelimiterXPP|DeclarePairedDelimiterX|DeclarePairedDelimiter)\*?/g
    let m: RegExpExecArray | null
    while ((m = commandRegex.exec(content)) !== null) {
        const start = m.index
        const def = sliceCommand(content, start).trim()
        if (def.length === 0) {
            continue
        }
        definitions.push(normalizeMacroDef(def))
    }
    return definitions
}

function sliceCommand(content: string, start: number): string {
    let idx = start
    let seenBrace = false
    let balance = 0
    let closedOnce = false
    while (idx < content.length && idx - start < 4000) {
        const char = content[idx]
        if (char === '{' && content[idx - 1] !== '\\') {
            seenBrace = true
            balance += 1
        } else if (char === '}' && content[idx - 1] !== '\\' && balance > 0) {
            balance -= 1
            if (seenBrace && balance === 0) {
                closedOnce = true
            }
        }
        if (closedOnce && (char === '\n' || char === '\r')) {
            break
        }
        idx += 1
    }
    return content.slice(start, idx)
}

function normalizeMacroDef(def: string): string {
    return def
        .replace(/^\\DeclareRobustCommand([^a-zA-Z])/g, '\\newcommand$1')
        .replace(/^\\providecommand([^a-zA-Z])/g, '\\newcommand$1')
        .replace(/^\\([a-zA-Z]+)\*/g, '\\$1')
}

