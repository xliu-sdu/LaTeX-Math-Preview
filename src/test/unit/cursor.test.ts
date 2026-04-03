import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TextDocument } from 'vscode'
import type { MathSnippet } from '../../text-model'

const { activeTextEditor, activeColorTheme } = vi.hoisted(() => ({
    activeTextEditor: { current: undefined as { selection: { active: { line: number, character: number } } } | undefined },
    activeColorTheme: { kind: 1 }
}))

vi.mock('vscode', () => ({
    window: {
        get activeTextEditor() {
            return activeTextEditor.current
        },
        activeColorTheme
    },
    ColorThemeKind: {
        Light: 1,
        Dark: 2
    }
}))

import { buildCursorTeX, insertCursorIntoSnippet } from '../../render/cursor-utils'
import { getThemeTextColor, renderCursor } from '../../render/cursor'

describe('cursor rendering', () => {
    beforeEach(() => {
        activeTextEditor.current = undefined
        activeColorTheme.kind = 1
    })

    it('returns the original snippet when cursor rendering is disabled', () => {
        const snippet = inlineSnippet('$a+b$')
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            snippet,
            { enabled: false, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('$a+b$')
    })

    it('returns the original snippet when there is no active editor', () => {
        const snippet = inlineSnippet('$a+b$')
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            snippet,
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('$a+b$')
    })

    it('returns the original snippet when the cursor is outside the snippet range', () => {
        activeTextEditor.current = { selection: { active: { line: 1, character: 0 } } }
        const rendered = renderCursor(
            createDocument(['$a+b$', 'c+d']),
            inlineSnippet('$a+b$'),
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('$a+b$')
    })

    it('inserts the cursor inside inline math', () => {
        activeTextEditor.current = { selection: { active: { line: 0, character: 2 } } }
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            inlineSnippet('$a+b$'),
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('$a{|}+b$')
    })

    it('renders the cursor at the math body start when the cursor is on the opening delimiter', () => {
        activeTextEditor.current = { selection: { active: { line: 0, character: 0 } } }
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            inlineSnippet('$a+b$'),
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('${|}a+b$')
    })

    it('allows insertion at the end of the math body before the closing delimiter', () => {
        activeTextEditor.current = { selection: { active: { line: 2, character: 0 } } }
        const rendered = renderCursor(
            createDocument(['$$', '1+1=2', '$$']),
            {
                texString: '$$\n1+1=2\n$$',
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 2, character: 2 }
                },
                envName: '$$'
            },
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('$$\n1+1=2\n{|}$$')
    })

    it('renders inside opening and closing display delimiters by snapping to body boundaries', () => {
        const snippet = {
            texString: '$$\n1+1=2\n$$',
            range: {
                start: { line: 0, character: 0 },
                end: { line: 2, character: 2 }
            },
            envName: '$$'
        }

        activeTextEditor.current = { selection: { active: { line: 0, character: 1 } } }
        expect(renderCursor(
            createDocument(['$$', '1+1=2', '$$']),
            snippet,
            { enabled: true, symbol: '|', color: 'auto' }
        )).toBe('$${|}\n1+1=2\n$$')

        activeTextEditor.current = { selection: { active: { line: 2, character: 1 } } }
        expect(renderCursor(
            createDocument(['$$', '1+1=2', '$$']),
            snippet,
            { enabled: true, symbol: '|', color: 'auto' }
        )).toBe('$$\n1+1=2\n{|}$$')
    })

    it('snaps inside structural control words to the left boundary', () => {
        activeTextEditor.current = { selection: { active: { line: 0, character: 3 } } }
        const rendered = renderCursor(
            createDocument(['$\\frac{1}{2}$']),
            inlineSnippet('$\\frac{1}{2}$'),
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('${|}\\frac{1}{2}$')
    })

    it('snaps exact right-edge positions of left-only control words to the left boundary', () => {
        activeTextEditor.current = { selection: { active: { line: 0, character: 6 } } }
        const rendered = renderCursor(
            createDocument(['$\\frac{1}{2}$']),
            inlineSnippet('$\\frac{1}{2}$'),
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('${|}\\frac{1}{2}$')
    })

    it('does not normalize after a control-word command with no arguments', () => {
        activeTextEditor.current = { selection: { active: { line: 0, character: 7 } } }
        const rendered = renderCursor(
            createDocument(['$\\alpha x$']),
            inlineSnippet('$\\alpha x$'),
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('$\\alpha{|} x$')
    })

    it('snaps inside control words to the nearest legal boundary', () => {
        activeTextEditor.current = { selection: { active: { line: 0, character: 6 } } }
        const rendered = renderCursor(
            createDocument(['$\\alpha$']),
            inlineSnippet('$\\alpha$'),
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('$\\alpha{|}$')
    })

    it('breaks nearest-boundary ties to the left inside control words', () => {
        activeTextEditor.current = { selection: { active: { line: 0, character: 4 } } }
        const rendered = renderCursor(
            createDocument(['$\\alpha$']),
            inlineSnippet('$\\alpha$'),
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('${|}\\alpha$')
    })

    it('breaks nearest-boundary ties to the left inside backslash runs', () => {
        activeTextEditor.current = { selection: { active: { line: 0, character: 2 } } }
        const rendered = renderCursor(
            createDocument(['$\\\\$']),
            inlineSnippet('$\\\\$'),
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('${|}\\\\$')
    })

    it('snaps a cursor placed after a trailing lone backslash to the left of the escape', () => {
        activeTextEditor.current = { selection: { active: { line: 0, character: 3 } } }
        const rendered = renderCursor(
            createDocument(['$a\\$']),
            inlineSnippet('$a\\$'),
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('$a{|}\\$')
    })

    it('renders inside opening environment commands by snapping to the body start', () => {
        activeTextEditor.current = { selection: { active: { line: 0, character: 4 } } }
        const snippet: MathSnippet = {
            texString: '\\begin{align}\na+b\n\\end{align}',
            range: {
                start: { line: 0, character: 0 },
                end: { line: 2, character: 11 }
            },
            envName: 'align'
        }
        const rendered = renderCursor(
            createDocument(['\\begin{align}', 'a+b', '\\end{align}']),
            snippet,
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('\\begin{align}{|}\na+b\n\\end{align}')
    })

    it('renders inside closing environment commands by snapping to the body end', () => {
        activeTextEditor.current = { selection: { active: { line: 2, character: 4 } } }
        const snippet: MathSnippet = {
            texString: '\\begin{align}\na+b\n\\end{align}',
            range: {
                start: { line: 0, character: 0 },
                end: { line: 2, character: 11 }
            },
            envName: 'align'
        }
        const rendered = renderCursor(
            createDocument(['\\begin{align}', 'a+b', '\\end{align}']),
            snippet,
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('\\begin{align}\na+b\n{|}\\end{align}')
    })

    it('snaps comment positions to the comment start instead of hiding the cursor', () => {
        activeTextEditor.current = { selection: { active: { line: 1, character: 8 } } }
        const snippet: MathSnippet = {
            texString: '\\begin{align}\na+b % note\n\\end{align}',
            range: {
                start: { line: 0, character: 0 },
                end: { line: 2, character: 11 }
            },
            envName: 'align'
        }
        const rendered = renderCursor(
            createDocument(['\\begin{align}', 'a+b % note', '\\end{align}']),
            snippet,
            { enabled: true, symbol: '|', color: 'auto' }
        )
        expect(rendered).toBe('\\begin{align}\na+b {|}% note\n\\end{align}')
    })
})

describe('cursor helpers', () => {
    it('inserts cursor at valid position in single line snippet', () => {
        const rendered = insertCursorIntoSnippet('$a+b$', { line: 10, character: 3 }, { line: 10, character: 5 }, '|')
        expect(rendered).toBe('$a|+b$')
    })

    it('inserts cursor in multiline snippet', () => {
        const tex = '\\begin{align}\na+b\n\\end{align}'
        const rendered = insertCursorIntoSnippet(tex, { line: 2, character: 0 }, { line: 3, character: 1 }, '|')
        expect(rendered).toContain('\na|+b\n')
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

    it('returns light theme text color for light themes', () => {
        activeColorTheme.kind = 1
        expect(getThemeTextColor()).toBe('#000000')
    })

    it('returns dark theme text color for dark themes', () => {
        activeColorTheme.kind = 2
        expect(getThemeTextColor()).toBe('#ffffff')
    })
})

function inlineSnippet(texString: string): MathSnippet {
    return {
        texString,
        range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: texString.length }
        },
        envName: '$'
    }
}

function createDocument(lines: string[]) {
    return {
        lineAt(line: number) {
            return { text: lines[line] ?? '' }
        }
    } as TextDocument
}
