import { describe, expect, it } from 'vitest'
import type { MathSnippet } from '../../text-model'
import { texToSvg } from '../../render/mathjax'

describe('texToSvg', () => {
    const snippet: MathSnippet = {
        texString: '$x+y$',
        range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 5 }
        },
        envName: '$',
        inlineDollar: true
    }

    it('creates deterministic data url for rendered svg', async () => {
        const service = {
            validateMacros: async () => undefined,
            typeset: async () => '<svg><text>x+y</text></svg>'
        }
        const result = await texToSvg(service as never, snippet, '', 1, '#000000')
        expect(result.svgDataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
    })

    it('falls back to non-macro render when macro validation fails', async () => {
        const warn = console.warn
        try {
            console.warn = () => undefined
            const calls: string[] = []
            const service = {
                validateMacros: async () => {
                    throw new Error('bad macro')
                },
                typeset: async (input: string) => {
                    calls.push(input)
                    return '<svg><text>ok</text></svg>'
                }
            }
            const result = await texToSvg(service as never, snippet, '\\newcommand{\\foo}{x}\n', 1, '#000000')
            expect(calls.length).toBe(1)
            expect(calls[0]).toBe('$x+y$')
            expect(result.svgDataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
        } finally {
            console.warn = warn
        }
    })

    it('keeps macros for recoverable snippet errors', async () => {
        const calls: string[] = []
        const service = {
            validateMacros: async () => undefined,
            typeset: async (input: string) => {
                calls.push(input)
                return '<svg><text>recoverable</text></svg>'
            }
        }
        const result = await texToSvg(service as never, { ...snippet, texString: '$\\frac$' }, '\\newcommand{\\foo}{x}\n', 1, '#000000')
        expect(calls).toEqual(['\\newcommand{\\foo}{x}\n\\frac'])
        expect(result.svgDataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
    })
})
