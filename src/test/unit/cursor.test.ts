import { describe, expect, it } from 'vitest'
import { buildCursorTeX, findBackslashRun, findControlWordCommandStart, insertCursorIntoSnippet, shouldSuppressCursorAtBoundary } from '../../render/cursor-utils'

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

    it('keeps a cursor already at a control-word command start at that start position', () => {
        const character = findControlWordCommandStart('\\frac{1}{2}', 0) ?? 0
        const rendered = insertCursorIntoSnippet('\\frac{1}{2}', { line: 0, character: 0 }, { line: 0, character }, '|')
        expect(rendered).toBe('|\\frac{1}{2}')
    })

    it('normalizes a cursor inside a control-word command to the command start', () => {
        const character = findControlWordCommandStart('\\frac{1}{2}', 3) ?? 3
        const rendered = insertCursorIntoSnippet('\\frac{1}{2}', { line: 0, character: 0 }, { line: 0, character }, '|')
        expect(rendered).toBe('|\\frac{1}{2}')
    })

    it('does not normalize a cursor at the end of a control-word command', () => {
        const character = findControlWordCommandStart('\\frac{1}{2}', 5) ?? 5
        const rendered = insertCursorIntoSnippet('\\frac{1}{2}', { line: 0, character: 0 }, { line: 0, character }, '|')
        expect(rendered).toBe('\\frac|{1}{2}')
    })

    it('does not normalize a cursor immediately after a control-word command with no arguments', () => {
        const character = findControlWordCommandStart('\\alpha', 6) ?? 6
        const rendered = insertCursorIntoSnippet('\\alpha', { line: 0, character: 0 }, { line: 0, character }, '|')
        expect(rendered).toBe('\\alpha|')
    })

    it('does not normalize when the cursor is before the backslash or after following text', () => {
        expect(findControlWordCommandStart('x\\frac{1}{2}', 0)).toBeUndefined()
        expect(findControlWordCommandStart('\\alpha x', 7)).toBeUndefined()
    })

    it('does not normalize control symbols or environment commands', () => {
        expect(findControlWordCommandStart('\\(', 1)).toBeUndefined()
        expect(findControlWordCommandStart('\\\\', 1)).toBeUndefined()
        expect(findControlWordCommandStart('\\begin{align}', 3)).toBeUndefined()
    })

    it('normalizes a lone backslash before the cursor to the run start', () => {
        const run = findBackslashRun('\\', 1)
        const rendered = insertCursorIntoSnippet('\\', { line: 0, character: 0 }, { line: 0, character: run?.start ?? 1 }, '|')
        expect(rendered).toBe('|\\')
    })

    it('normalizes a cursor inside a backslash run to the front of the run', () => {
        const run = findBackslashRun('\\\\', 1)
        const rendered = insertCursorIntoSnippet('\\\\', { line: 0, character: 0 }, { line: 0, character: run?.start ?? 1 }, '|')
        expect(rendered).toBe('|\\\\')
    })

    it('normalizes a cursor at the end of a backslash run to the front of the run', () => {
        const run = findBackslashRun('\\\\', 2)
        const rendered = insertCursorIntoSnippet('\\\\', { line: 0, character: 0 }, { line: 0, character: run?.start ?? 2 }, '|')
        expect(rendered).toBe('|\\\\')
    })

    it('normalizes longer backslash runs to their first backslash', () => {
        const run = findBackslashRun('\\\\\\', 3)
        const rendered = insertCursorIntoSnippet('\\\\\\', { line: 0, character: 0 }, { line: 0, character: run?.start ?? 3 }, '|')
        expect(rendered).toBe('|\\\\\\')
    })

    it('does not detect a backslash run when the cursor is outside the run', () => {
        expect(findBackslashRun('\\alpha', 2)).toBeUndefined()
        expect(findBackslashRun('x\\\\', 0)).toBeUndefined()
    })

    it('allows snippet-start insertion when a control-word command resolves there', () => {
        expect(shouldSuppressCursorAtBoundary(
            {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 5 }
            },
            { line: 0, character: 0 },
            true
        )).toBe(false)
    })

    it('still suppresses non-normalized snippet-start and snippet-end insertions', () => {
        expect(shouldSuppressCursorAtBoundary(
            {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 5 }
            },
            { line: 0, character: 0 },
            false
        )).toBe(true)
        expect(shouldSuppressCursorAtBoundary(
            {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 5 }
            },
            { line: 0, character: 5 },
            true
        )).toBe(true)
    })

    it('wraps the cursor symbol in braces when color is auto', () => {
        expect(buildCursorTeX('\\!|\\!', 'auto')).toBe('{\\!|\\!}')
    })

    it('wraps explicit cursor colors around a braced symbol', () => {
        expect(buildCursorTeX('\\!|\\!', 'black')).toBe('{\\color{black}{\\!|\\!}}')
    })

    it('preserves the configured cursor symbol content inside braces', () => {
        expect(buildCursorTeX('\\\\!|\\\\!', 'auto')).toBe('{\\\\!|\\\\!}')
    })
})
