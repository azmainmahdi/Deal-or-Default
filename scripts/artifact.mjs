// Packs dist/ into a single page for claude.ai Artifact hosting: CSS and JS inlined
// (the host only serves scripts from its own files or allowlisted CDNs), images alongside.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'

const out = 'artifact'
rmSync(out, { recursive: true, force: true })
mkdirSync(out)
const html = readFileSync('dist/index.html', 'utf8')
const css = readdirSync('dist/assets').filter((f) => f.endsWith('.css')).map((f) => readFileSync(`dist/assets/${f}`, 'utf8')).join('\n').replaceAll('../', '')
const js = readdirSync('dist/assets').filter((f) => f.endsWith('.js')).map((f) => readFileSync(`dist/assets/${f}`, 'utf8')).join('\n')
const title = html.match(/<title>.*?<\/title>/)?.[0] ?? '<title>Deal or Default</title>'
writeFileSync(`${out}/index.html`, `${title}
<meta name="theme-color" content="#0c0d0f">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js.replaceAll('</script', '<\\/script')}</script>
`)
for (const f of ['logo.png', 'card-back.png', 'world-bg.jpg']) cpSync(`dist/${f}`, `${out}/${f}`)
cpSync('dist/icons', `${out}/icons`, { recursive: true })
console.log('artifact/ ready')
