import * as workerpool from 'workerpool'
import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element.js'
import type { MathDocument } from 'mathjax-full/js/core/MathDocument.js'
import type { LiteDocument } from 'mathjax-full/js/adaptors/lite/Document.js'
import type { LiteText } from 'mathjax-full/js/adaptors/lite/Text.js'
import 'mathjax-full/js/input/tex/AllPackages.js'

const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)

const baseExtensions: string[] = ['ams', 'base', 'boldsymbol', 'color', 'configmacros', 'mathtools', 'newcommand', 'noerrors', 'noundefined']

function createConverter(extensions: string[]) {
    const macrosOption = {
        bm: ['\\boldsymbol{#1}', 1]
    }
    const texOption = {
        packages: extensions,
        macros: macrosOption,
        formatError: (_jax: unknown, error: { message: string }) => {
            throw new Error(error.message)
        }
    }
    const texInput = new TeX<LiteElement, LiteText, LiteDocument>(texOption)
    const svgOption = { fontCache: 'local' }
    const svgOutput = new SVG<LiteElement, LiteText, LiteDocument>(svgOption)
    return mathjax.document('', { InputJax: texInput, OutputJax: svgOutput }) as MathDocument<LiteElement, LiteText, LiteDocument>
}

let html = createConverter(baseExtensions)

function loadExtensions(extensions: string[]) {
    html = createConverter(baseExtensions.concat(extensions))
}

function typeset(arg: string, opts: { scale: number, color: string }): string {
    const convertOption = {
        display: true,
        em: 18,
        ex: 9,
        containerWidth: 80 * 18
    }
    const node = html.convert(arg, convertOption) as LiteElement
    const css = `svg {font-size: ${100 * opts.scale}%;} * { color: ${opts.color} }`
    let svgHtml = adaptor.innerHTML(node)
    svgHtml = svgHtml.replace(/<defs>/, `<defs><style>${css}</style>`)
    return svgHtml
}

const workers = { loadExtensions, typeset }

export type IMathJaxWorker = {
    loadExtensions: (...args: Parameters<typeof loadExtensions>) => void
    typeset: (...args: Parameters<typeof typeset>) => string
}

workerpool.worker(workers)
