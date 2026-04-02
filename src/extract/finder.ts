import type { MathSnippet, Point } from '../text-model'
import { containsPoint } from '../text-model'
import { makeRange, rangeToText, splitLines } from '../utils/text'

const ENV_NAMES = [
    'align', 'align\\*', 'alignat', 'alignat\\*', 'aligned', 'alignedat', 'array', 'Bmatrix', 'bmatrix', 'cases', 'CD', 'eqnarray', 'eqnarray\\*', 'equation', 'equation\\*', 'flalign', 'flalign\\*', 'gather', 'gather\\*', 'gathered', 'matrix', 'multline', 'multline\\*', 'pmatrix', 'smallmatrix', 'split', 'subarray', 'subeqnarray', 'subeqnarray\\*', 'Vmatrix', 'vmatrix'
]

const MATH_ENV_NAMES = [
    'align', 'align\\*', 'alignat', 'alignat\\*', 'eqnarray', 'eqnarray\\*', 'equation', 'equation\\*', 'flalign', 'flalign\\*', 'gather', 'gather\\*', 'multline', 'multline\\*', 'subeqnarray', 'subeqnarray\\*'
]

export function findSharedMathSnippet(text: string, position: Point, maxLines: number): MathSnippet | undefined {
    const lines = splitLines(text)
    const direct = findAtPosition(lines, text, position)
    if (direct) {
        return direct
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
 * Attempts to resolve a math snippet directly from the given position.
 *
 * Matching happens in three passes on the current line:
 * - if the position is on a supported `\begin{...}` token, returns that full
 *   environment through its matching `\end{...}`
 * - if the position is on `\[`, `\(`, or `$$`, returns the matching delimited
 *   math block
 * - otherwise, if the position is strictly inside same-line inline math
 *   (`$...$` or `\(...\)`), returns that inline snippet
 *
 * This helper does not search backward for an earlier opener when the position
 * is inside the body of a multi-line block. `findSharedMathSnippet` handles
 * that fallback separately.
 */
function findAtPosition(lines: string[], fullText: string, position: Point): MathSnippet | undefined {
    const line = lines[position.line] ?? ''
    const envBeginPattern = createEnvBeginPattern()
    const delimitedBeginPattern = createDelimitedBeginPattern()

    let match: RegExpExecArray | null
    // Named math environments use \begin{...}...\end{...} pairs.
    while ((match = envBeginPattern.exec(line)) !== null) {
        const start = match.index
        const end = start + match[0].length
        if (start <= position.character && position.character <= end) {
            return findMathEnvironment(lines, fullText, match[1], { line: position.line, character: start })
        }
    }
    // Delimited math uses standalone opening/closing markers such as \[, \(, or $$.
    while ((match = delimitedBeginPattern.exec(line)) !== null) {
        const start = match.index
        const end = start + match[0].length
        if (start <= position.character && position.character <= end) {
            return findDelimitedMath(lines, fullText, match[1], { line: position.line, character: start })
        }
    }

    return findInlineMath(lines, fullText, position)
}

function findMathEnvironment(
    lines: string[],
    fullText: string,
    envName: string,
    startPos: Point
): MathSnippet | undefined {
    const pattern = new RegExp(`\\\\end\\{${escapeRegExp(envName)}\\}`)
    const searchStart = { line: startPos.line, character: startPos.character + envName.length + '\\begin{}'.length }
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

function findDelimitedMath(
    lines: string[],
    fullText: string,
    envName: string,
    startPos: Point
): MathSnippet | undefined {
    const pattern = envName === '\\[' ? /\\\]/ : envName === '\\(' ? /\\\)/ : /\$\$/
    const searchStart = { line: startPos.line, character: startPos.character + envName.length }
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

function findInlineMath(lines: string[], fullText: string, position: Point): MathSnippet | undefined {
    const currentLine = lines[position.line] ?? ''
    const inlineMathPattern = createInlineMathPattern()
    let match: RegExpExecArray | null
    while ((match = inlineMathPattern.exec(currentLine)) !== null) {
        const matchStart = match.index
        const matchEndExclusive = match.index + match[0].length
        if (matchStart < position.character && position.character < matchEndExclusive) {
            const range = makeRange(
                { line: position.line, character: matchStart },
                { line: position.line, character: matchEndExclusive }
            )
            return {
                texString: rangeToText(fullText, range),
                range,
                envName: match[0].startsWith('\\(') ? '\\(' : '$',
                inlineDollar: match[0].startsWith('$')
            }
        }
    }
    return undefined
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

function createInlineMathPattern(): RegExp {
    return /(?<!\$|\\)\$(?!\$)(?:\\.|[^\\])+?\$|\\\(.+?\\\)/g
}

function createDelimitedBeginPattern(): RegExp {
    return /(\\\[|\\\(|\$\$)/g
}

function createEnvBeginPattern(): RegExp {
    return new RegExp(`\\\\begin\\{(${ENV_NAMES.join('|')})\\}`, 'g')
}

function createMathBeginPattern(): RegExp {
    return new RegExp(`\\\\begin\\{(${MATH_ENV_NAMES.join('|')})\\}|\\\\\\[|\\\\\\(|\\$\\$`, 'g')
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

function escapeRegExp(str: string): string {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}
