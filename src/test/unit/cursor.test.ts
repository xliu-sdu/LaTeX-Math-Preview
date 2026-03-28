import { describe, expect, it } from 'vitest'
import { buildCursorTeX, insertCursorIntoSnippet, normalizeCursorSymbolForTeX } from '../../render/cursor-utils'

describe('cursor insertion', () => {
    it('inserts cursor at valid position in single line snippet', () => {
        const rendered = insertCursorIntoSnippet('$a+b$', { line: 10, character: 3 }, { line: 10, character: 5 }, '|')
        expect(rendered).toBe('$a|+b$')
    })

    it('inserts cursor in multiline snippet', () => {
        const tex = '\\begin{align}\na+b\n\\end{align}'
        const rendered = insertCursorIntoSnippet(tex, { line: 2, character: 0 }, { line: 3, character: 1 }, '|')
        expect(rendered).toContain('\na|+b\n')
    })

    it('returns undefined for out-of-range cursor', () => {
        const rendered = insertCursorIntoSnippet('$a+b$', { line: 0, character: 0 }, { line: 2, character: 0 }, '|')
        expect(rendered).toBeUndefined()
    })

    it('leaves auto cursor color unwrapped so it inherits the math color', () => {
        expect(buildCursorTeX('\\!|\\!', 'auto')).toBe('\\!|\\!')
    })

    it('wraps explicit cursor colors in valid TeX', () => {
        expect(buildCursorTeX('\\!|\\!', 'black')).toBe('{\\color{black}\\!|\\!}')
    })

    it('normalizes an over-escaped symbol from configuration before rendering', () => {
        expect(normalizeCursorSymbolForTeX('\\\\!|\\\\!')).toBe('\\!|\\!')
        expect(buildCursorTeX('\\\\!|\\\\!', 'auto')).toBe('\\!|\\!')
    })
})
