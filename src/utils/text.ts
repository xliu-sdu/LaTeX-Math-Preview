import type { Point, TextRange } from '../text-model'

export function splitLines(text: string): string[] {
    return text.split(/\r?\n/)
}

export function rangeToText(text: string, range: TextRange): string {
    const lines = splitLines(text)
    if (range.start.line === range.end.line) {
        return lines[range.start.line].slice(range.start.character, range.end.character)
    }
    const parts: string[] = []
    parts.push(lines[range.start.line].slice(range.start.character))
    for (let line = range.start.line + 1; line < range.end.line; line += 1) {
        parts.push(lines[line])
    }
    parts.push(lines[range.end.line].slice(0, range.end.character))
    return parts.join('\n')
}

export function makeRange(start: Point, end: Point): TextRange {
    return { start, end }
}

export function stripComments(line: string): string {
    const reg = /(^|[^\\]|(?:(?<!\\)(?:\\\\)+))%(?![2-9A-F][0-9A-F]).*$/gm
    return line.replace(reg, '$1')
}

export function stripCommentsAndVerbatimLine(line: string): string {
    let content = stripComments(line)
    content = content.replace(/\\verb\*?([^a-zA-Z0-9]).*?\1/g, (m) => ' '.repeat(m.length))
    return content
}

