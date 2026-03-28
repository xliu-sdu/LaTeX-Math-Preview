import { describe, expect, it } from 'vitest'
import { findTexMath } from '../../extract/tex'

describe('findTexMath', () => {
    it('finds align environment around cursor', () => {
        const text = String.raw`\begin{align}
  a &= b + c \\
  d &= e
\end{align}`
        const snippet = findTexMath(text, { line: 1, character: 4 }, 20)
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
        const snippet = findTexMath(text, { line: 2, character: 3 }, 20)
        expect(snippet?.envName).toBe('\\[')
        expect(snippet?.texString).toContain('\\frac{1}{2}')
    })

    it('finds inline dollar math and marks inlineDollar', () => {
        const text = 'Value is $x^2 + y^2$ in line.'
        const snippet = findTexMath(text, { line: 0, character: 11 }, 20)
        expect(snippet?.envName).toBe('$')
        expect(snippet?.inlineDollar).toBe(true)
        expect(snippet?.texString).toBe('$x^2 + y^2$')
    })

    it('finds inline dollar math while the cursor is inside the formula body', () => {
        const text = 'Value is $x^2 + y^2$ in line.'
        expect(findTexMath(text, { line: 0, character: 10 }, 20)?.texString).toBe('$x^2 + y^2$')
        expect(findTexMath(text, { line: 0, character: 18 }, 20)?.texString).toBe('$x^2 + y^2$')
    })

    it('returns undefined for unmatched environment', () => {
        const text = String.raw`\begin{equation}
x + y`
        const snippet = findTexMath(text, { line: 1, character: 1 }, 20)
        expect(snippet).toBeUndefined()
    })
})
