# LaTeX Math Preview

Math preview panel for LaTeX and Markdown in VS Code.

This extension renders the math expression at the cursor in a side preview panel. It supports both LaTeX documents and Markdown files, uses MathJax for rendering, and can optionally show a cursor marker inside the rendered output.

## Features

- Preview math from LaTeX and Markdown files in a dedicated panel.
- Follow the active editor and refresh as you edit.
- Use a shared math detector for LaTeX and Markdown files.
- Support `$...$`, `$$...$$`, `\(...\)`, `\[...\]`, and TeX math environments such as `\begin{align}...\end{align}`.
- Support user-configured MathJax packages and macros through extension settings.
- Optionally render a cursor marker inside the preview.

## Installation

This extension is distributed through GitHub Releases as a `.vsix` package.

### Install from GitHub Releases

1. Open the repository's **Releases** page.
2. Download the latest `latex-math-preview-<version>.vsix` asset.
3. Install it with one of the following methods.

Command line:

```bash
code --install-extension latex-math-preview-<version>.vsix
```

VS Code UI:

1. Open the Extensions view.
2. Select the `...` menu in the top-right corner.
3. Choose `Install from VSIX...`.
4. Select the downloaded `.vsix` file.

## Usage

Open a LaTeX or Markdown file, place the cursor inside a math expression, and run:

- `LaTeX Math Preview: Open Math Preview Panel`
- `LaTeX Math Preview: Toggle Math Preview Panel`
- `LaTeX Math Preview: Close Math Preview Panel`

Default keybinding:

- `Ctrl+Alt+M` on Windows and Linux
- `Cmd+Alt+M` on macOS

## Supported Math Input

### LaTeX

LaTeX files use the shared math detector.

### Markdown

Markdown files use the same detector and support:

- Inline math with `$...$`
- Display math with `$$...$$`
- Inline math with `\(...\)`
- Display math with `\[...\]`
- TeX math environments such as `\begin{align}...\end{align}`

## Settings

The extension contributes these settings under the `latex-math-preview` namespace:

- `latex-math-preview.mathPreviewPanel.cursor.enabled`
  Render a cursor marker directly in the preview panel.
- `latex-math-preview.mathPreviewPanel.cursor.symbol`
  Cursor symbol inserted into rendered TeX.
- `latex-math-preview.mathPreviewPanel.cursor.color`
  Cursor color used in rendered preview content.
- `latex-math-preview.mathPreviewPanel.editorGroup`
  Choose where the preview panel opens: `current`, `left`, `right`, `above`, or `below`.
- `latex-math-preview.mathPreviewPanel.maxLines`
  Maximum number of lines to scan upward when resolving surrounding math environments.
- `latex-math-preview.mathPreviewPanel.scale`
  Scale factor for rendered math in the preview panel.
- `latex-math-preview.mathJax.packages`
  Additional MathJax TeX packages to enable for rendering.
- `latex-math-preview.mathJax.macros`
  Raw TeX macro definitions supported by MathJax.

Example VS Code `settings.json`:

```json
{
  "latex-math-preview.mathPreviewPanel.cursor.enabled": true,
  "latex-math-preview.mathPreviewPanel.cursor.symbol": "\\!{|}\\!",
  "latex-math-preview.mathPreviewPanel.selection.startSymbol": "\\!\\{\\!",
	"latex-math-preview.mathPreviewPanel.selection.endSymbol": "\\!\\}\\!",
  "latex-math-preview.mathPreviewPanel.cursor.color": "magenta",
  "latex-math-preview.mathPreviewPanel.editorGroup": "below",
  "latex-math-preview.mathPreviewPanel.maxLines": 20,
  "latex-math-preview.mathPreviewPanel.scale": 1.5,
  "latex-math-preview.mathJax.packages": ["physics"],
  "latex-math-preview.mathJax.macros": "\\newcommand{\\R}{\\mathbb{R}}\\n\\DeclareMathOperator{\\sgn}{sgn}"
}
```

## Development

Install dependencies and compile:

```bash
npm install
npm run compile
```

Run tests:

```bash
npm run test:unit
npm run test:integration
```

Run the extension in an Extension Development Host from VS Code using the `Run Extension` launch configuration.

## Packaging

Build the installable `.vsix` package:

```bash
npm install
npm run package:vsix
```

Attach the generated `.vsix` file to a GitHub Release so users can install it directly.

## Bundling Notes

- The extension host entrypoint is bundled with `esbuild` to `dist/extension.js`.
- The MathJax worker is bundled separately to `dist/render/mathjax/mathjax.worker.js` because `workerpool` needs a real worker script on disk.
- `vscode` remains external; runtime dependencies such as `mathjax-full` and `workerpool` are bundled into the emitted files.
- Packaging excludes `node_modules`, so a symlinked `node_modules` does not need to be copied into the VSIX.

## License

MIT
