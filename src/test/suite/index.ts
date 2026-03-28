import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import Mocha = require('mocha')

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'bdd',
        color: true
    })
    const testsRoot = path.resolve(__dirname)

    return new Promise((resolve, reject) => {
        collectTestFiles(testsRoot)
            .then((files) => {
                files.forEach((f) => mocha.addFile(f))
                mocha.run((failures: number) => {
                    if (failures > 0) {
                        reject(new Error(`${failures.toString()} tests failed.`))
                        return
                    }
                    resolve()
                })
            })
            .catch(reject)
    })
}

async function collectTestFiles(root: string): Promise<string[]> {
    const result: string[] = []
    async function walk(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                await walk(full)
            } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
                result.push(full)
            }
        }
    }
    await walk(root)
    return result
}
