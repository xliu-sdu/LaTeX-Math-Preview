import type { CursorColor } from '../config'
import { comparePoint, type MathSnippet, type Point, type TextRange } from '../text-model'

type UnsafeToken = {
    start: number
    end: number
    allowRight: boolean // cursor may anchor at token end
}

const STRUCTURAL_CONTROL_WORDS = new Set([
    'frac',
    'sqrt',
    'text',
    'operatorname',
    'left',
    'right',
    'middle'
])

export function insertCursorIntoSnippet(
    snippetTex: string,
    snippetStart: { line: number, character: number },
    cursor: { line: number, character: number },
    cursorString: string
): string {
    const line = cursor.line - snippetStart.line
    const character = cursor.character - (line === 0 ? snippetStart.character : 0)
    const texLines = snippetTex.split('\n')
    texLines[line] = texLines[line].slice(0, character) + cursorString + texLines[line].slice(character)
    return texLines.join('\n')
}

export function buildCursorTeX(symbol: string, color: CursorColor): string {
    if (color === 'auto') {
        return `{${symbol}}`
    }
    return `{\\color{${color}}{${symbol}}}`
}

export function resolveCursorAnchor(
    snippet: MathSnippet,
    lineText: string,
    cursor: Point
): Point | undefined {
    if (!isPointInRange(snippet.range, cursor)) {
        return undefined
    }

    const bodyRange = getSnippetBodyRange(snippet)
    // Anchor any out-of-body cursor position to the nearest snippet body edge.
    if (comparePoint(cursor, bodyRange.start) < 0) {
        return bodyRange.start
    }
    if (comparePoint(cursor, bodyRange.end) > 0) {
        return bodyRange.end
    }

    const lineBodyRange = getLineBodyRange(bodyRange, cursor.line, lineText.length)
    const anchor = {
        line: cursor.line,
        character: resolveBodyAnchorInLine(lineText, lineBodyRange.start.character, lineBodyRange.end.character, cursor.character)
    }
    return anchor
}

function isPointInRange(range: TextRange, point: Point): boolean {
    return comparePoint(range.start, point) <= 0 && comparePoint(point, range.end) <= 0
}

function getSnippetBodyRange(snippet: MathSnippet): TextRange {
    const { opening, closing } = getSnippetDelimiters(snippet)
    return {
        start: {
            line: snippet.range.start.line,
            character: snippet.range.start.character + opening.length
        },
        end: {
            line: snippet.range.end.line,
            character: snippet.range.end.character - closing.length
        }
    }
}

function getSnippetDelimiters(snippet: MathSnippet): { opening: string, closing: string } {
    switch (snippet.envName) {
        case '$':
            return { opening: '$', closing: '$' }
        case '$$':
            return { opening: '$$', closing: '$$' }
        case '\\(':
            return { opening: '\\(', closing: '\\)' }
        case '\\[':
            return { opening: '\\[', closing: '\\]' }
        default:
            return {
                opening: `\\begin{${snippet.envName}}`,
                closing: `\\end{${snippet.envName}}`
            }
    }
}

/**
 * Returns the portion of a snippet body that lies on a single line.
 * This trims the opening delimiter on the first body line and the
 * closing delimiter on the last body line, including when both fall
 * on the same line.
 */
function getLineBodyRange(bodyRange: TextRange, line: number, lineLength: number): TextRange {
    return {
        start: {
            line,
            character: line === bodyRange.start.line ? bodyRange.start.character : 0
        },
        end: {
            line,
            character: line === bodyRange.end.line ? bodyRange.end.character : lineLength
        }
    }
}

function resolveBodyAnchorInLine(
    lineText: string,
    lineBodyStart: number,
    lineBodyEnd: number,
    cursorCharacter: number
): number {
    const tokens = scanUnsafeTokens(lineText, lineBodyStart, lineBodyEnd)
    for (const token of tokens) {
        // Snap positions that fall inside a left-only token back to its start.
        if (!token.allowRight && token.start < cursorCharacter && cursorCharacter <= token.end) {
            return token.start
        }

        // Snap positions inside a two-sided token to the nearest boundary.
        if (token.start < cursorCharacter && cursorCharacter < token.end) {
            return chooseNearestBoundary(token, cursorCharacter)
        }
    }

    // If no token claims this position, the cursor can stay where it is.
    return cursorCharacter
}

function scanUnsafeTokens(lineText: string, lineBodyStart: number, lineBodyEnd: number): UnsafeToken[] {
    const tokens: UnsafeToken[] = []
    let index = lineBodyStart
    while (index < lineBodyEnd) {
        const ch = lineText[index]
        if (ch === '\\') {
            const token = scanEscapeToken(lineText, index, lineBodyEnd)
            if (!token) {
                index += 1
                continue
            }
            tokens.push(token)
            index = Math.max(token.end, index + 1)
            continue
        }

        // Escaped percent signs are already consumed by the preceding backslash case.
        if (ch === '%') {
            tokens.push({
                start: index,
                end: lineBodyEnd,
                allowRight: false
            })
            break
        }

        index += 1
    }
    return tokens
}

function scanEscapeToken(lineText: string, start: number, lineBodyEnd: number): UnsafeToken | undefined {
    // A trailing lone backslash would consume the inserted cursor TeX to its right,
    // so keep the cursor anchored on the left side of that escape.
    if (start + 1 === lineBodyEnd) {
        return {
            start,
            end: lineBodyEnd,
            allowRight: false
        }
    }

    const next = lineText[start + 1]
    // Handle alphabetic commands like \frac, \sqrt, \begin, etc.
    if (isAsciiLetter(next)) {
        // Scan forward to collect all consecutive letters
        let end = start + 1
        while (end < lineBodyEnd && isAsciiLetter(lineText[end])) {
            end += 1
        }
        // Include optional trailing asterisk (e.g., \sqrt*)
        if (end < lineBodyEnd && lineText[end] === '*') {
            end += 1
        }

        const command = lineText.slice(start + 1, end)
        // Structural commands like \begin{...}, \end{...}, \label{...} have their
        // closing brace scanned to determine the full token extent
        if (command === 'begin' || command === 'end' || command === 'label') {
            return {
                start,
                end: scanCompoundCommandEnd(lineText, end, lineBodyEnd),
                allowRight: true
            }
        }

        // For other commands, check if cursor can be placed to the right.
        // Left-only commands like \frac{...} don't allow right placement.
        return {
            start,
            end,
            allowRight: !isLeftOnlyControlWord(command, lineText, end, lineBodyEnd)
        }
    }

    // Handle single-character escapes like \ , \\, \%, \$, etc.
    return {
        start,
        end: start + 2,
        allowRight: true
    }
}

/** Checks if a character is an ASCII letter (a-z or A-Z). */
function isAsciiLetter(ch: string | undefined): boolean {
    return ch !== undefined && /[a-zA-Z]/.test(ch)
}

function scanCompoundCommandEnd(lineText: string, commandEnd: number, lineBodyEnd: number): number {
    const braceStart = skipWhitespace(lineText, commandEnd, lineBodyEnd)
    if (braceStart >= lineBodyEnd || lineText[braceStart] !== '{') {
        return commandEnd
    }

    const braceEnd = lineText.indexOf('}', braceStart + 1)
    if (braceEnd !== -1 && braceEnd < lineBodyEnd) {
        return braceEnd + 1
    }
    return lineBodyEnd
}

function skipWhitespace(text: string, start: number, end: number): number {
    let index = start
    while (index < end && /\s/.test(text[index])) {
        index += 1
    }
    return index
}

function isLeftOnlyControlWord(command: string, lineText: string, commandEnd: number, lineBodyEnd: number): boolean {
    if (STRUCTURAL_CONTROL_WORDS.has(command)) {
        return true
    }

    const next = skipWhitespace(lineText, commandEnd, lineBodyEnd)
    return next < lineBodyEnd && (lineText[next] === '{' || lineText[next] === '[')
}

function chooseNearestBoundary(token: UnsafeToken, cursorCharacter: number): number {
    const leftDistance = cursorCharacter - token.start
    const rightDistance = token.end - cursorCharacter
    return leftDistance <= rightDistance ? token.start : token.end
}
