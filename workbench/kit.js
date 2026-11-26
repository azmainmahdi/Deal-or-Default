// Visual kit for the playable game: pure drawing helpers copied out of turn.html (the approved step 6 workbench).
// No game state lives here; game.js owns it.
// ---------- board ----------
const L={10:13,22:26,29:32,37:42,50:55,59:64,67:75,71:86},S={17:5,28:9,31:14,48:26,58:39,65:46,88:73,99:63}
const E=[7,25,43,54,61,69,76,87,96],TA=[23,34,62,72,83],X=[18,45,68,79,91]
const type=q=>q===1?'start':q===100?'goal':L[q]?'ladder':S[q]?'snake':E.includes(q)?'event':TA.includes(q)?'tariff':X.includes(q)?'sanction':''
const cell=q=>{const i=q-1,r=Math.floor(i/10),c=r%2===0?i%10:9-i%10;return{x:c*100,y:(9-r)*100}}
const mid=q=>{const{x,y}=cell(q);return{x:x+50,y:y+50}}
const range=(a,b)=>{const out=[],st=a>b?-1:1;for(let q=a;q!==b+st;q+=st)out.push(q);return out}
const FLAG={
 usa:'<rect width="30" height="20" fill="#fff"/>'+[0,2,4,6,8,10,12].map(i=>`<rect y="${i*1.54}" width="30" height="1.54" fill="#b22234"/>`).join('')+'<rect width="13" height="10.8" fill="#3c3b6e"/>',
 china:'<rect width="30" height="20" fill="#de2910"/><path d="M6 3l1.2 3.6H11L8 8.8l1.1 3.6L6 10.2 2.9 12.4 4 8.8 1 6.6h3.8z" fill="#ffde00"/>',
 japan:'<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/>',
 germany:'<rect width="30" height="7" fill="#111"/><rect y="7" width="30" height="6" fill="#dd0000"/><rect y="13" width="30" height="7" fill="#ffce00"/>',
 bangladesh:'<rect width="30" height="20" fill="#006a4e"/><circle cx="13.5" cy="10" r="6" fill="#f42a41"/>',
 uk:'<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.5"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.5"/>',
}
const TILE_COL={bank:'#d8b05a',ladder:'#2ee6b0',snake:'#ff5a6a',tariff:'#f08a3c',event:'#f2d14a',sanction:'#a26bf0',takeover:'#e2b552'}
const COL={green:'#4fdcaa',red:'#ff6b78',gold:'#f5dc94',purple:'#c4a0ff',orange:'#ffa25a'}
function boardTiles(defsOnly){let h='<defs>'+Object.keys(FLAG).map(c=>`<pattern id="p-${c}" width="1" height="1" patternContentUnits="objectBoundingBox"><image href="/art/countries/${c}.jpg" x="-.25" y="-.1" width="1.5" height="1.5" preserveAspectRatio="xMidYMid slice"/></pattern>`).join('')
  +Object.entries(COL).map(([k,c])=>`<marker id="ar-${k}" viewBox="0 0 12 12" refX="8" refY="6" markerWidth="3.6" markerHeight="3.6" orient="auto" markerUnits="strokeWidth"><path d="M3 2 9 6 3 10" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></marker>`).join('')
  +'<linearGradient id="sweep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa25a" stop-opacity="0"/><stop offset=".75" stop-color="#ff8a3c" stop-opacity=".55"/><stop offset="1" stop-color="#ffd0a0" stop-opacity=".9"/></linearGradient><linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#4fdcaa" stop-opacity=".75"/><stop offset="1" stop-color="#4fdcaa" stop-opacity="0"/></linearGradient><filter id="soft" x="-20%" y="-30%" width="140%" height="190%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity=".55"/></filter></defs>'
 if(defsOnly)return h
 for(let q=1;q<=100;q++){const{x,y}=cell(q),t=type(q),art=t&&t!=='start'
  h+=`<rect class="tile" x="${x+7}" y="${y+7}" width="86" height="86" rx="3"/>`
  if(art)h+=`<image class="art" href="/icons/${t}.svg" x="${x+7}" y="${y+7}" width="86" height="86"/>`
  if(t!=='goal'&&t!=='start'){const fwd=Math.floor((q-1)/10)%2===0;h+=`<text class="num ${['event','ladder','tariff'].includes(t)?'lt':''}" x="${fwd?x+89:x+11}" y="${y+23}" text-anchor="${fwd?'end':'start'}">${q}</text>`}}
 return h}
const puckSvg=c=>`<ellipse class="sh" cy="12" rx="30" ry="10" fill="#000" opacity=".45"/><g class="body"><circle r="30" fill="#b8892e"/><circle r="27" fill="url(#p-${c})" stroke="#f5dc94" stroke-width="3"/></g>`
const puck=(q,c,id='',dx=0)=>{const{x,y}=mid(q);return`<g ${id?`id="${id}"`:''} data-dx="${dx}" transform="translate(${x+dx},${y})">${puckSvg(c)}</g>`}
const land=(q,col)=>{const{x,y}=cell(q);return`<rect class="land" x="${x+4}" y="${y+4}" width="92" height="92" rx="8" fill="${col}22" stroke="${col}" stroke-width="5"/>`}
const ringAt=(q,col)=>{const{x,y}=cell(q);return`<rect x="${x+3}" y="${y+3}" width="94" height="94" rx="7" fill="none" stroke="${col}" stroke-width="5"/>`}
const wash=(q,col,op)=>{const{x,y}=cell(q);return`<rect x="${x+5}" y="${y+5}" width="90" height="90" rx="6" fill="${col}" opacity="${op}"/>`}
// a Deco plaque on the board: cut corners, gold edge
// a glass capsule on the board: dark see-through fill, a light top edge, a soft drop shadow
const capsule=(cx,cy,w,inner,h=36)=>`<g transform="translate(${cx-w/2},${cy-h/2})" filter="url(#soft)"><rect width="${w}" height="${h}" rx="${h/2}" fill="#0d0c0a" opacity=".82"/><rect x="1" y="1" width="${w-2}" height="${h-2}" rx="${h/2-1}" fill="none" stroke="#ffffff22" stroke-width="1.5"/>${inner}</g>`
const tag=(q,txt,col,dy=-44,strike=false)=>{const b=mid(q),w=txt.length*14+30;return`<g class="tag">${capsule(b.x,b.y+dy-8,w,`<text x="${w/2}" y="26" text-anchor="middle" fill="${col}" style="font:900 22px Nunito">${txt}</text>${strike?`<line x1="12" y1="18" x2="${w-12}" y2="18" stroke="${col}" stroke-width="3"/>`:''}`)}</g>`}
const CLOCK='<g fill="none" stroke="#a39a86" stroke-width="2.4" stroke-linecap="round"><circle r="8"/><path d="M0-4.5V0l3 2"/></g>'
// the ladder's payout: +amount, then a small clock and how long you wait
function moneyTag(q,txt,col,k,dy=-66){const b=mid(q),tw=txt.length*12.5+8,w=tw+48+(k?44:0)
 return`<g class="tag">${capsule(b.x,b.y+dy,w,`<text x="14" y="26" fill="${col}" style="font:900 21px Nunito">${txt}</text><image href="${window.COIN_SRC||''}" x="${14+tw}" y="7" width="22" height="22"/>${k?`<g transform="translate(${14+tw+42},18)">${CLOCK}</g><text x="${14+tw+54}" y="25" fill="#cfc5b0" style="font:900 17px Nunito">${k}</text>`:''}`)}</g>`}
// crash tags: "lose" then the project as its own green pill; the hedge square shows what the shield costs
function loseTag(q,amt,k,dy=-66){const b=mid(q),tw=String(amt).length*12.5+22,pw=tw+34+44,w=62+pw
 return`<g class="tag">${capsule(b.x,b.y+dy,w,`<text x="14" y="25" fill="${COL.red}" style="font:900 19px Nunito">lose</text><g transform="translate(56,5)"><rect width="${pw}" height="26" rx="13" fill="#4fdcaa2e" stroke="#4fdcaa66" stroke-width="1.2"/><text x="10" y="19.5" fill="${COL.green}" style="font:900 18px Nunito">+${amt}</text><image href="${window.COIN_SRC||''}" x="${8+tw}" y="4" width="18" height="18"/><g transform="translate(${8+tw+34},13) scale(.8)">${CLOCK}</g><text x="${8+tw+44}" y="19.5" fill="#cfc5b0" style="font:900 16px Nunito">${k}</text></g>`)}</g>`}
function costTag(q,n,dy=-60){const b=mid(q),w=104
 return`<g class="tag">${capsule(b.x,b.y+dy,w,`<text x="14" y="25" fill="#cfc5b0" style="font:900 18px Nunito">pay</text><text x="54" y="25" fill="${COL.red}" style="font:900 20px Nunito">${n}</text><image href="${window.COIN_SRC||''}" x="70" y="7" width="22" height="22"/>`)}</g>`}
const payTag=(q,amt,k)=>moneyTag(q,'+'+amt,COL.green,k)
// moves on the board (not money): a back arrow and the number of squares
const stepTag=(q,n,col)=>{const b=mid(q),f=mid(q+1),ang=Math.atan2(b.y-f.y,b.x-f.x)*180/Math.PI+180;return`<g class="tag">${capsule(b.x,b.y-50,74,`<text x="16" y="26" fill="${col}" style="font:900 21px Nunito">${n}</text><g transform="translate(50,18) rotate(${ang})" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 0H-7M-2-6-8 0l6 6"/></g>`)}</g>`}
const SHIELD=(q,cls='')=>{const{x,y}=mid(q);return`<g class="${cls}" transform="translate(${x-26},${y-26}) scale(2.2)"><path d="M12 2.5 19.5 5.5v6c0 5-3.4 8.6-7.5 10-4.1-1.4-7.5-5-7.5-10v-6z" fill="#0d0c0acc" stroke="#4fdcaa" stroke-width="1.6"/><path d="m8.5 12 2.5 2.5 4.7-5" fill="none" stroke="#4fdcaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path class="gleam" d="M12 2.5 19.5 5.5v6c0 5-3.4 8.6-7.5 10-4.1-1.4-7.5-5-7.5-10v-6z" fill="#c9fff0" opacity="0"/></g>`}
const hedgeHint=q=>{const{x,y}=cell(q);return`<g class="hhint"><rect x="${x+6}" y="${y+6}" width="88" height="88" rx="7" fill="none" stroke="#4fdcaa" stroke-width="3" stroke-dasharray="8 7"/>${SHIELD(q)}</g>`}
const arcD=(a,b)=>{const A=mid(a),B=mid(b),cx=(A.x+B.x)/2+(A.y-B.y)*.3,cy=(A.y+B.y)/2-Math.abs(A.x-B.x)*.2-60;return`M${A.x},${A.y} Q${cx},${cy} ${B.x},${B.y}`}
const crown=q=>{const{x,y}=mid(q);return`<g transform="translate(${x-20},${y-74})"><path d="M2 30 6 8l10 12L20 2l4 18L34 8l4 22z" fill="#ffd23a" stroke="#7a5a10" stroke-width="2" stroke-linejoin="round"/></g>`}
const tileD=(a,b)=>range(a,b).map((q,i)=>{const m=mid(q);return`${i?'L':'M'}${m.x},${m.y}`}).join('')
const lineD=(a,b)=>{const A=mid(a),B=mid(b);return`M${A.x},${A.y} L${B.x},${B.y}`}
// the crash walks every square it falls through; the line through their centres is rounded at the row ends and
// given a gentle serpent wave (one wave about every two squares), fading out at both ends
function snakeRoute(qs,amp=13,wl=200){const P=qs.map(mid),pts=[]
 for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)]
  for(let j=0;j<12;j++){const t=j/12,t2=t*t,t3=t2*t;pts.push({x:.5*(2*p1.x+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),y:.5*(2*p1.y+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)})}}
 pts.push(P[P.length-1]);let s=0;const len=[0];for(let i=1;i<pts.length;i++){s+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);len.push(s)}
 return pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,f=Math.min(1,len[i]/60,(s-len[i])/60),o=amp*f*Math.sin(Math.PI*2*len[i]/wl)
  return`${i?'L':'M'}${(p.x-dy/l*o).toFixed(1)},${(p.y+dx/l*o).toFixed(1)}`}).join('')}
const pathEl=(d,col,cls='',id='')=>`<path ${id?`id="${id}"`:''} class="pathln ${cls}" d="${d}" stroke="${COL[col]}" marker-end="url(#ar-${col})"/>`
// what a debt chip looks like. The copper coin read too close to gold, so three alternatives
const DTOK={silver:'Silver bank',copper:'Copper coin',iou:'IOU note',iron:'Iron coin',chain:'Chain link'}
function debtTok(sz,k='silver'){
 if(k==='silver')return`<svg class="coin" viewBox="0 0 40 40" width="${sz}" height="${sz}"><defs><linearGradient id="sv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#b9c0ca"/><stop offset=".5" stop-color="#eef1f5"/><stop offset=".75" stop-color="#7d8590"/><stop offset="1" stop-color="#d6dbe2"/></linearGradient></defs><g fill="url(#sv)" stroke="#4b525c" stroke-width=".8"><path d="M20 3 37 12.5H3z"/><rect x="4" y="14" width="32" height="3.4" rx="1"/><rect x="7" y="19" width="4.4" height="12" rx="1.2"/><rect x="14.2" y="19" width="4.4" height="12" rx="1.2"/><rect x="21.4" y="19" width="4.4" height="12" rx="1.2"/><rect x="28.6" y="19" width="4.4" height="12" rx="1.2"/><rect x="3" y="32.5" width="34" height="4" rx="1.2"/></g></svg>`
 if(k==='copper')return coin(sz,'copper')
 const svg=b=>`<svg class="coin" viewBox="0 0 40 40" width="${sz}" height="${sz}">${b}</svg>`
 if(k==='iou')return svg('<g transform="rotate(-10 20 20)"><rect x="3" y="9" width="34" height="22" rx="3" fill="#f3e6c6"/><rect x="3" y="9" width="8" height="22" rx="3" fill="#d23b2c"/><rect x="3" y="9" width="34" height="22" rx="3" fill="none" stroke="#8c2a1e" stroke-width="1.6"/><text x="24.5" y="24.5" text-anchor="middle" fill="#c12c1c" style="font:900 11px Nunito">IOU</text></g>')
 if(k==='iron')return svg('<defs><radialGradient id="ir" cx=".35" cy=".3"><stop offset="0" stop-color="#c3c8d0"/><stop offset=".55" stop-color="#6b7079"/><stop offset="1" stop-color="#2d3036"/></radialGradient></defs><circle cx="20" cy="20" r="17" fill="url(#ir)" stroke="#23262b" stroke-width="1.5"/><circle cx="20" cy="20" r="12.5" fill="none" stroke="#ffffff30" stroke-width="1.2"/><rect x="15.5" y="15.5" width="9" height="9" rx="1.5" transform="rotate(45 20 20)" fill="#14161a"/><circle cx="31" cy="31" r="7" fill="#e0384a" stroke="#14161a" stroke-width="1.5"/><path d="M27.5 31h7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>')
 return svg('<defs><linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6e9ee"/><stop offset="1" stop-color="#6e737c"/></linearGradient></defs><rect x="3" y="12" width="22" height="14" rx="7" fill="none" stroke="url(#st)" stroke-width="5"/><rect x="15" y="15" width="22" height="14" rx="7" fill="none" stroke="#e0384a" stroke-width="5"/>')}
const store=(k,v)=>{try{v===undefined?v=localStorage.getItem(k):localStorage.setItem(k,v)}catch(e){}return v}
const coin=(s,k)=>window.coinImg?coinImg(s,k):`<span class="coin" style="width:${s}px;height:${s}px;display:inline-block"></span>`
const cost=n=>`<span class="cost">pay <b>${n}</b>${coin(17)}</span>`
// moves: hop = cartoon jump (crouch, stretch on take-off, hang at the top, squash on landing);
// brake = slide that slows to a stop (hedge); fall = slide that speeds up into a crash; steps = three small hops
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,easeOut=t=>1-Math.pow(1-t,3),easeIn=t=>t*t*t
// coins fly on an arc from the paying player's money into the bank; resolves when the last one lands
function toBank(n){const from=document.querySelector('#mycash .coin'),to=document.querySelector('#bankm .bt');if(!from||!to||!n)return Promise.resolve()
 const a=from.getBoundingClientRect(),r=to.getBoundingClientRect(),bx=r.left+r.width/2-13,by=r.top+r.height/2-13
 return Promise.all([...Array(n)].map((_,i)=>{const el=document.createElement('img');el.src=window.COIN_SRC;el.className='fly';el.width=el.height=26;document.body.appendChild(el)
  const an=el.animate([{transform:`translate(${a.left}px,${a.top}px) scale(1)`},{transform:`translate(${(a.left+bx)/2}px,${Math.min(a.top,by)-60}px) scale(1.25) rotate(180deg)`},{transform:`translate(${bx}px,${by}px) scale(.55) rotate(360deg)`,opacity:.7}],{duration:document.hidden?1:460,delay:i*80,easing:'cubic-bezier(.4,0,.3,1)',fill:'backwards'})
  return new Promise(res=>{const fin=()=>{if(!el.isConnected)return res();el.remove();to.animate([{transform:'scale(1)'},{transform:'scale(1.1,.9)'},{transform:'scale(.96,1.05)'},{transform:'none'}],{duration:280,easing:'ease-out'});res()}
   an.finished.then(fin,fin);setTimeout(fin,600+i*80)})}))}
// one-off effects drawn on the board and thrown away
// sanction: a wave of purple pixels rolls out across the whole board from c (board units). Every square is a 5x5
// grid of pixels in one purple hue; brightness follows the wave front (brightest at the front, fading with distance
// from the blow) with a fixed random spread per pixel and a little flicker. The pixels are SVG squares inside the
// board itself, so they sit exactly on the tiles and bend with the board's ripple. ~30 frames a second.
function pixelWave(c,ms){const g=svgEl('g',{style:'mix-blend-mode:screen;pointer-events:none'}),N=5,P=86/N,cells=[],t0=performance.now()
 for(let q=1;q<=100;q++){const o=cell(q);for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=o.x+7+i*P,y=o.y+7+j*P
  const el=svgEl('rect',{x:x+.6,y:y+.6,width:P-1.2,height:P-1.2,opacity:0});g.appendChild(el)
  cells.push({el,d:Math.hypot(x+P/2-c.x,y+P/2-c.y),r:.45+Math.random()*.55,lag:(Math.random()-.5)*60})}}
 fxLayer().appendChild(g)
 const frame=()=>{const t=Math.min(1,(performance.now()-t0)/ms),rf=1500*(1-Math.pow(1-t,2.2)),fade=1-t*.6
  for(const p of cells){const off=p.d+p.lag-rf,front=Math.exp(-((off/190)**2)),trail=off<0?.22*Math.exp(off/260):0,near=1-Math.min(1,p.d/1400)*.55
   let a=(front+trail)*p.r*near*fade
   if(a<.02){if(p.on){p.el.setAttribute('opacity',0);p.on=false}continue}
   if(Math.random()<.08)a*=.4+Math.random()   // flicker
   p.on=true;p.el.setAttribute('opacity',Math.min(.85,a).toFixed(3));p.el.setAttribute('fill',`hsl(268,85%,${(38+34*Math.min(1,a)).toFixed(0)}%)`)}
  if(t<1)nextFrame(frame);else g.remove()}
 frame()}
// the board itself ripples: an SVG displacement map of rings moving out from c (board units), redrawn ~30 times a second
function boardRipple(c,ms){const B=document.querySelector('.board'),W=B.offsetWidth,H=B.offsetHeight
 if(!document.getElementById('ripf'))document.body.insertAdjacentHTML('beforeend','<svg width="0" height="0" style="position:absolute"><filter id="ripf" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feImage id="ripimg" result="m0" preserveAspectRatio="none"/><feGaussianBlur in="m0" stdDeviation="6" result="m"/><feDisplacementMap id="ripd" in="SourceGraphic" in2="m" xChannelSelector="R" yChannelSelector="G" scale="0"/></filter></svg>')
 const img=document.getElementById('ripimg'),dm=document.getElementById('ripd');Object.entries({x:0,y:0,width:W,height:H}).forEach(([k,v])=>img.setAttribute(k,v))
 const N=200,cv=document.createElement('canvas');cv.width=cv.height=N;const ctx=cv.getContext('2d'),im=ctx.createImageData(N,N),t0=performance.now()
 B.style.filter='url(#ripf)'
 const frame=()=>{const t=Math.min(1,(performance.now()-t0)/ms),rf=1.5*(1-Math.pow(1-t,3)),amp=1-t
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const u=(x+.5)/N-c.x/1000,v=(y+.5)/N-c.y/1000,d=Math.hypot(u,v)||1e-3,k=d-rf,val=Math.exp(-((k/.14)**2))*Math.sin(k*30),o=(y*N+x)*4
   im.data[o]=128+127*val*u/d;im.data[o+1]=128+127*val*v/d;im.data[o+2]=128;im.data[o+3]=255}
  ctx.putImageData(im,0,0);img.setAttribute('href',cv.toDataURL());dm.setAttribute('scale',(22*amp).toFixed(1))
  if(t<1)nextFrame(frame);else B.style.filter=''}
 frame()}
// effects run at the screen's rate; a hidden tab has no frames, so fall back to a timer there
const nextFrame=f=>document.hidden?setTimeout(f,33):requestAnimationFrame(f)
function fxLayer(){let g=document.getElementById('fx');if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.id='fx';document.getElementById('b').appendChild(g)}return g}
function svgEl(tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const k in attrs)e.setAttribute(k,attrs[k]);return e}
const kill=(e,a)=>a.finished.then(()=>e.remove()).catch(()=>e.remove())
const ringFx=(pt,col,r1,ms,w=5)=>{const c=svgEl('circle',{cx:pt.x,cy:pt.y,r:r1,fill:'none',stroke:col,'stroke-width':w});fxLayer().appendChild(c)
 kill(c,c.animate([{opacity:1,strokeWidth:w+'px',r:r1+'px'},{opacity:0,strokeWidth:'1px',r:r1*3.2+'px'}],{duration:ms,easing:'ease-out'}))}
const SH='<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2.5 19.5 5.5v6c0 5-3.4 8.6-7.5 10-4.1-1.4-7.5-5-7.5-10v-6z" fill="#4fdcaa33" stroke="#4fdcaa" stroke-width="1.8"/></svg>'
// Tariff Waiver, his pick B (19 Oct): the printed black and orange on a tear-off ticket
const TICKET_SM='<svg viewBox="0 0 30 18" width="26" height="16"><rect width="30" height="18" rx="3" fill="#0b0b0b" stroke="#f0812f55"/><rect x="21" width="9" height="18" rx="3" fill="#ee7a32"/><path d="M21 2v14" stroke="#0b0b0b" stroke-dasharray="2 2"/><text x="10.5" y="12.5" text-anchor="middle" fill="#f0812f" style="font:400 8px Federo">TW</text></svg>'
const TW_ICON='<img src="/icons/waiver.png" alt="" width="14" height="15" style="vertical-align:-2px">'   // the printed waiver icon (31 Oct)
const TICKET_ICON='<svg viewBox="0 0 40 40" width="42" height="42" fill="none" stroke="#e2b552" stroke-width="2.2" stroke-linejoin="round"><path d="M9 5h16l7 7v23H9z"/><path d="M25 5v7h7"/><path d="M14 17h8M14 22h5"/><circle cx="24" cy="25" r="2"/><circle cx="31" cy="33" r="2"/><path d="m33 23-11 12"/></svg>'
// the deal: pay now, a diamond per turn you wait, the payout where it lands
const CLK='<svg viewBox="-10 -10 20 20" width="11" height="11">'+'<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle r="8"/><path d="M0-4.5V0l3 2"/></g></svg>'
const SWORDS='<img src="/icons/takeover.svg" alt="" style="width:26px;height:26px;border-radius:6px">'   // takeover icon: the knight (his pick C, 19 Oct)
const proj=(amt,k,cls='')=>`<span class="pj ${cls}">+${amt}${coin(14)}<span class="t">${CLK}${k}</span></span>`
// money on its way: a four-turn line of deco diamonds, a gold pill where money lands (green = next turn); lost ones in red
const pjs=(l,lost=[])=>{if(!l.length&&!lost.length)return'<span class="none">No money on its way yet</span>'
 const due=(L,k)=>L.filter(x=>x[1]===k).reduce((a,x)=>a+x[0],0)
 return`<div class="line">${[1,2,3,4].map(k=>{const v=due(l,k),x=due(lost,k);return`<div class="slot">${v?`<span class="pill">+${v}${coin(12)}</span>`:x?`<span class="pill lose">+${x}${coin(12)}</span>`:'<span class="dia"></span>'}</div>`}).join('')}</div><div class="lbls"><span>next</span><span>in 2</span><span>in 3</span><span>in 4</span></div>`}
const mini=(p,extra='')=>`<span class="mini" style="--art:url(/art/countries/${p.c}.jpg)"></span>${extra}`
function frame(c){const k=c==='good'?'#d8b05a':'#d77a4a'
 const corner=`<g fill="none" stroke="${k}" stroke-width="1.6"><path d="M10 118V10h150M18 96V18h120"/><path d="M18 54h36V18" stroke-width="1.3"/><path d="M54 30a24 24 0 0 0-24 24M54 54 34 34M54 54 44 26M54 54 26 44" stroke-width="1.1"/></g>`
 return`<svg class="frame" viewBox="0 0 450 300" preserveAspectRatio="none">${[[0,0,1,1],[450,0,-1,1],[0,300,1,-1],[450,300,-1,-1]].map(([x,y,sx,sy])=>`<g transform="translate(${x},${y}) scale(${sx},${sy})">${corner}</g>`).join('')}
  <g fill="none" stroke="${k}" stroke-width="1.4"><path d="M170 14h40l15 12 15-12h40M195 20l30 22 30-22"/></g>
  <g transform="translate(225,52)"><circle cx="-34" r="2.4" fill="${k}"/><circle cx="-25" r="2.4" fill="${k}"/><circle cx="25" r="2.4" fill="${k}"/><circle cx="34" r="2.4" fill="${k}"/>
  <rect x="-11" y="-11" width="22" height="22" transform="rotate(45)" fill="#0b1428" stroke="var(--k)" stroke-width="1.8"/><path d="M1.5-7-4 1.5h4l-1 6 5.5-8.5h-4z" fill="var(--k)"/></g></svg>`}
const CHECK='<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m7.5 12.5 3 3 6-6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
// results drawn, not told: a square as a mini tile (icon art, number in the corner), an arrow, chips
const sqc=(q,t='',badge='')=>`<span class="sqc ${t?'art':''}" style="${t?`background-image:url(/icons/${t}.svg)`:''}"><b>${q}</b>${badge?`<span class="bd">${badge}</span>`:''}</span>`
const ARR=c=>`<svg viewBox="0 0 30 12" width="30" height="12"><path d="M1 6h25M21 1l5 5-5 5" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON=t=>`<img src="/icons/${t}.svg" width="24" height="24" alt="" style="border-radius:5px">`
// a token rolls along a list of squares without hopping, spinning as it goes (sanction: knocked back, slowing down)
function rollPath(el,qs,ms){return new Promise(res=>{const pts=qs.map(mid),n=pts.length-1;if(!el||n<1)return res();const body=el.querySelector('.body'),dx=+(el.dataset.dx||0),t0=performance.now();let over=false
 const seg=[0];for(let i=1;i<=n;i++)seg.push(seg[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));const L=seg[n]
 const at=d=>{let i=1;while(i<n&&seg[i]<d)i++;const u=(d-seg[i-1])/((seg[i]-seg[i-1])||1),a=pts[i-1],b=pts[i];return{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,dir:Math.sign(b.x-a.x)||Math.sign(b.y-a.y)||1}}
 const end=()=>{if(over)return;over=true;const b=pts[n];el.setAttribute('transform',`translate(${b.x+dx},${b.y})`);body.removeAttribute('transform');res()}
 ;(function f(now){if(over)return;const t=Math.min(1,(now-t0)/ms),e=1-Math.pow(1-t,3),d=e*L,p=at(d)
  el.setAttribute('transform',`translate(${p.x+dx},${p.y})`);body.setAttribute('transform',`rotate(${p.dir*d/30*57.3})`);if(t<1)requestAnimationFrame(f);else end()})(t0)
 setTimeout(end,document.hidden?0:ms+150)})}
// a token hops square by square along a list of squares
function hopPath(el,qs,ms){return new Promise(res=>{const pts=qs.map(mid),n=pts.length-1;if(!el||n<1)return res();const body=el.querySelector('.body'),dx=+(el.dataset.dx||0),t0=performance.now();let over=false,hop=0
 const end=()=>{if(over)return;over=true;const b=pts[n];el.setAttribute('transform',`translate(${b.x+dx},${b.y})`);body.removeAttribute('transform');res()}
 ;(function f(now){if(over)return;const t=Math.max(0,Math.min(1,(now-t0)/ms)),k=Math.min(n-1e-6,t*n),i=Math.floor(k),u=k-i,a=pts[i],b=pts[i+1],e=easeIO(u)
  if(u>.85&&hop<=i){hop=i+1;window.SFX?.play('step')}
  el.setAttribute('transform',`translate(${a.x+(b.x-a.x)*e+dx},${a.y+(b.y-a.y)*e})`);body.setAttribute('transform',`translate(0,${-Math.sin(Math.PI*u)*24})`);if(t<1)requestAnimationFrame(f);else end()})(t0)
 setTimeout(end,document.hidden?0:ms+150)})}
// ---------- the roll (an overlay on the players panel) and the bank window ----------
const ORN='<svg viewBox="0 0 160 16" width="160" height="16" style="display:block;margin:0 auto"><path d="M0 8h58M102 8h58" stroke="#d8b05a66"/><g stroke="#d8b05a99" stroke-width="1">'+[-60,-40,-20,0,20,40,60].map(a=>`<path d="M80 16 L${80+Math.sin(a*Math.PI/180)*16} ${16-Math.cos(a*Math.PI/180)*16}"/>`).join('')+'</g><path d="M74 8l6-6 6 6-6 6z" fill="#e2b552"/></svg>'
// the die face as a small icon, with the right pips
const PIPS={1:[[12,12]],2:[[8,8],[16,16]],3:[[8,8],[12,12],[16,16]],4:[[8,8],[16,8],[8,16],[16,16]],5:[[8,8],[16,8],[12,12],[8,16],[16,16]],6:[[8,7],[16,7],[8,12],[16,12],[8,17],[16,17]]}
const dieIcon=(v,sz=24)=>`<svg viewBox="0 0 24 24" width="${sz}" height="${sz}"><rect x="3" y="3" width="18" height="18" rx="5" fill="#e2b552"/><g fill="#1b2340">${PIPS[v].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.7"/>`).join('')}</g></svg>`
const spinCoins=(n,cls='')=>`<span class="cstk ${cls}">${'<span class="c3d"></span>'.repeat(n)}</span>`
// coins fly out of the bank into the player's money (borrowing); toBank is the way back
function fromBank(n){const from=document.querySelector('#bankm .bt'),to=document.querySelector('#mycash .coin');if(!from||!to||!n)return Promise.resolve()
 const r=from.getBoundingClientRect(),a=to.getBoundingClientRect(),bx=r.left+r.width/2-13,by=r.top+r.height/2-13
 return Promise.all([...Array(n)].map((_,i)=>{const el=document.createElement('img');el.src=window.COIN_SRC;el.className='fly';el.width=el.height=26;document.body.appendChild(el)
  const an=el.animate([{transform:`translate(${bx}px,${by}px) scale(.55)`,opacity:.7},{transform:`translate(${(a.left+bx)/2}px,${Math.min(a.top,by)-60}px) scale(1.25) rotate(180deg)`,opacity:1},{transform:`translate(${a.left}px,${a.top}px) scale(1) rotate(360deg)`}],{duration:document.hidden?1:480,delay:i*90,easing:'cubic-bezier(.4,0,.3,1)',fill:'backwards'})
  return new Promise(res=>{const fin=()=>{if(!el.isConnected)return res();el.remove();res()};an.finished.then(fin,fin);setTimeout(fin,620+i*90)})}))}
// the event pile beside the board. Printed cards have no common back: one side is the illustration and name, the other
// the explanation and effect. So the draw pile shows the next card's illustration side, and the last card played shows
// its explanation side (hover to read it). On an event square the pile comes forward (the table dims, the top card
// bobs); tap it or drag the top card onto the board to draw.
const CB='<div class="cb"><i></i><i></i><i></i><i></i></div>'
const cardFront=c=>`<div class="cf" style="background-image:url(${c.art})">${c.titled?'':`<b>${c.name}</b>`}</div>`
const cardBack=c=>`<div class="ct ${c.kind}"><i></i><i></i><i></i><i></i><b>${c.name}</b><span>${c.rule}</span></div>`
// window.SPEED scales every pause (game.js sets it: 1 normal, lower = faster bot turns)
const wait=ms=>new Promise(r=>setTimeout(r,document.hidden?0:ms*(window.SPEED??1)))
// bank A (his pick 19 Oct): white marble, stepped gold crown with a sunburst, fluted columns, black stepped base
const BANK_SVG=`<svg class="bt" viewBox="0 0 132 120"><defs><linearGradient id="bam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfaf6"/><stop offset="1" stop-color="#cfcbc1"/></linearGradient><linearGradient id="bag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9dd92"/><stop offset="1" stop-color="#b8892e"/></linearGradient></defs>
 <path d="M30 34h72v-8H86v-8H46v8H30z" fill="url(#bag)"/><path d="M58 18V10h16v8" fill="url(#bag)"/>
 <g stroke="#8a6420" stroke-width="1.2" opacity=".75"><path d="M66 32 54 20M66 32 62 19M66 32 70 19M66 32 78 20"/></g>
 <rect x="24" y="34" width="84" height="12" rx="1" fill="url(#bam)"/><text x="66" y="43.5" text-anchor="middle" fill="#3b3833" style="font:400 9.5px Federo;letter-spacing:2.4px">BANK</text>
 <path d="M24 46h84" stroke="#b8892e" stroke-width="2"/>
 <g fill="url(#bam)"><rect x="32" y="50" width="11" height="42"/><rect x="51" y="50" width="11" height="42"/><rect x="70" y="50" width="11" height="42"/><rect x="89" y="50" width="11" height="42"/></g>
 <g stroke="#bdb8ad" stroke-width=".9"><path d="M35.5 52v38M39.5 52v38M54.5 52v38M58.5 52v38M73.5 52v38M77.5 52v38M92.5 52v38M96.5 52v38"/></g>
 <g fill="url(#bag)"><rect x="30" y="48" width="15" height="3"/><rect x="49" y="48" width="15" height="3"/><rect x="68" y="48" width="15" height="3"/><rect x="87" y="48" width="15" height="3"/></g>
 <path d="M20 92h92v7H20zM14 99h104v7H14zM8 106h116v8H8z" fill="#141210"/><path d="M20 92h92M14 99h104M8 106h116" stroke="#d8b05a" stroke-width="1.4"/>
</svg>`
