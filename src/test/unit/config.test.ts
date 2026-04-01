import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, getConfiguration } = vi.hoisted(() => {
    const get = vi.fn()
    const getConfiguration = vi.fn(() => ({ get }))
    return { get, getConfiguration }
})

vi.mock('vscode', () => ({
    workspace: { getConfiguration }
}))

import { getConfig } from '../../config'

describe('getConfig', () => {
    beforeEach(() => {
        get.mockReset()
        getConfiguration.mockClear()
    })

    it('reads the panel-first setting keys', () => {
        const values = new Map<string, unknown>([
            ['mathPreviewPanel.cursor.enabled', true],
            ['mathPreviewPanel.cursor.symbol', '\\cursor'],
            ['mathPreviewPanel.cursor.color', 'red'],
            ['mathPreviewPanel.editorGroup', 'right'],
            ['mathPreviewPanel.maxLines', 12],
            ['mathPreviewPanel.scale', 1.25],
            ['macros.parseTeXFiles.enabled', false],
            ['macros.file', 'macros.tex']
        ])
        get.mockImplementation((key: string, fallback: unknown) => values.has(key) ? values.get(key) : fallback)

        expect(getConfig()).toEqual({
            panelCursorEnabled: true,
            panelCursorSymbol: '\\cursor',
            panelCursorColor: 'red',
            panelEditorGroup: 'right',
            panelMaxLines: 12,
            panelScale: 1.25,
            parseTeXFilesEnabled: false,
            macroFile: 'macros.tex'
        })
        expect(getConfiguration).toHaveBeenCalledWith('latex-math-preview')
        expect(get.mock.calls.map(([key]) => key)).toEqual([
            'mathPreviewPanel.cursor.enabled',
            'mathPreviewPanel.cursor.symbol',
            'mathPreviewPanel.cursor.color',
            'mathPreviewPanel.editorGroup',
            'mathPreviewPanel.maxLines',
            'mathPreviewPanel.scale',
            'macros.parseTeXFiles.enabled',
            'macros.file'
        ])
    })
})
