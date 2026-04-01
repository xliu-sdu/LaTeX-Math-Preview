import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, context } from 'esbuild'

const watch = process.argv.includes('--watch')
const root = path.dirname(fileURLToPath(import.meta.url))

const shared = {
    absWorkingDir: root,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    sourcemap: true,
    sourcesContent: false,
    target: 'node20',
    tsconfig: path.join(root, 'tsconfig.json')
}

const extensionBuild = {
    ...shared,
    entryPoints: ['src/extension.ts'],
    external: ['vscode'],
    outfile: 'dist/extension.js'
}

const workerBuild = {
    ...shared,
    entryPoints: ['src/render/mathjax/mathjax.worker.ts'],
    outfile: 'dist/render/mathjax/mathjax.worker.js'
}

async function main() {
    if (watch) {
        const [extensionCtx, workerCtx] = await Promise.all([context(extensionBuild), context(workerBuild)])
        await Promise.all([extensionCtx.watch(), workerCtx.watch()])
        console.log('Watching esbuild bundles for latex-math-preview...')
        return
    }

    await Promise.all([build(extensionBuild), build(workerBuild)])
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
