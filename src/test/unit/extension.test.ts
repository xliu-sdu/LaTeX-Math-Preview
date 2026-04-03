import { beforeEach, describe, expect, it, vi } from 'vitest'

async function flushAsyncWork() {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
}

const {
    MathPreviewPanelController,
    controllerInstance,
    mathJaxInstance,
    registerCommand,
    registerWebviewPanelSerializer,
    onDidChangeConfiguration,
    getConfig,
    configHandlers,
    logError
} = vi.hoisted(() => {
    const MathPreviewPanelController = vi.fn()
    const controllerInstance = {
        serializer: { deserializeWebviewPanel: vi.fn() },
        toggle: vi.fn(),
        setMathJaxMacros: vi.fn(),
        refresh: vi.fn(),
        dispose: vi.fn()
    }
    const mathJaxInstance = {
        initialize: vi.fn(async () => undefined),
        validateMacros: vi.fn(async () => undefined),
        dispose: vi.fn(async () => undefined)
    }
    const registerCommand = vi.fn(() => ({ dispose: vi.fn() }))
    const registerWebviewPanelSerializer = vi.fn(() => ({ dispose: vi.fn() }))
    const configHandlers: Array<(event: { affectsConfiguration: (section: string) => boolean }) => void> = []
    const onDidChangeConfiguration = vi.fn((handler) => {
        configHandlers.push(handler)
        return { dispose: vi.fn() }
    })
    const getConfig = vi.fn(() => ({
        mathJaxPackages: ['physics'],
        mathJaxMacros: '\\newcommand{\\foo}{x}'
    }))
    const logError = vi.fn()
    MathPreviewPanelController.mockImplementation(() => controllerInstance)
    return {
        MathPreviewPanelController,
        controllerInstance,
        mathJaxInstance,
        registerCommand,
        registerWebviewPanelSerializer,
        onDidChangeConfiguration,
        getConfig,
        configHandlers,
        logError
    }
})

vi.mock('vscode', () => ({
    commands: { registerCommand },
    window: { registerWebviewPanelSerializer },
    workspace: { onDidChangeConfiguration }
}))

vi.mock('../../config', () => ({
    getConfig
}))

vi.mock('../../preview/mathPreviewPanel', () => ({
    MathPreviewPanelController
}))

vi.mock('../../render/mathjax', () => ({
    MathJaxService: vi.fn(() => mathJaxInstance)
}))

vi.mock('../../logging', () => ({
    log: vi.fn(),
    logError,
    disposeLogs: vi.fn()
}))

describe('extension activation', () => {
    beforeEach(() => {
        vi.resetModules()
        MathPreviewPanelController.mockClear()
        controllerInstance.toggle.mockReset()
        controllerInstance.setMathJaxMacros.mockReset()
        controllerInstance.refresh.mockReset()
        controllerInstance.dispose.mockReset()
        mathJaxInstance.initialize.mockClear()
        mathJaxInstance.validateMacros.mockClear()
        mathJaxInstance.dispose.mockClear()
        registerCommand.mockClear()
        registerWebviewPanelSerializer.mockClear()
        onDidChangeConfiguration.mockClear()
        getConfig.mockClear()
        logError.mockReset()
        configHandlers.length = 0
    })

    it('initializes MathJax and validates configured macros on activation', async () => {
        const { activate } = await import('../../extension')
        const context = { extensionPath: '/tmp/latex-math-preview', subscriptions: [] as { dispose: () => void }[] }

        await activate(context as never)

        expect(mathJaxInstance.initialize).toHaveBeenCalledWith(['physics'])
        expect(mathJaxInstance.validateMacros).toHaveBeenCalledWith('\\newcommand{\\foo}{x}')
        expect(MathPreviewPanelController).toHaveBeenCalledWith(context, mathJaxInstance, '\\newcommand{\\foo}{x}')
        expect(context.subscriptions).toHaveLength(6)
    })

    it('reloads packages, revalidates macros, and refreshes preview when package settings change', async () => {
        const { activate } = await import('../../extension')
        await activate({ extensionPath: '/tmp/latex-math-preview', subscriptions: [] } as never)

        getConfig.mockReturnValueOnce({
            mathJaxPackages: ['physics', 'unicode'],
            mathJaxMacros: '\\newcommand{\\bar}{y}'
        })
        configHandlers[0]?.({
            affectsConfiguration: (section: string) => section === 'latex-math-preview.mathJax.packages'
        })
        await flushAsyncWork()

        expect(mathJaxInstance.initialize).toHaveBeenCalledWith(['physics', 'unicode'])
        expect(mathJaxInstance.validateMacros).toHaveBeenLastCalledWith('\\newcommand{\\bar}{y}')
        expect(controllerInstance.setMathJaxMacros).toHaveBeenCalledWith('\\newcommand{\\bar}{y}')
        expect(controllerInstance.refresh).toHaveBeenCalledTimes(1)
    })

    it('revalidates macros without reinitializing packages when macro settings change', async () => {
        const { activate } = await import('../../extension')
        await activate({ extensionPath: '/tmp/latex-math-preview', subscriptions: [] } as never)

        getConfig.mockReturnValueOnce({
            mathJaxPackages: ['physics'],
            mathJaxMacros: '\\newcommand{\\baz}{z}'
        })
        configHandlers[0]?.({
            affectsConfiguration: (section: string) => section === 'latex-math-preview.mathJax.macros'
        })
        await flushAsyncWork()

        expect(mathJaxInstance.initialize).toHaveBeenCalledTimes(1)
        expect(mathJaxInstance.validateMacros).toHaveBeenLastCalledWith('\\newcommand{\\baz}{z}')
        expect(controllerInstance.setMathJaxMacros).toHaveBeenCalledWith('\\newcommand{\\baz}{z}')
        expect(controllerInstance.refresh).toHaveBeenCalledTimes(1)
    })

    it('disables macros on activation when validation fails', async () => {
        const { activate } = await import('../../extension')
        const error = new Error('bad macro')
        mathJaxInstance.validateMacros.mockRejectedValueOnce(error)
        const context = { extensionPath: '/tmp/latex-math-preview', subscriptions: [] as { dispose: () => void }[] }

        await activate(context as never)

        expect(MathPreviewPanelController).toHaveBeenCalledWith(context, mathJaxInstance, '')
        expect(logError).toHaveBeenCalledWith(
            'Extension',
            'Configured MathJax macros are invalid; disabling macros until settings change.',
            error
        )
    })

    it('disables macros and still refreshes when macro settings become invalid', async () => {
        const { activate } = await import('../../extension')
        await activate({ extensionPath: '/tmp/latex-math-preview', subscriptions: [] } as never)

        const error = new Error('bad macro')
        getConfig.mockReturnValueOnce({
            mathJaxPackages: ['physics'],
            mathJaxMacros: '\\newcommand{\\baz}{'
        })
        mathJaxInstance.validateMacros.mockRejectedValueOnce(error)
        configHandlers[0]?.({
            affectsConfiguration: (section: string) => section === 'latex-math-preview.mathJax.macros'
        })
        await flushAsyncWork()

        expect(controllerInstance.setMathJaxMacros).toHaveBeenCalledWith('')
        expect(controllerInstance.refresh).toHaveBeenCalledTimes(1)
        expect(logError).toHaveBeenCalledWith(
            'Extension',
            'Configured MathJax macros are invalid; disabling macros until settings change.',
            error
        )
    })
})
