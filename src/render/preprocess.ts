import { stripComments } from '../utils/text'

const SVG_VIEWBOX_MARGIN_EX = 0.5

export function mathjaxify(tex: string, envName: string, options: { stripLabel: boolean } = { stripLabel: true }): string {
    let content = stripComments(tex)
    if (options.stripLabel) {
        content = content.replace(/\\label\{.*?\}/g, '')
    }
    if (envName.match(/^(aligned|alignedat|array|Bmatrix|bmatrix|cases|CD|gathered|matrix|pmatrix|smallmatrix|split|subarray|Vmatrix|vmatrix)$/)) {
        content = `\\begin{equation}${content}\\end{equation}`
    }
    if (envName.match(/^subeqnarray\*?$/)) {
        content = content.replace(/\\(begin|end)\{subeqnarray\*?\}/g, '\\$1{eqnarray}')
    }
    content = content.replace(/\\llbracket(?!\w)/g, '\\left[\\!\\left[')
        .replace(/\\rrbracket(?!\w)/g, '\\right]\\!\\right]')
    return content
}

export function stripTeX(tex: string, macros: string): string {
    if (tex.startsWith('$$') && tex.endsWith('$$')) {
        tex = tex.slice(2, tex.length - 2)
    } else if (tex.startsWith('$') && tex.endsWith('$')) {
        tex = tex.slice(1, tex.length - 1)
    } else if (tex.startsWith('\\(') && tex.endsWith('\\)')) {
        tex = tex.slice(2, tex.length - 2)
    } else if (tex.startsWith('\\[') && tex.endsWith('\\]')) {
        tex = tex.slice(2, tex.length - 2)
    }
    for (const match of macros.matchAll(/\\newcommand\{(.*?)\}/g)) {
        if (match[1]) {
            tex = tex.replaceAll(`${match[1]}*`, match[1])
        }
    }
    return tex
}

export function addSvgViewBoxMargin(xml: string): string {
    const viewBoxMatch = xml.match(/\bviewBox="([^"]+)"/)
    const widthMatch = xml.match(/\bwidth="([0-9]*\.?[0-9]+)([a-z%]*)"/)
    const heightMatch = xml.match(/\bheight="([0-9]*\.?[0-9]+)([a-z%]*)"/)
    if (!viewBoxMatch || !widthMatch || !heightMatch) {
        return xml
    }

    const [x, y, width, height] = viewBoxMatch[1].trim().split(/\s+/).map(Number)
    const widthValue = Number(widthMatch[1])
    const heightValue = Number(heightMatch[1])
    const widthUnit = widthMatch[2]
    const heightUnit = heightMatch[2]
    if ([x, y, width, height, widthValue, heightValue].some((value) => Number.isNaN(value)) || width <= 0 || height <= 0 || widthValue <= 0 || heightValue <= 0) {
        return xml
    }

    const xMargin = SVG_VIEWBOX_MARGIN_EX * (width / widthValue)
    const yMargin = SVG_VIEWBOX_MARGIN_EX * (height / heightValue)
    const nextViewBox = `${formatSvgNumber(x - xMargin)} ${formatSvgNumber(y - yMargin)} ${formatSvgNumber(width + (2 * xMargin))} ${formatSvgNumber(height + (2 * yMargin))}`
    const nextWidth = `${formatSvgNumber(widthValue + (2 * SVG_VIEWBOX_MARGIN_EX))}${widthUnit}`
    const nextHeight = `${formatSvgNumber(heightValue + (2 * SVG_VIEWBOX_MARGIN_EX))}${heightUnit}`
    return xml
        .replace(viewBoxMatch[0], `viewBox="${nextViewBox}"`)
        .replace(widthMatch[0], `width="${nextWidth}"`)
        .replace(heightMatch[0], `height="${nextHeight}"`)
}

export function svgToDataUrl(xml: string): string {
    const svg64 = Buffer.from(addSvgViewBoxMargin(xml), 'utf8').toString('base64')
    return `data:image/svg+xml;base64,${svg64}`
}

function formatSvgNumber(value: number): string {
    return Number.parseFloat(value.toFixed(3)).toString()
}
