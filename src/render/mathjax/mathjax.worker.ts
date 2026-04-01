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

/**
 * Reusable MathJax document used for all conversions in this worker. It starts
 * with the base TeX extensions and is rebuilt when callers request more.
 */
let htmlConverter = createConverter(baseExtensions)

function loadExtensions(extensions: string[]) {
    htmlConverter = createConverter(baseExtensions.concat(extensions))
}

/**
 * Converts a TeX math string into SVG markup inside the worker process.
 *
 * @param arg Prepared TeX source to render with MathJax.
 * @param opts Render options passed by the main process.
 * @param opts.scale Scale factor applied to the output SVG.
 * @param opts.color CSS color applied to the rendered math.
 * @returns SVG markup ready to embed in the preview.
 */
function typeset(arg: string, opts: { scale: number, color: string }): string {
    const convertOption = {
        display: true, // Render in display math mode rather than inline mode.
        em: 18, // Set 1em to 18px for MathJax's layout calculations.
        ex: 9, // Set the x-height to 9px so font-relative vertical sizing is stable.
        containerWidth: 80 * 18 // Assume an 80em layout width when MathJax computes line breaks.
    }
    const node = htmlConverter.convert(arg, convertOption) as LiteElement
    const css = `svg {font-size: ${100 * opts.scale}%;} * { color: ${opts.color} }`
    let svgHtml = adaptor.innerHTML(node)
    // Inject per-render CSS into the first <defs> block so the SVG uses caller-provided scale and color.
    svgHtml = svgHtml.replace(/<defs>/, `<defs><style>${css}</style>`)
    return svgHtml
}

const workers = { loadExtensions, typeset }

/**
 * Public shape of the worker API exposed through workerpool.
 * The main extension process uses this type to call the worker with checked
 * method names and argument types.
 */
export type IMathJaxWorker = {
    loadExtensions: (...args: Parameters<typeof loadExtensions>) => void
    typeset: (...args: Parameters<typeof typeset>) => string
}

workerpool.worker(workers)
