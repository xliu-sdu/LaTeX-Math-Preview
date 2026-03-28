import type { MathSnippet, Point, SourceKind } from '../text-model'
import { findMarkdownMath } from './markdown'
import { findTexMath } from './tex'

export function findMathSnippet(text: string, position: Point, sourceKind: SourceKind, maxLines: number): MathSnippet | undefined {
    if (sourceKind === 'markdown') {
        return findMarkdownMath(text, position, maxLines)
    }
    return findTexMath(text, position, maxLines)
}

export function sourceKindFromLanguageId(languageId: string): SourceKind | undefined {
    if (isMarkdownLanguage(languageId)) {
        return 'markdown'
    }
    if (isTexLanguage(languageId)) {
        return 'tex'
    }
    return undefined
}

export function isTexLanguage(languageId: string): boolean {
    return ['latex', 'context', 'latex-expl3', 'pweave', 'jlweave', 'rsweave', 'doctex', 'tex'].includes(languageId)
}

export function isMarkdownLanguage(languageId: string): boolean {
    return ['markdown', 'mdx', 'quarto'].includes(languageId)
}

