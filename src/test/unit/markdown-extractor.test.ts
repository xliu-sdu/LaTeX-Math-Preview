import { describe, expect, it } from 'vitest'
import { findMarkdownMath } from '../../extract/markdown'

describe('findMarkdownMath', () => {
    it('finds inline markdown math', () => {
        const text = 'An inline equation $a+b$ appears here.'
        const snippet = findMarkdownMath(text, { line: 0, character: 20 }, 20)
        expect(snippet?.texString).toBe('$a+b$')
        expect(snippet?.inlineDollar).toBe(true)
    })

    it('finds block $$ math', () => {
        const text = `# Test\n\n$$\n2+1=3\n$$\n`
        const snippet = findMarkdownMath(text, { line: 3, character: 0 }, 20)
        expect(snippet?.envName).toBe('$$')
        expect(snippet?.texString).toContain('2+1=3')
    })

    it('ignores fenced code blocks', () => {
        const text = `\`\`\`md\n$a+b$\n\`\`\`\n\n$x+y$`
        const fenceSnippet = findMarkdownMath(text, { line: 1, character: 2 }, 20)
        expect(fenceSnippet).toBeUndefined()
        const proseSnippet = findMarkdownMath(text, { line: 4, character: 2 }, 20)
        expect(proseSnippet?.texString).toBe('$x+y$')
    })

    it('ignores inline code spans', () => {
        const text = 'Ignore `$x+y$` but parse $z+w$.'
        const snippet = findMarkdownMath(text, { line: 0, character: 25 }, 20)
        expect(snippet?.texString).toBe('$z+w$')
    })
})

