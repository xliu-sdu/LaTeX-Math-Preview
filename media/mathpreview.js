const vscode = acquireVsCodeApi()
const img = document.getElementById('math')

window.addEventListener('message', (event) => {
  const message = event.data
  if (message && message.type === 'mathImage') {
    img.src = message.src || ''
  }
})

vscode.postMessage({ type: 'initialized' })
