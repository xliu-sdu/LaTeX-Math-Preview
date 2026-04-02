import { beforeEach, describe, expect, it, vi } from 'vitest'

const terminate = vi.fn<() => Promise<void>>()
const proxy = vi.fn(() => Promise.resolve({
    loadExtensions: vi.fn(),
    validateMacros: vi.fn(),
    typeset: vi.fn()
}))
const pool = {
    proxy,
    terminate
}

vi.mock('workerpool', () => ({
    pool: vi.fn(() => pool)
}))

import { MathJaxService } from '../../render/mathjax'

describe('MathJaxService.dispose', () => {
    beforeEach(() => {
        proxy.mockClear()
        terminate.mockReset()
    })

    it('reuses the same termination promise for concurrent disposal', async () => {
        let resolveTerminate: (() => void) | undefined
        terminate.mockImplementation(() => new Promise<void>((resolve) => {
            resolveTerminate = resolve
        }))

        const service = new MathJaxService('/tmp/latex-math-preview-test')
        const first = service.dispose()
        const second = service.dispose()

        expect(terminate).toHaveBeenCalledTimes(1)
        resolveTerminate?.()

        await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined])
    })
})
