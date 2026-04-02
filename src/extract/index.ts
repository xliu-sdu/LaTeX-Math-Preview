import type { MathSnippet, Point } from '../text-model'
import { findSharedMathSnippet } from './finder'

export function findMathSnippet(text: string, position: Point, maxLines: number): MathSnippet | undefined {
    return findSharedMathSnippet(text, position, maxLines)
}

export function isSupportedMathLanguage(languageId: string): boolean {
    return isMarkdownLanguage(languageId) || isTexLanguage(languageId)
}

export function isTexLanguage(languageId: string): boolean {
    return ['latex', 'context', 'latex-expl3', 'pweave', 'jlweave', 'rsweave', 'doctex', 'tex'].includes(languageId)
}

export function isMarkdownLanguage(languageId: string): boolean {
    return ['markdown', 'mdx', 'quarto'].includes(languageId)
}
