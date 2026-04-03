import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Point } from '../../text-model'

const {
    activeTextEditor,
    onDidChangeTextDocument,
    onDidChangeTextEditorSelection,
    panelPostMessage,
    getConfig,
    findMathSnippet,
    texToSvg,
    renderCursor
} = vi.hoisted(() => {
    const activeTextEditor = { current: undefined as {
        document: {
            languageId: string
            uri: { toString: () => string }
            getText: () => string
            lineAt: (line: number) => { text: string }
        }
        selection: {
            isEmpty: boolean
            anchor: Point
            active: Point
        }
    } | undefined }
    const onDidChangeTextDocument = vi.fn(() => ({ dispose: vi.fn() }))
    const onDidChangeTextEditorSelection = vi.fn(() => ({ dispose: vi.fn() }))
    const panelPostMessage = vi.fn(async () => undefined)
    const getConfig = vi.fn(() => ({
        panelCursorEnabled: true,
        panelCursorSymbol: '|',
        panelCursorColor: 'auto',
        panelSelectionStartSymbol: '\\{',
        panelSelectionEndSymbol: '\\}',
        panelEditorGroup: 'below',
        panelMaxLines: 20,
        panelScale: 1,
        mathJaxPackages: [],
        mathJaxMacros: ''
    }))
    const findMathSnippet = vi.fn()
    const texToSvg = vi.fn(async () => ({ svgDataUrl: 'data:image/svg+xml,preview' }))
    const renderCursor = vi.fn(() => '$rendered$')
    return {
        activeTextEditor,
        onDidChangeTextDocument,
        onDidChangeTextEditorSelection,
        panelPostMessage,
        getConfig,
        findMathSnippet,
        texToSvg,
        renderCursor
    }
})

vi.mock('vscode', () => ({
    window: {
        get activeTextEditor() {
            return activeTextEditor.current
        }
    },
    workspace: {
        onDidChangeTextDocument,
        getConfiguration: vi.fn()
    },
    Disposable: {
        from: (...items: Array<{ dispose: () => void }>) => ({
            dispose: () => items.forEach((item) => item.dispose())
        })
    }
}))

vi.mock('../../config', () => ({
    getConfig
}))

vi.mock('../../extract', () => ({
    findMathSnippet,
    isSupportedMathLanguage: vi.fn(() => true)
}))

vi.mock('../../logging', () => ({
    log: vi.fn(),
    logError: vi.fn()
}))

vi.mock('../../render/mathjax', () => ({
    texToSvg
}))

vi.mock('../../render/cursor', () => ({
    getThemeTextColor: vi.fn(() => '#000000'),
    renderCursor
}))

vi.mock('../../utils/webview', () => ({
    moveWebviewPanel: vi.fn()
}))

import { MathPreviewPanelController } from '../../preview/mathPreviewPanel'

describe('MathPreviewPanelController.update', () => {
    beforeEach(() => {
        activeTextEditor.current = undefined
        panelPostMessage.mockReset()
        getConfig.mockClear()
        findMathSnippet.mockReset()
        texToSvg.mockClear()
        renderCursor.mockClear()
        onDidChangeTextDocument.mockClear()
        onDidChangeTextEditorSelection.mockClear()
    })

    it('resolves non-empty selections from the anchor position', async () => {
        activeTextEditor.current = createEditor(['$a+b$'], {
            isEmpty: false,
            anchor: { line: 0, character: 1 },
            active: { line: 0, character: 4 }
        })
        findMathSnippet.mockReturnValueOnce(inlineSnippet('$a+b$'))

        const controller = new MathPreviewPanelController({ extensionUri: {} } as never, {} as never, '')
        ;(controller as any).state.panel = createPanel()

        await (controller as any).update({ type: 'manual' })

        expect(findMathSnippet).toHaveBeenCalledWith('$a+b$', { line: 0, character: 1 }, 20)
        expect(renderCursor).toHaveBeenCalledTimes(1)
        expect(texToSvg).toHaveBeenCalledWith(
            {} as never,
            expect.objectContaining({ texString: '$rendered$' }),
            '',
            1,
            '#000000'
        )
    })

    it('clears the preview when the anchor is outside any math snippet', async () => {
        activeTextEditor.current = createEditor(['outside $a+b$'], {
            isEmpty: false,
            anchor: { line: 0, character: 0 },
            active: { line: 0, character: 11 }
        })
        findMathSnippet.mockReturnValueOnce(undefined)

        const controller = new MathPreviewPanelController({ extensionUri: {} } as never, {} as never, '')
        ;(controller as any).state.panel = createPanel()

        await (controller as any).update({ type: 'manual' })

        expect(findMathSnippet).toHaveBeenCalledWith('outside $a+b$', { line: 0, character: 0 }, 20)
        expect(renderCursor).not.toHaveBeenCalled()
        expect(panelPostMessage).toHaveBeenCalledWith({ type: 'mathImage', src: '' })
    })
})

function createEditor(
    lines: string[],
    selection: {
        isEmpty: boolean
        anchor: Point
        active: Point
    }
) {
    const text = lines.join('\n')
    return {
        document: {
            languageId: 'latex',
            uri: { toString: () => 'file:///test.tex' },
            getText: () => text,
            lineAt: (line: number) => ({ text: lines[line] ?? '' })
        },
        selection
    }
}

function createPanel() {
    return {
        visible: true,
        webview: {
            postMessage: panelPostMessage
        }
    }
}

function inlineSnippet(texString: string) {
    return {
        texString,
        range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: texString.length }
        },
        envName: '$'
    }
}
