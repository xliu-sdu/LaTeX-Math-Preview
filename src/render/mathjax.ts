import * as path from 'node:path'
import * as workerpool from 'workerpool'
import type { MathSnippet } from '../text-model'
import { mathjaxify, stripTeX, svgToDataUrl } from './preprocess'
import type { IMathJaxWorker } from './mathjax/mathjax.worker'

export class MathJaxService {
    private readonly pool: workerpool.Pool
    private readonly proxy: Promise<any>

    constructor(extensionRoot: string) {
        const workerPath = path.join(extensionRoot, 'out', 'render', 'mathjax', 'mathjax.worker.js')
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

    async dispose() {
        await this.pool.terminate(true)
    }
}

export async function texToSvg(
    service: MathJaxService,
    snippet: MathSnippet,
    macros: string,
    scale: number,
    color: string
): Promise<{ svgDataUrl: string, macros: string }> {
    const texString = mathjaxify(snippet.texString, snippet.envName)
    const stripped = macros + stripTeX(texString, macros)
    try {
        const svg = await service.typeset(stripped, { scale, color })
        return { svgDataUrl: svgToDataUrl(svg), macros }
    } catch (error) {
        if (macros) {
            console.warn(`MathJax failed with macros; retrying without macro prefix for snippet ${snippet.envName}.`, error)
            const svg = await service.typeset(texString, { scale, color })
            return { svgDataUrl: svgToDataUrl(svg), macros }
        }
        throw error
    }
}
