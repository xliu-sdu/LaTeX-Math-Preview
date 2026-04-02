export type Point = {
    line: number
    character: number
}

export type TextRange = {
    start: Point
    end: Point
}

export type MathSnippet = {
    texString: string
    range: TextRange
    envName: string
    inlineDollar?: boolean
}

export function comparePoint(a: Point, b: Point): number {
    if (a.line !== b.line) {
        return a.line - b.line
    }
    return a.character - b.character
}

export function containsPoint(range: TextRange, point: Point): boolean {
    return comparePoint(range.start, point) <= 0 && comparePoint(point, range.end) < 0
}

export function isPointEqual(a: Point, b: Point): boolean {
    return a.line === b.line && a.character === b.character
}

export function pointFromOffset(text: string, offset: number): Point {
    let line = 0
    let col = 0
    let i = 0
    while (i < offset && i < text.length) {
        if (text[i] === '\n') {
            line += 1
            col = 0
        } else {
            col += 1
        }
        i += 1
    }
    return { line, character: col }
}

export function offsetFromPoint(text: string, point: Point): number {
    if (point.line === 0) {
        return point.character
    }
    let offset = 0
    let line = 0
    while (offset < text.length && line < point.line) {
        if (text[offset] === '\n') {
            line += 1
        }
        offset += 1
    }
    return offset + point.character
}
