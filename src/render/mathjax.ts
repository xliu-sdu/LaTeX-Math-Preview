import * as path from 'node:path'
import * as workerpool from 'workerpool'
import type { MathSnippet } from '../text-model'
import { mathjaxify, stripMathDelimiters, svgToDataUrl } from './preprocess'
import type { IMathJaxWorker } from './mathjax/mathjax.worker'

/** Thin wrapper around `IMathJaxWorker` that adds proxy setup, timeouts, and lifecycle management. */
export class MathJaxService {
    private readonly pool: workerpool.Pool
    private readonly proxy: Promise<any>
    private disposePromise: Promise<void> | undefined

    constructor(extensionRoot: string) {
        const workerPath = path.join(extensionRoot, 'dist', 'render', 'mathjax', 'mathjax.worker.js')
        this.pool = workerpool.pool(workerPath, { minWorkers: 1, maxWorkers: 1, workerType: 'process' })
        this.proxy = this.pool.proxy<IMathJaxWorker>()
    }

    async initialize(extensions: string[] = []) {
        await (await this.proxy).loadExtensions(extensions)
    }

    async typeset(arg: string, opts: { scale: number, color: string }): Promise<string> {
        const pending = (await this.proxy).typeset(arg, opts) as unknown as { timeout: (ms: number) => Promise<string> }
        return pending.timeout(3000)
    }

    async validateMacros(arg: string): Promise<void> {
        const pending = (await this.proxy).validateMacros(arg) as unknown as { timeout: (ms: number) => Promise<void> }
        await pending.timeout(3000)
    }

    async dispose() {
        if (!this.disposePromise) {
            this.disposePromise = this.pool.terminate(true).then(() => undefined)
        }
        await this.disposePromise
    }
}

export async function texToSvg(
    service: MathJaxService,
    snippet: MathSnippet,
    macros: string,
    scale: number,
    color: string
): Promise<{ svgDataUrl: string }> {
    const texString = mathjaxify(snippet.texString, snippet.envName)
    // Normalize delimiter-based snippets once so configured macros are prefixed to a canonical MathJax input.
    const strippedTexString = stripMathDelimiters(texString, snippet.envName)
    const input = macros ? macros + strippedTexString : strippedTexString
    const svg = await service.typeset(input, { scale, color })
    return { svgDataUrl: svgToDataUrl(svg) }
}
