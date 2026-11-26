// `npm run build:game`: the workbench game as the site root (dist/index.html); the old React UI goes to dist/classic/
import {renameSync,copyFileSync} from 'node:fs'
export default {
 root:'workbench', publicDir:'../public', base:'/',
 build:{outDir:'../dist',emptyOutDir:false,rollupOptions:{input:'workbench/game.html'}},
 plugins:[{name:'game-as-index',closeBundle(){
  renameSync('dist/game.html','dist/index.html')
  for(const f of ['kit.js','sfx.js'])copyFileSync('workbench/'+f,'dist/'+f) // plain scripts vite leaves alone
 }}]
}
