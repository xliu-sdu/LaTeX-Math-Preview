import { describe, expect, it } from 'vitest'
import { findMathSnippet } from '../../extract'

describe('findMathSnippet markdown', () => {
    it('finds inline markdown math', () => {
        const text = 'An inline equation $a+b$ appears here.'
        const snippet = findMathSnippet(text, { line: 0, character: 20 }, 20)
        expect(snippet?.texString).toBe('$a+b$')
    })

    it('finds inline markdown math while the cursor is inside the formula body', () => {
        const text = 'An inline equation $a+b$ appears here.'
        expect(findMathSnippet(text, { line: 0, character: 20 }, 20)?.texString).toBe('$a+b$')
        expect(findMathSnippet(text, { line: 0, character: 22 }, 20)?.texString).toBe('$a+b$')
    })

    it('finds inline markdown math at the outer cursor boundaries', () => {
        const text = 'An inline equation $a+b$ appears here.'
        expect(findMathSnippet(text, { line: 0, character: 19 }, 20)?.texString).toBe('$a+b$')
        expect(findMathSnippet(text, { line: 0, character: 24 }, 20)?.texString).toBe('$a+b$')
    })

    it('finds block $$ math', () => {
        const text = `# Test\n\n$$\n2+1=3\n$$\n`
        const snippet = findMathSnippet(text, { line: 3, character: 0 }, 20)
        expect(snippet?.envName).toBe('$$')
        expect(snippet?.texString).toContain('2+1=3')
    })

    it('detects math inside fenced code blocks', () => {
        const text = `\`\`\`md\n$a+b$\n\`\`\`\n\n$x+y$`
        const fenceSnippet = findMathSnippet(text, { line: 1, character: 2 }, 20)
        expect(fenceSnippet?.texString).toBe('$a+b$')
        const proseSnippet = findMathSnippet(text, { line: 4, character: 2 }, 20)
        expect(proseSnippet?.texString).toBe('$x+y$')
    })

    it('detects math inside inline code spans', () => {
        const text = 'Ignore `$x+y$` but parse $z+w$.'
        const inlineCodeSnippet = findMathSnippet(text, { line: 0, character: 9 }, 20)
        expect(inlineCodeSnippet?.texString).toBe('$x+y$')
        const proseSnippet = findMathSnippet(text, { line: 0, character: 26 }, 20)
        expect(proseSnippet?.texString).toBe('$z+w$')
    })

    it('finds TeX environments in markdown', () => {
        const text = String.raw`Before
\begin{align}
  a &= b + c \\
\end{align}
After`
        const snippet = findMathSnippet(text, { line: 2, character: 4 }, 20)
        expect(snippet?.envName).toBe('align')
    })

    it('does not treat aligned as a standalone previewable environment in markdown', () => {
        const text = String.raw`Before
\begin{aligned}
1+1=2
\end{aligned}
After`
        expect(findMathSnippet(text, { line: 1, character: 8 }, 20)).toBeUndefined()
        expect(findMathSnippet(text, { line: 2, character: 2 }, 20)).toBeUndefined()
    })
})
