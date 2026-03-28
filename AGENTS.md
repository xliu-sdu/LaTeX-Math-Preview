# AGENTS.md

Repository guidance for coding agents working in this workspace.

## Purpose

This repository contains a VS Code extension named `latex-math-preview`.

It provides:
- a math preview panel for LaTeX and Markdown
- LaTeX-Workshop-inspired TeX math detection
- Markdown math detection for `$...$`, `$$...$$`, `\(...\)`, `\[...\]`
- MathJax rendering through a worker
- optional cursor rendering inside the preview

## Repo Layout

- `src/extension.ts`: activation and command registration
- `src/preview/mathPreviewPanel.ts`: panel lifecycle, serializer, refresh logic
- `src/extract/`: TeX and Markdown math extraction
- `src/render/`: preprocessing, cursor insertion, MathJax service
- `src/macros/collector.ts`: macro discovery from workspace/config
- `src/test/unit/`: Vitest unit tests
- `src/test/suite/`: VS Code integration tests
- `media/mathpreview.js`: webview script

## Working Rules

- Keep the extension namespace as `latex-math-preview.*`.
- Preserve the existing split between extraction, rendering, panel control, and tests.
- Use native webview resource URIs. Do not add an internal HTTP asset server unless explicitly required.
- Prefer matching LaTeX-Workshop behavior for TeX math handling unless the repo already documents a deliberate deviation.
- Markdown support should continue to ignore fenced code blocks and inline code spans.
- Keep unit tests pure where possible; avoid pulling `vscode` into unit-only modules.

## Commands

- Install dependencies: `npm install`
- Compile: `npm run compile`
- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:integration`
- Full test run: `npm test`

## Testing Notes

- Integration tests use `@vscode/test-electron`.
- The test runner is configured to use short `/tmp` paths for user/extensions dirs to avoid macOS socket path-length failures.
- If integration tests fail because the VS Code test host is missing, rerun with network access enabled.

## Change Guidance

- If you change extraction behavior, update both TeX/Markdown tests and any affected integration coverage.
- If you change panel update timing or cursor behavior, verify debounce behavior and selection/edit-triggered refreshes.
- If you change MathJax worker wiring, re-run compile plus both test suites.
- Avoid broad refactors unless they materially improve correctness or maintainability.
