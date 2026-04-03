import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TextDocument } from 'vscode'
import type { MathSnippet, Point } from '../../text-model'

const { activeTextEditor, activeColorTheme } = vi.hoisted(() => ({
    activeTextEditor: { current: undefined as { selection: MockSelection } | undefined },
    activeColorTheme: { kind: 1 }
}))

type MockSelection = {
    anchor: Point
    active: Point
    isEmpty: boolean
    isReversed: boolean
}

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

import { buildMarkerTeX, insertCursorIntoSnippet, insertMarkersIntoSnippet } from '../../render/cursor-utils'
import { getThemeTextColor, renderCursor } from '../../render/cursor'

describe('cursor rendering', () => {
    beforeEach(() => {
        activeTextEditor.current = undefined
        activeColorTheme.kind = 1
    })

    it('returns the original snippet when cursor rendering is disabled', () => {
        setSelection(point(0, 0), point(0, 0))
        const snippet = inlineSnippet('$a+b$')
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            snippet,
            defaultOptions({ enabled: false })
        )
        expect(rendered).toBe('$a+b$')
    })

    it('returns the original snippet when there is no active editor', () => {
        const snippet = inlineSnippet('$a+b$')
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            snippet,
            defaultOptions()
        )
        expect(rendered).toBe('$a+b$')
    })

    it('returns the original snippet when the cursor is outside the snippet range', () => {
        setSelection(point(1, 0), point(1, 0))
        const rendered = renderCursor(
            createDocument(['$a+b$', 'c+d']),
            inlineSnippet('$a+b$'),
            defaultOptions()
        )
        expect(rendered).toBe('$a+b$')
    })

    it('inserts the cursor inside inline math', () => {
        setSelection(point(0, 2), point(0, 2))
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            inlineSnippet('$a+b$'),
            defaultOptions()
        )
        expect(rendered).toBe('$a{|}+b$')
    })

    it('renders the cursor at the math body start when the cursor is on the opening delimiter', () => {
        setSelection(point(0, 0), point(0, 0))
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            inlineSnippet('$a+b$'),
            defaultOptions()
        )
        expect(rendered).toBe('${|}a+b$')
    })

    it('allows insertion at the end of the math body before the closing delimiter', () => {
        setSelection(point(2, 0), point(2, 0))
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
            defaultOptions()
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

        setSelection(point(0, 1), point(0, 1))
        expect(renderCursor(
            createDocument(['$$', '1+1=2', '$$']),
            snippet,
            defaultOptions()
        )).toBe('$${|}\n1+1=2\n$$')

        setSelection(point(2, 1), point(2, 1))
        expect(renderCursor(
            createDocument(['$$', '1+1=2', '$$']),
            snippet,
            defaultOptions()
        )).toBe('$$\n1+1=2\n{|}$$')
    })

    it('snaps inside structural control words to the left boundary', () => {
        setSelection(point(0, 3), point(0, 3))
        const rendered = renderCursor(
            createDocument(['$\\frac{1}{2}$']),
            inlineSnippet('$\\frac{1}{2}$'),
            defaultOptions()
        )
        expect(rendered).toBe('${|}\\frac{1}{2}$')
    })

    it('snaps exact right-edge positions of left-only control words to the left boundary', () => {
        setSelection(point(0, 6), point(0, 6))
        const rendered = renderCursor(
            createDocument(['$\\frac{1}{2}$']),
            inlineSnippet('$\\frac{1}{2}$'),
            defaultOptions()
        )
        expect(rendered).toBe('${|}\\frac{1}{2}$')
    })

    it('does not normalize after a control-word command with no arguments', () => {
        setSelection(point(0, 7), point(0, 7))
        const rendered = renderCursor(
            createDocument(['$\\alpha x$']),
            inlineSnippet('$\\alpha x$'),
            defaultOptions()
        )
        expect(rendered).toBe('$\\alpha{|} x$')
    })

    it('snaps inside control words to the nearest legal boundary', () => {
        setSelection(point(0, 6), point(0, 6))
        const rendered = renderCursor(
            createDocument(['$\\alpha$']),
            inlineSnippet('$\\alpha$'),
            defaultOptions()
        )
        expect(rendered).toBe('$\\alpha{|}$')
    })

    it('breaks nearest-boundary ties to the left inside control words', () => {
        setSelection(point(0, 4), point(0, 4))
        const rendered = renderCursor(
            createDocument(['$\\alpha$']),
            inlineSnippet('$\\alpha$'),
            defaultOptions()
        )
        expect(rendered).toBe('${|}\\alpha$')
    })

    it('breaks nearest-boundary ties to the left inside backslash runs', () => {
        setSelection(point(0, 2), point(0, 2))
        const rendered = renderCursor(
            createDocument(['$\\\\$']),
            inlineSnippet('$\\\\$'),
            defaultOptions()
        )
        expect(rendered).toBe('${|}\\\\$')
    })

    it('snaps a cursor placed after a trailing lone backslash to the left of the escape', () => {
        setSelection(point(0, 3), point(0, 3))
        const rendered = renderCursor(
            createDocument(['$a\\$']),
            inlineSnippet('$a\\$'),
            defaultOptions()
        )
        expect(rendered).toBe('$a{|}\\$')
    })

    it('renders inside opening environment commands by snapping to the body start', () => {
        setSelection(point(0, 4), point(0, 4))
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
            defaultOptions()
        )
        expect(rendered).toBe('\\begin{align}{|}\na+b\n\\end{align}')
    })

    it('renders inside closing environment commands by snapping to the body end', () => {
        setSelection(point(2, 4), point(2, 4))
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
            defaultOptions()
        )
        expect(rendered).toBe('\\begin{align}\na+b\n{|}\\end{align}')
    })

    it('snaps comment positions to the comment start instead of hiding the cursor', () => {
        setSelection(point(1, 8), point(1, 8))
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
            defaultOptions()
        )
        expect(rendered).toBe('\\begin{align}\na+b {|}% note\n\\end{align}')
    })

    it('renders forward selections inside inline math', () => {
        setSelection(point(0, 1), point(0, 4))
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            inlineSnippet('$a+b$'),
            defaultOptions({ selectionStartSymbol: 'S', selectionEndSymbol: 'E' })
        )
        expect(rendered).toBe('${S}a+b{E}$')
    })

    it('renders reversed selections inside inline math', () => {
        setSelection(point(0, 4), point(0, 1))
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            inlineSnippet('$a+b$'),
            defaultOptions({ selectionStartSymbol: 'S', selectionEndSymbol: 'E' })
        )
        expect(rendered).toBe('${S}a+b{E}$')
    })

    it('renders selections inside display math', () => {
        setSelection(point(1, 1), point(1, 5))
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
            defaultOptions({ selectionStartSymbol: 'S', selectionEndSymbol: 'E' })
        )
        expect(rendered).toBe('$$\n1{S}+1=2{E}\n$$')
    })

    it('snaps selection endpoints on display delimiters to body boundaries', () => {
        setSelection(point(0, 1), point(2, 1))
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
            defaultOptions({ selectionStartSymbol: 'S', selectionEndSymbol: 'E' })
        )
        expect(rendered).toBe('$${S}\n1+1=2\n{E}$$')
    })

    it('snaps selection endpoints inside structural control words to safe boundaries', () => {
        setSelection(point(0, 3), point(0, 6))
        const rendered = renderCursor(
            createDocument(['$\\frac{1}{2}$']),
            inlineSnippet('$\\frac{1}{2}$'),
            defaultOptions({ selectionStartSymbol: 'S', selectionEndSymbol: 'E' })
        )
        expect(rendered).toBe('${S}{E}\\frac{1}{2}$')
    })

    it('snaps selection endpoints inside comments to the comment boundary', () => {
        setSelection(point(1, 2), point(1, 8))
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
            defaultOptions({ selectionStartSymbol: 'S', selectionEndSymbol: 'E' })
        )
        expect(rendered).toBe('\\begin{align}\na+{S}b {E}% note\n\\end{align}')
    })

    it('renders a one-sided marker when only the anchor lies inside the chosen snippet', () => {
        setSelection(point(0, 2), point(1, 0))
        const rendered = renderCursor(
            createDocument(['$a+b$', 'outside']),
            inlineSnippet('$a+b$'),
            defaultOptions({ selectionStartSymbol: 'S', selectionEndSymbol: 'E' })
        )
        expect(rendered).toBe('$a{S}+b$')
    })

    it('uses configured selection symbols and cursor colors for selection markers', () => {
        setSelection(point(0, 1), point(0, 4))
        const rendered = renderCursor(
            createDocument(['$a+b$']),
            inlineSnippet('$a+b$'),
            defaultOptions({
                color: 'red',
                selectionStartSymbol: '\\{',
                selectionEndSymbol: '\\}'
            })
        )
        expect(rendered).toBe('${\\color{red}{\\{}}a+b{\\color{red}{\\}}}$')
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

    it('inserts multiple markers from right to left', () => {
        const rendered = insertMarkersIntoSnippet(
            '$a+b$',
            { line: 0, character: 0 },
            [
                { point: point(0, 1), markerString: 'S' },
                { point: point(0, 4), markerString: 'E' }
            ]
        )
        expect(rendered).toBe('$Sa+bE$')
    })

    it('keeps marker ordering stable when multiple insertions resolve to the same point', () => {
        const rendered = insertMarkersIntoSnippet(
            '$a+b$',
            { line: 0, character: 0 },
            [
                { point: point(0, 1), markerString: 'S' },
                { point: point(0, 1), markerString: 'E' }
            ]
        )
        expect(rendered).toBe('$SEa+b$')
    })

    it('wraps marker symbols in braces when color is auto', () => {
        expect(buildMarkerTeX('\\!|\\!', 'auto')).toBe('{\\!|\\!}')
    })

    it('wraps markers in braces when color is auto', () => {
        expect(buildMarkerTeX('\\{', 'auto')).toBe('{\\{}')
    })

    it('wraps explicit colors around a braced symbol', () => {
        expect(buildMarkerTeX('\\!|\\!', 'black')).toBe('{\\color{black}{\\!|\\!}}')
    })

    it('preserves the configured marker symbol content inside braces', () => {
        expect(buildMarkerTeX('\\\\!|\\\\!', 'auto')).toBe('{\\\\!|\\\\!}')
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

function defaultOptions(overrides: Partial<Parameters<typeof renderCursor>[2]> = {}) {
    return {
        enabled: true,
        symbol: '|',
        color: 'auto' as const,
        selectionStartSymbol: '\\{',
        selectionEndSymbol: '\\}',
        ...overrides
    }
}

function point(line: number, character: number): Point {
    return { line, character }
}

function setSelection(anchor: Point, active: Point) {
    activeTextEditor.current = {
        selection: {
            anchor,
            active,
            isEmpty: anchor.line === active.line && anchor.character === active.character,
            isReversed: anchor.line > active.line || (anchor.line === active.line && anchor.character > active.character)
        }
    }
}
