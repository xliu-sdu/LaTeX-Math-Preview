import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
    controllerInstance,
    mathJaxInstance,
    registerCommand,
    registerWebviewPanelSerializer,
    onDidChangeConfiguration,
    getConfig,
    configHandlers
} = vi.hoisted(() => {
    const controllerInstance = {
        serializer: { deserializeWebviewPanel: vi.fn() },
        toggle: vi.fn(),
        refresh: vi.fn(),
        dispose: vi.fn()
    }
    const mathJaxInstance = {
        initialize: vi.fn(async () => undefined),
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
    return {
        controllerInstance,
        mathJaxInstance,
        registerCommand,
        registerWebviewPanelSerializer,
        onDidChangeConfiguration,
        getConfig,
        configHandlers
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
    MathPreviewPanelController: vi.fn(() => controllerInstance)
}))

vi.mock('../../render/mathjax', () => ({
    MathJaxService: vi.fn(() => mathJaxInstance)
}))

vi.mock('../../logging', () => ({
    log: vi.fn(),
    logError: vi.fn(),
    disposeLogs: vi.fn()
}))

describe('extension activation', () => {
    beforeEach(() => {
        vi.resetModules()
        controllerInstance.toggle.mockReset()
        controllerInstance.refresh.mockReset()
        controllerInstance.dispose.mockReset()
        mathJaxInstance.initialize.mockClear()
        mathJaxInstance.dispose.mockClear()
        registerCommand.mockClear()
        registerWebviewPanelSerializer.mockClear()
        onDidChangeConfiguration.mockClear()
        getConfig.mockClear()
        configHandlers.length = 0
    })

    it('initializes MathJax with configured packages on activation', async () => {
        const { activate } = await import('../../extension')
        const context = { extensionPath: '/tmp/latex-math-preview', subscriptions: [] as { dispose: () => void }[] }

        await activate(context as never)

        expect(mathJaxInstance.initialize).toHaveBeenCalledWith(['physics'])
        expect(context.subscriptions).toHaveLength(6)
    })

    it('reloads packages and refreshes preview when MathJax package settings change', async () => {
        const { activate } = await import('../../extension')
        await activate({ extensionPath: '/tmp/latex-math-preview', subscriptions: [] } as never)

        getConfig.mockReturnValueOnce({
            mathJaxPackages: ['physics', 'unicode'],
            mathJaxMacros: '\\newcommand{\\bar}{y}'
        })
        configHandlers[0]?.({
            affectsConfiguration: (section: string) => section === 'latex-math-preview.mathJax.packages'
        })
        await Promise.resolve()
        await Promise.resolve()

        expect(mathJaxInstance.initialize).toHaveBeenCalledWith(['physics', 'unicode'])
        expect(controllerInstance.refresh).toHaveBeenCalledTimes(1)
    })

    it('refreshes preview without reinitializing packages when macro settings change', async () => {
        const { activate } = await import('../../extension')
        await activate({ extensionPath: '/tmp/latex-math-preview', subscriptions: [] } as never)

        getConfig.mockReturnValueOnce({
            mathJaxPackages: ['physics'],
            mathJaxMacros: '\\newcommand{\\baz}{z}'
        })
        configHandlers[0]?.({
            affectsConfiguration: (section: string) => section === 'latex-math-preview.mathJax.macros'
        })
        await Promise.resolve()
        await Promise.resolve()

        expect(mathJaxInstance.initialize).toHaveBeenCalledTimes(1)
        expect(controllerInstance.refresh).toHaveBeenCalledTimes(1)
    })
})
