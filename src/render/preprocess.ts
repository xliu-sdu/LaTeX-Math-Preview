import { stripComments } from '../utils/text'

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

export function svgToDataUrl(xml: string): string {
    const svg64 = Buffer.from(unescape(encodeURIComponent(xml)), 'binary').toString('base64')
    return `data:image/svg+xml;base64,${svg64}`
}

