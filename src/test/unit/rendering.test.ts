import { describe, expect, it } from 'vitest'
import type { MathSnippet } from '../../text-model'
import { addSvgViewBoxMargin, stripMathDelimiters } from '../../render/preprocess'
import { texToSvg } from '../../render/mathjax'

describe('texToSvg', () => {
    const snippet: MathSnippet = {
        texString: '$x+y$',
        range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 5 }
        },
        envName: '$'
    }

    it('creates deterministic data url for rendered svg', async () => {
        const service = {
            typeset: async () => '<svg><text>x+y</text></svg>'
        }
        const result = await texToSvg(service as never, snippet, '', 1, '#000000')
        expect(result.svgDataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
    })

    it('prefixes validated macros once before typesetting', async () => {
        const calls: string[] = []
        const service = {
            typeset: async (input: string) => {
                calls.push(input)
                return '<svg><text>recoverable</text></svg>'
            }
        }
        const result = await texToSvg(service as never, { ...snippet, texString: '$\\frac$' }, '\\newcommand{\\foo}{x}\n', 1, '#000000')
        expect(calls).toEqual(['\\newcommand{\\foo}{x}\n\\frac'])
        expect(result.svgDataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
    })

    it('renders stripped TeX directly when configured macros are empty', async () => {
        const calls: string[] = []
        const service = {
            typeset: async (input: string) => {
                calls.push(input)
                return '<svg><text>plain</text></svg>'
            }
        }
        const result = await texToSvg(service as never, snippet, '', 1, '#000000')
        expect(calls).toEqual(['x+y'])
        expect(result.svgDataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
    })

    it('pads MathJax SVG viewBox on every render', async () => {
        const service = {
            typeset: async () => '<svg width="5ex" height="2ex" viewBox="0 -10 500 200"><text>x+y</text></svg>'
        }
        const result = await texToSvg(service as never, snippet, '', 1, '#000000')
        const encoded = result.svgDataUrl.replace('data:image/svg+xml;base64,', '')
        const decoded = Buffer.from(encoded, 'base64').toString('utf8')

        expect(decoded).toContain('width="6ex"')
        expect(decoded).toContain('height="3ex"')
        expect(decoded).toContain('viewBox="-50 -60 600 300"')
    })
})

describe('addSvgViewBoxMargin', () => {
    it('leaves malformed svg unchanged', () => {
        expect(addSvgViewBoxMargin('<svg><text>x</text></svg>')).toBe('<svg><text>x</text></svg>')
    })
})

describe('stripMathDelimiters', () => {
    it('uses envName to strip supported outer delimiters', () => {
        expect(stripMathDelimiters('$x+y$', '$')).toBe('x+y')
        expect(stripMathDelimiters('$$x+y$$', '$$')).toBe('x+y')
        expect(stripMathDelimiters(String.raw`\(` + 'x+y' + String.raw`\)`, '\\(')).toBe('x+y')
        expect(stripMathDelimiters(String.raw`\[` + 'x+y' + String.raw`\]`, '\\[')).toBe('x+y')
        expect(stripMathDelimiters(String.raw`\begin{align}x+y\end{align}`, 'align')).toBe(String.raw`\begin{align}x+y\end{align}`)
    })
})
