import * as path from 'node:path'
import { runTests } from '@vscode/test-electron'

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../')
        const extensionTestsPath = path.resolve(__dirname, './suite/index')
        const userDataDir = path.join('/tmp', 'vscode-lmp-user')
        const extensionsDir = path.join('/tmp', 'vscode-lmp-ext')
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                extensionDevelopmentPath,
                '--disable-extensions',
                `--user-data-dir=${userDataDir}`,
                `--extensions-dir=${extensionsDir}`
            ]
        })
    } catch (err) {
        console.error('Failed to run integration tests')
        console.error(err)
        process.exit(1)
    }
}

void main()
