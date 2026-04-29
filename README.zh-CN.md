# LaTeX Math Preview

[English](README.md) | [简体中文](README.zh-CN.md)

VS Code 中 LaTeX 和 Markdown 的数学公式预览面板。

此插件在侧边预览面板中渲染光标处的数学公式。它支持 LaTeX 文档和 Markdown 文件，使用 MathJax 进行渲染，并可选择在渲染的输出中显示内置光标标记。

## 特性

- 分屏独立面板预览 LaTeX 和 Markdown 文件中的数学公式。
- 跟随活动编辑器并在您编辑时实时刷新。
- 对 LaTeX 和 Markdown 文件使用共享的数学公式范围检测器。
- 支持 `$...$`, `$$...$$`, `\(...\)`, `\[...\]` 以及 TeX 数学环境（如 `\begin{align}...\end{align}`）。
- 通过插件设置支持用户自定义配置的 MathJax 宏包和宏。
- 可选择在预览中直接渲染光标标记。

## 安装

此插件作为 `.vsix` 包通过 GitHub Releases 分发。

### 从 GitHub Releases 安装

1. 打开此仓库的 **Releases** 页面。
2. 下载最新的 `latex-math-preview-<version>.vsix` 资产文件。
3. 使用以下方法之一进行安装。

命令行：

```bash
code --install-extension latex-math-preview-<version>.vsix
```

VS Code 界面：

1. 打开插件（Extensions）视图。
2. 点击右上角的 `...` 菜单。
3. 选择 `从 VSIX 安装...`（`Install from VSIX...`）。
4. 选择下载好的 `.vsix` 文件。

## 使用说明

打开一个 LaTeX 或 Markdown 文件，将光标放置在数学公式内部，然后运行以下命令：

- `LaTeX Math Preview: Open Math Preview Panel` (打开数学预览面板)
- `LaTeX Math Preview: Toggle Math Preview Panel` (切换数学预览面板)
- `LaTeX Math Preview: Close Math Preview Panel` (关闭数学预览面板)

默认快捷键：

- Windows 和 Linux 上为 `Ctrl+Alt+M`
- macOS 上为 `Cmd+Alt+M`

## 支持的数学输入

### LaTeX

LaTeX 文件使用共享的数学公式检测器。

### Markdown

Markdown 文件使用同样的检测器并支持：

- 内联公式 `$...$`
- 块级公式 `$$...$$`
- 内联公式 `\(...\)`
- 块级公式 `\[...\]`
- TeX 数学环境，如 `\begin{align}...\end{align}`

## 设置项 (Settings)

本插件在 `latex-math-preview` 命名空间下贡献了以下设置项：

- `latex-math-preview.mathPreviewPanel.cursor.enabled`
  是否直接在预览面板中渲染光标指示标记。
- `latex-math-preview.mathPreviewPanel.cursor.symbol`
  插入到待渲染 TeX 处的用于表示光标的符号序列。
- `latex-math-preview.mathPreviewPanel.selection.startSymbol`
  插入到待渲染 TeX 处的用于表示选区起点的符号序列。
- `latex-math-preview.mathPreviewPanel.selection.endSymbol`
  插入到待渲染 TeX 处的用于表示选区终点的符号序列。
- `latex-math-preview.mathPreviewPanel.cursor.color`
  渲染的预览内容中所使用的光标/选区颜色。
- `latex-math-preview.mathPreviewPanel.editorGroup`
  选择打开预览面板的位置：`current`、`left`、`right`、`above` 或 `below`。
- `latex-math-preview.mathPreviewPanel.maxLines`
  解析周围数学环境时向上扫描的最大行数。
- `latex-math-preview.mathPreviewPanel.scale`
  预览面板中渲染数学公式的缩放倍率。
- `latex-math-preview.mathJax.packages`
  用以开启渲染的额外 MathJax TeX 扩展宏包。
- `latex-math-preview.mathJax.macros`
  MathJax 支持的原始 TeX 宏定义。

VS Code `settings.json` 示例：

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

## 开发

安装依赖并编译：

```bash
npm install
npm run compile
```

运行测试：

```bash
npm run test:unit
npm run test:integration
```

通过 VS Code 的 `Run Extension` 启动配置，可以在扩展开发宿主环境中运行该插件。

## 打包发布

构建可供安装的 `.vsix` 包：

```bash
npm install
npm run package:vsix
```

把生成的 `.vsix` 文件附在 GitHub Release 后面，用户即可直接下载安装。

## 打包说明

- 插件宿主的入口点被 `esbuild` 打包至 `dist/extension.js`。
- MathJax worker 被单独打包至 `dist/render/mathjax/mathjax.worker.js`，因为 `workerpool` 需要磁盘上存在真实的 worker 脚本文件。
- `vscode` 库依然采用外部引用 (external) 的方式；运行时的其他依赖（例如 `mathjax-full` 和 `workerpool`）都被打包到了输出文件当中。
- 打包时会排除掉 `node_modules`，因而不必将软链接的 `node_modules` 复制进 VSIX 中。

## 许可证

MIT
