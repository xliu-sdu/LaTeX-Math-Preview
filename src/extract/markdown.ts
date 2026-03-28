import type { MathSnippet, Point } from '../text-model'
import { containsPoint } from '../text-model'
import { makeRange, rangeToText, splitLines } from '../utils/text'

export function findMarkdownMath(text: string, position: Point, maxLines: number): MathSnippet | undefined {
    const masked = maskMarkdownCode(text)
    const rawLines = splitLines(text)
    const maskedLines = splitLines(masked)

    const inline = findInlineMath(rawLines, maskedLines, position)
    if (inline) {
        return inline
    }

    const dollarBlock = findDelimitedBlock(text, maskedLines, position, maxLines, '$$', '$$')
    if (dollarBlock) {
        return {
            ...dollarBlock,
            envName: '$$',
            sourceKind: 'markdown'
        }
    }

    const bracketBlock = findDelimitedBlock(text, maskedLines, position, maxLines, '\\[', '\\]')
    if (bracketBlock) {
        return {
            ...bracketBlock,
            envName: '\\[',
            sourceKind: 'markdown'
        }
    }

    return undefined
}

function findInlineMath(rawLines: string[], maskedLines: string[], position: Point): MathSnippet | undefined {
    const currentMasked = maskedLines[position.line] ?? ''
    const currentRaw = rawLines[position.line] ?? ''
    const regex = /(?<!\$|\\)\$(?!\$)(?:\\.|[^\\])+?\$|\\\(.+?\\\)/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(currentMasked)) !== null) {
        const matchStart = m.index
        const matchEndExclusive = m.index + m[0].length
        if (matchStart <= position.character && position.character <= matchEndExclusive) {
            const range = makeRange(
                { line: position.line, character: matchStart },
                { line: position.line, character: matchEndExclusive }
            )
            return {
                texString: currentRaw.slice(matchStart, matchEndExclusive),
                range,
                envName: m[0].startsWith('\\(') ? '\\(' : '$',
                sourceKind: 'markdown',
                inlineDollar: m[0].startsWith('$')
            }
        }
    }
    return undefined
}

function findDelimitedBlock(
    fullText: string,
    maskedLines: string[],
    position: Point,
    maxLines: number,
    beginDelim: string,
    endDelim: string
): Omit<MathSnippet, 'envName' | 'sourceKind'> | undefined {
    const begin = findBeginDelimiter(maskedLines, position, beginDelim, maxLines)
    if (!begin) {
        return undefined
    }
    const end = findEndDelimiter(maskedLines, begin, endDelim)
    if (!end) {
        return undefined
    }
    const range = makeRange(begin, end)
    if (!containsPoint(range, position) && !isEndBoundary(position, range.end)) {
        return undefined
    }
    return {
        texString: rangeToText(fullText, range),
        range
    }
}

function findBeginDelimiter(lines: string[], position: Point, delim: string, maxLines: number): Point | undefined {
    const escaped = escapeRegExp(delim)
    const regex = new RegExp(escaped, 'g')
    const firstLine = lines[position.line] ?? ''
    const currentSlice = firstLine.slice(0, position.character + 1)
    const sameLine = findLastMatch(currentSlice, regex)
    if (sameLine?.index !== undefined) {
        return { line: position.line, character: sameLine.index }
    }
    let line = position.line - 1
    let i = 0
    while (line >= 0 && i < maxLines) {
        const m = findLastMatch(lines[line] ?? '', regex)
        if (m?.index !== undefined) {
            return { line, character: m.index }
        }
        line -= 1
        i += 1
    }
    return undefined
}

function findEndDelimiter(lines: string[], begin: Point, delim: string): Point | undefined {
    const escaped = escapeRegExp(delim)
    const regex = new RegExp(escaped)
    const line = lines[begin.line] ?? ''
    const from = begin.character + delim.length
    const sameLine = regex.exec(line.slice(from))
    if (sameLine && sameLine.index !== undefined) {
        return {
            line: begin.line,
            character: from + sameLine.index + delim.length
        }
    }
    for (let lineNum = begin.line + 1; lineNum < lines.length; lineNum += 1) {
        const m = regex.exec(lines[lineNum] ?? '')
        if (m && m.index !== undefined) {
            return {
                line: lineNum,
                character: m.index + delim.length
            }
        }
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

function maskMarkdownCode(text: string): string {
    const lines = splitLines(text)
    const output: string[] = []
    let inFence = false
    let fenceChar = ''
    let fenceLength = 0
    for (const line of lines) {
        const fence = line.match(/^\s*(```+|~~~+)/)
        if (!inFence && fence) {
            inFence = true
            fenceChar = fence[1][0]
            fenceLength = fence[1].length
            output.push(' '.repeat(line.length))
            continue
        }
        if (inFence) {
            const closePattern = new RegExp(`^\\s*${escapeRegExp(fenceChar)}{${fenceLength},}`)
            if (closePattern.test(line)) {
                inFence = false
            }
            output.push(' '.repeat(line.length))
            continue
        }
        output.push(maskInlineCode(line))
    }
    return output.join('\n')
}

function maskInlineCode(line: string): string {
    let out = ''
    let i = 0
    let inCode = false
    let delimLength = 0
    while (i < line.length) {
        if (line[i] === '`') {
            let j = i
            while (j < line.length && line[j] === '`') {
                j += 1
            }
            const count = j - i
            if (!inCode) {
                inCode = true
                delimLength = count
                out += ' '.repeat(count)
                i = j
                continue
            }
            if (count === delimLength) {
                inCode = false
                delimLength = 0
                out += ' '.repeat(count)
                i = j
                continue
            }
        }
        out += inCode ? ' ' : line[i]
        i += 1
    }
    return out
}

function isEndBoundary(point: Point, end: Point): boolean {
    return point.line === end.line && point.character === end.character
}

function escapeRegExp(str: string): string {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}
