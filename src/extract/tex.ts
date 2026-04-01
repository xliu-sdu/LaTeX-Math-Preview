import type { MathSnippet, Point } from '../text-model'
import { containsPoint } from '../text-model'
import { makeRange, rangeToText, splitLines, stripCommentsAndVerbatimLine } from '../utils/text'

const ENV_NAMES = [
    'align', 'align\\*', 'alignat', 'alignat\\*', 'aligned', 'alignedat', 'array', 'Bmatrix', 'bmatrix', 'cases', 'CD', 'eqnarray', 'eqnarray\\*', 'equation', 'equation\\*', 'flalign', 'flalign\\*', 'gather', 'gather\\*', 'gathered', 'matrix', 'multline', 'multline\\*', 'pmatrix', 'smallmatrix', 'split', 'subarray', 'subeqnarray', 'subeqnarray\\*', 'Vmatrix', 'vmatrix'
]

const MATH_ENV_NAMES = [
    'align', 'align\\*', 'alignat', 'alignat\\*', 'eqnarray', 'eqnarray\\*', 'equation', 'equation\\*', 'flalign', 'flalign\\*', 'gather', 'gather\\*', 'multline', 'multline\\*', 'subeqnarray', 'subeqnarray\\*'
]

export function findTexMath(text: string, position: Point, maxLines: number): MathSnippet | undefined {
    const lines = splitLines(text)
    const envNamePatMathMode = new RegExp(`^(${MATH_ENV_NAMES.join('|')})$`)
    const envBeginPatMathMode = new RegExp(`\\\\\\[|\\\\\\(|\\\\begin\\{(${MATH_ENV_NAMES.join('|')})\\}`)

    let snippet = findTeX(lines, text, position)
    if (snippet && (snippet.envName === '$' || envNamePatMathMode.test(snippet.envName))) {
        return snippet
    }

    const beginPos = findBeginPair(lines, envBeginPatMathMode, position, maxLines)
    if (!beginPos) {
        return undefined
    }
    snippet = findTeX(lines, text, beginPos)
    if (!snippet) {
        return undefined
    }
    if (containsPoint(snippet.range, position)) {
        return snippet
    }
    return undefined
}

function findTeX(lines: string[], fullText: string, position: Point): MathSnippet | undefined {
    const envBeginPat = new RegExp(`\\\\begin\\{(${ENV_NAMES.join('|')})\\}`, 'g')
    const line = lines[position.line] ?? ''
    let match: RegExpExecArray | null
    while ((match = envBeginPat.exec(line)) !== null) {
        const start = match.index
        const end = start + match[0].length
        if (start <= position.character && position.character <= end) {
            return findMathEnvironment(lines, fullText, match[1], { line: position.line, character: start })
        }
    }

    const parenBeginPat = /(\\\[|\\\(|\$\$)/g
    while ((match = parenBeginPat.exec(line)) !== null) {
        const start = match.index
        const end = start + match[0].length
        if (start <= position.character && position.character <= end) {
            return findDelimitedMath(lines, fullText, match[1], { line: position.line, character: start })
        }
    }

    return findInlineMath(lines, fullText, position)
}

function findMathEnvironment(lines: string[], fullText: string, envName: string, startPos: Point): MathSnippet | undefined {
    const pattern = new RegExp(`\\\\end\\{${escapeRegExp(envName)}\\}`)
    const startPos1 = { line: startPos.line, character: startPos.character + envName.length + '\\begin{}'.length }
    const endPos = findEndPair(lines, pattern, startPos1)
    if (!endPos) {
        return undefined
    }
    const range = makeRange(startPos, endPos)
    return {
        texString: rangeToText(fullText, range),
        range,
        envName,
        sourceKind: 'tex'
    }
}

function findDelimitedMath(lines: string[], fullText: string, envName: string, startPos: Point): MathSnippet | undefined {
    const pattern = envName === '\\[' ? /\\\]/ : envName === '\\(' ? /\\\)/ : /\$\$/
    const startPos1 = { line: startPos.line, character: startPos.character + envName.length }
    const endPos = findEndPair(lines, pattern, startPos1)
    if (!endPos) {
        return undefined
    }
    const range = makeRange(startPos, endPos)
    return {
        texString: rangeToText(fullText, range),
        range,
        envName,
        sourceKind: 'tex'
    }
}

function findInlineMath(lines: string[], fullText: string, position: Point): MathSnippet | undefined {
    const currentLine = lines[position.line] ?? ''
    const regex = /(?<!\$|\\)\$(?!\$)(?:\\.|[^\\])+?\$|\\\(.+?\\\)/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(currentLine)) !== null) {
        const matchStart = m.index
        const matchEndExclusive = m.index + m[0].length
        if (matchStart <= position.character && position.character <= matchEndExclusive) {
            const range = makeRange(
                { line: position.line, character: matchStart },
                { line: position.line, character: matchEndExclusive }
            )
            return {
                texString: rangeToText(fullText, range),
                range,
                envName: '$',
                sourceKind: 'tex',
                inlineDollar: m[0].startsWith('$')
            }
        }
    }
    return undefined
}

function findEndPair(lines: string[], endPat: RegExp, startPos1: Point): Point | undefined {
    const currentLine = (lines[startPos1.line] ?? '').slice(startPos1.character)
    const lineContent = stripCommentsAndVerbatimLine(currentLine)
    let m = lineContent.match(endPat)
    if (m && m.index !== undefined) {
        return {
            line: startPos1.line,
            character: startPos1.character + m.index + m[0].length
        }
    }
    let lineNum = startPos1.line + 1
    while (lineNum < lines.length) {
        m = stripCommentsAndVerbatimLine(lines[lineNum]).match(endPat)
        if (m && m.index !== undefined) {
            return {
                line: lineNum,
                character: m.index + m[0].length
            }
        }
        lineNum += 1
    }
    return undefined
}

function findBeginPair(lines: string[], beginPat: RegExp, endPos1: Point, limit: number): Point | undefined {
    const currentLine = (lines[endPos1.line] ?? '').slice(0, endPos1.character)
    let line = stripCommentsAndVerbatimLine(currentLine)
    let m = findLastMatch(line, beginPat)
    if (m?.index !== undefined) {
        return {
            line: endPos1.line,
            character: m.index
        }
    }
    let lineNum = endPos1.line - 1
    let i = 0
    while (lineNum >= 0 && i < limit) {
        line = stripCommentsAndVerbatimLine(lines[lineNum] ?? '')
        m = findLastMatch(line, beginPat)
        if (m?.index !== undefined) {
            return {
                line: lineNum,
                character: m.index
            }
        }
        lineNum -= 1
        i += 1
    }
    return undefined
}

function findLastMatch(text: string, pat: RegExp): RegExpExecArray | undefined {
    const global = new RegExp(pat.source, pat.flags.includes('g') ? pat.flags : `${pat.flags}g`)
    let last: RegExpExecArray | undefined
    let m: RegExpExecArray | null
    while ((m = global.exec(text)) !== null) {
        last = m
    }
    return last
}

function escapeRegExp(str: string): string {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}
