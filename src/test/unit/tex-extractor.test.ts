import { describe, expect, it } from 'vitest'
import { findMathSnippet } from '../../extract'

describe('findMathSnippet tex', () => {
    it('finds align environment around cursor', () => {
        const text = String.raw`\begin{align}
  a &= b + c \\
  d &= e
\end{align}`
        const snippet = findMathSnippet(text, { line: 1, character: 4 }, 20)
        expect(snippet).toBeDefined()
        expect(snippet?.envName).toBe('align')
        expect(snippet?.texString.startsWith('\\begin{align}')).toBe(true)
        expect(snippet?.texString.includes('\\end{align}')).toBe(true)
    })

    it('finds display math in brackets', () => {
        const text = String.raw`Before
\[
\frac{1}{2}
\]
After`
        const snippet = findMathSnippet(text, { line: 2, character: 3 }, 20)
        expect(snippet?.envName).toBe('\\[')
        expect(snippet?.texString).toContain('\\frac{1}{2}')
    })

    it('finds inline dollar math and marks inlineDollar', () => {
        const text = 'Value is $x^2 + y^2$ in line.'
        const snippet = findMathSnippet(text, { line: 0, character: 11 }, 20)
        expect(snippet?.envName).toBe('$')
        expect(snippet?.inlineDollar).toBe(true)
        expect(snippet?.texString).toBe('$x^2 + y^2$')
    })

    it('finds inline dollar math while the cursor is inside the formula body', () => {
        const text = 'Value is $x^2 + y^2$ in line.'
        expect(findMathSnippet(text, { line: 0, character: 10 }, 20)?.texString).toBe('$x^2 + y^2$')
        expect(findMathSnippet(text, { line: 0, character: 18 }, 20)?.texString).toBe('$x^2 + y^2$')
    })

    it('does not find inline dollar math at the outer cursor boundaries', () => {
        const text = 'Value is $x^2 + y^2$ in line.'
        expect(findMathSnippet(text, { line: 0, character: 9 }, 20)).toBeUndefined()
        expect(findMathSnippet(text, { line: 0, character: 21 }, 20)).toBeUndefined()
    })

    it('returns undefined for unmatched environment', () => {
        const text = String.raw`\begin{equation}
x + y`
        const snippet = findMathSnippet(text, { line: 1, character: 1 }, 20)
        expect(snippet).toBeUndefined()
    })

    it('does not strip TeX comments while scanning for delimiters', () => {
        const text = String.raw`Before
\[
% comment with \]
x + y
\]
After`
        const snippet = findMathSnippet(text, { line: 1, character: 5 }, 20)
        expect(snippet?.texString).toContain('% comment with \\]')
        expect(snippet?.texString).not.toContain('x + y')
    })

    it('does not mask verbatim content while scanning for delimiters', () => {
        const text = String.raw`Before
\[
\verb|\]|
\]
After`
        const snippet = findMathSnippet(text, { line: 2, character: 3 }, 20)
        expect(snippet?.texString).toContain('\\verb|\\]')
        expect(snippet?.texString).not.toContain('\n\\]\n')
    })
})
