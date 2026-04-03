import type { MathSnippet, Point } from '../text-model'
import { containsPoint } from '../text-model'
import { makeRange, rangeToText, splitLines } from '../utils/text'

const MATH_ENV_NAMES = [
    'align', 'align\\*', 'alignat', 'alignat\\*', 'eqnarray', 'eqnarray\\*', 'equation', 'equation\\*', 'flalign', 'flalign\\*', 'gather', 'gather\\*', 'multline', 'multline\\*', 'subeqnarray', 'subeqnarray\\*'
]

/**
 * Finds the math snippet at the given position and returns its full source
 * text, including the outer delimiters or matching `\begin{...}` / `\end{...}`
 * pair, not just the math body.
 */
export function findSharedMathSnippet(text: string, position: Point, maxLines: number): MathSnippet | undefined {
    const lines = splitLines(text)
    const inline = findInlineDollarMath(lines, text, position)
    if (inline) {
        return inline
    }

    const directBlock = findAtPosition(lines, text, position)
    if (directBlock) {
        return directBlock
    }

    const beginPos = findBeginPair(lines, createMathBeginPattern(), position, maxLines)
    if (!beginPos) {
        return undefined
    }
    const snippet = findAtPosition(lines, text, beginPos)
    if (!snippet) {
        return undefined
    }

    if (containsPoint(snippet.range, position) || isEndBoundary(position, snippet.range.end)) {
        return snippet
    }

    return undefined
}

/**
 * Resolves a single-line `$...$` snippet when the cursor is inside it or on
 * either outer `$` delimiter.
 *
 * Behavior:
 * - matches only single-dollar inline math on the current line
 * - does not match `$$...$$` display math
 * - matches when the cursor is on either outer `$` delimiter
 *
 * Delimiters such as `\(...\)` and `\[...\]` are handled by the block-math
 * path elsewhere in `findSharedMathSnippet`.
 */
function findInlineDollarMath(lines: string[], fullText: string, position: Point): MathSnippet | undefined {
    const currentLine = lines[position.line] ?? ''
    const inlineMathPattern = createInlineDollarMathPattern()
    let match: RegExpExecArray | null
    while ((match = inlineMathPattern.exec(currentLine)) !== null) {
        const matchStart = match.index
        const matchEndExclusive = match.index + match[0].length
        if (matchStart <= position.character && position.character <= matchEndExclusive) {
            const range = makeRange(
                { line: position.line, character: matchStart },
                { line: position.line, character: matchEndExclusive }
            )
            return {
                texString: rangeToText(fullText, range),
                range,
                envName: '$'
            }
        }
    }
    return undefined
}

function createInlineDollarMathPattern(): RegExp {
    return /(?<!\$|\\)\$(?!\$)(?:\\.|[^\\])+?\$/g
}

/**
 * Attempts to resolve a block-math snippet directly from the given position.
 *
 * Matching happens in three passes on the current line:
 * - if the position is on a supported standalone math `\begin{...}` token,
 *   returns that full environment through its matching `\end{...}`
 * - if the position is on `\[`, `\(`, or `$$`, returns the matching delimited
 *   math block
 *
 * This helper does not search backward for an earlier opener when the position
 * is inside the body of a multi-line block. `findSharedMathSnippet` handles
 * that fallback separately.
 */
function findAtPosition(lines: string[], fullText: string, position: Point): MathSnippet | undefined {
    const line = lines[position.line] ?? ''
    const blockMathBeginPattern = createMathBeginPattern()

    let match: RegExpExecArray | null
    // Scan the current line for any supported block-math opener:
    // `\begin{...}` for an environment in `MATH_ENV_NAMES`, `\[`, `\(`, or `$$`.
    // Treat the cursor as "on" an opener when its character offset is between
    // the opener's first character and the offset immediately after its last
    // character, inclusive. When that test passes, resolve the full block by
    // searching forward for the corresponding closing token.
    while ((match = blockMathBeginPattern.exec(line)) !== null) {
        const start = match.index
        const end = start + match[0].length
        if (start <= position.character && position.character <= end) {
            return findBlockMath(lines, fullText, match, { line: position.line, character: start })
        }
    }

    return undefined
}

function createMathBeginPattern(): RegExp {
    return new RegExp(`\\\\begin\\{(${MATH_ENV_NAMES.join('|')})\\}|\\\\\\[|\\\\\\(|\\$\\$`, 'g')
}

function findBlockMath(
    lines: string[],
    fullText: string,
    beginMatch: RegExpExecArray,
    startPos: Point
): MathSnippet | undefined {
    const opener = beginMatch[0]
    const envName = beginMatch[1] ?? opener
    const pattern = createBlockMathEndPattern(opener, beginMatch[1])
    const searchStart = { line: startPos.line, character: startPos.character + opener.length }
    const endPos = findEndPair(lines, pattern, searchStart)
    if (!endPos) {
        return undefined
    }

    const range = makeRange(startPos, endPos)
    return {
        texString: rangeToText(fullText, range),
        range,
        envName
    }
}

function createBlockMathEndPattern(opener: string, envName?: string): RegExp {
    if (envName) {
        return new RegExp(`\\\\end\\{${escapeRegExp(envName)}\\}`)
    }
    return opener === '\\[' ? /\\\]/ : opener === '\\(' ? /\\\)/ : /\$\$/
}

function escapeRegExp(str: string): string {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

function findEndPair(lines: string[], endPattern: RegExp, startPos: Point): Point | undefined {
    const currentLine = (lines[startPos.line] ?? '').slice(startPos.character)
    let match = currentLine.match(endPattern)
    if (match && match.index !== undefined) {
        return {
            line: startPos.line,
            character: startPos.character + match.index + match[0].length
        }
    }

    for (let lineNum = startPos.line + 1; lineNum < lines.length; lineNum += 1) {
        match = (lines[lineNum] ?? '').match(endPattern)
        if (match && match.index !== undefined) {
            return {
                line: lineNum,
                character: match.index + match[0].length
            }
        }
    }

    return undefined
}

function findBeginPair(lines: string[], beginPattern: RegExp, endPos: Point, limit: number): Point | undefined {
    const currentLine = (lines[endPos.line] ?? '').slice(0, endPos.character + 1)
    let match = findLastMatch(currentLine, beginPattern)
    if (match?.index !== undefined) {
        return {
            line: endPos.line,
            character: match.index
        }
    }

    let lineNum = endPos.line - 1
    let scannedLines = 0
    while (lineNum >= 0 && scannedLines < limit) {
        match = findLastMatch(lines[lineNum] ?? '', beginPattern)
        if (match?.index !== undefined) {
            return {
                line: lineNum,
                character: match.index
            }
        }
        lineNum -= 1
        scannedLines += 1
    }

    return undefined
}

function findLastMatch(text: string, pattern: RegExp): RegExpExecArray | undefined {
    const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
    let last: RegExpExecArray | undefined
    let match: RegExpExecArray | null
    while ((match = global.exec(text)) !== null) {
        last = match
    }
    return last
}

function isEndBoundary(point: Point, end: Point): boolean {
    return point.line === end.line && point.character === end.character
}
