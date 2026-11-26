// The live board (31 Oct): the printed board rebuilt in SVG over the painting from DOD Board Final.ai
// (public/art/board-bg.jpg, graded to match the print), so routes can move and react. Board units: a square is 100.
import {LADDERS,SNAKES} from '../src/rules/board.ts'

// the 16 routes as printed, traced off SVG/board.png: [start inside the square, the gap corners..., arrow tip]
// hop: a point where this line jumps another (the print's little bridges)
export const ROUTES={
 '99>63':{p:[[187,88],[200,100],[200,300],[222,322]]},
 '88>73':{p:[[786,186],[800,200],[778,222]]},
 '65>46':{p:[[488,388],[500,400],[500,500],[522,522]]},
 '58>39':{p:[[212,488],[200,500],[200,600],[178,622]]},
 '48>26':{p:[[712,588],[700,600],[700,700],[600,700],[578,722]]},
 '31>14':{p:[[988,688],[998,700],[998,800],[700,800],[678,822]],hop:[800,800]},
 '28>9':{p:[[788,788],[800,800],[800,900],[822,922]]},
 '17>5':{p:[[386,886],[400,900],[422,922]]},
 '71>86':{p:[[912,212],[900,200],[600,200],[578,178]]},
 '67>75':{p:[[612,312],[600,300],[578,278]]},
 '59>64':{p:[[188,412],[200,400],[300,400],[322,378]]},
 '50>55':{p:[[912,512],[900,500],[600,500],[578,478]]},
 '37>42':{p:[[312,612],[300,600],[200,600],[178,578]]},
 '22>26':{p:[[188,712],[200,700],[500,700],[522,722]]},
 '29>32':{p:[[912,712],[900,700],[878,678]]},
 '10>13':{p:[[912,912],[900,900],[700,900],[722,878]],hop:[800,900]},
}
// the printed "hedge here" marks: shield square -> the snakes it covers (37 and 23 carry the label on a coloured tile)
const SHIELDS={81:'88,99',51:'65',49:'58',20:'28',11:'17',37:'48',23:'31'}
const COLR={ladder:'#2a9d70',snake:'#d8455a'}
const fwd=q=>Math.floor((q-1)/10)%2===0
const cellOf=q=>{const i=q-1,r=Math.floor(i/10),c=r%2===0?i%10:9-i%10;return{x:c*100,y:(9-r)*100}}
// kit.js's type() is a global const (classic script), visible here
const typeOf=q=>type(q)

// rounded corners on a polyline; a hop draws a small bridge where the line crosses another
function routeD(r,rad=10){const p=r.p.map(([x,y])=>({x,y})),n=p.length,at=(a,b,t)=>{const l=Math.hypot(b.x-a.x,b.y-a.y)||1;return{x:a.x+(b.x-a.x)*t/l,y:a.y+(b.y-a.y)*t/l}}
 let d=`M${p[0].x},${p[0].y}`
 for(let i=1;i<n;i++){const a=p[i-1],b=p[i]
  if(r.hop){const[hx,hy]=r.hop;if(a.y===b.y&&hy===a.y&&hx>Math.min(a.x,b.x)&&hx<Math.max(a.x,b.x)){const s=Math.sign(b.x-a.x);d+=` L${hx-11*s},${hy} C${hx-5*s},${hy-12} ${hx+5*s},${hy-12} ${hx+11*s},${hy}`}}
  if(i===n-1){d+=` L${b.x},${b.y}`;break}
  const c=p[i+1],k=Math.min(rad,Math.hypot(b.x-a.x,b.y-a.y)/2,Math.hypot(c.x-b.x,c.y-b.y)/2),e=at(b,a,k),x=at(b,c,k);d+=` L${e.x},${e.y} Q${b.x},${b.y} ${x.x},${x.y}`}
 return d}
// the path a token travels: square centre, the printed route, destination centre
export function travelD(f,t){const r=ROUTES[f+'>'+t];if(!r)return null;const a=cellOf(f),b=cellOf(t)
 return `M${a.x+50},${a.y+50} L${r.p[0][0]},${r.p[0][1]} `+routeD(r).replace(/^M[^L]*/,'')+` L${b.x+50},${b.y+50}`}

// the arrowhead as printed: a fat chevron in the route colour with a small gold arrow inside
function head(r,k){const[a,b]=r.p.slice(-2),ang=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI
 return`<g class="lhead" transform="translate(${b[0]},${b[1]}) rotate(${ang}) scale(1.45)"><path d="M8,0 L-14,-12 L-9,0 L-14,12 Z" fill="${COLR[k]}" stroke="#0b141a" stroke-width="1.5" stroke-linejoin="round"/><path d="M3,0 L-7,-5 M3,0 L-7,5 M3,0 L-10,0" stroke="#f1cf86" stroke-width="2" stroke-linecap="round"/></g>`}

// ---------- the static board: built once per look change, never repainted by the routes or tokens ----------
export function liveStatic(){let h=`<defs><linearGradient id="lgold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d58e"/><stop offset="1" stop-color="#c99a44"/></linearGradient></defs>`
 const ends={};for(const[f,t]of Object.entries(LADDERS))(ends[t]??=new Set).add('ladder');for(const[f,t]of Object.entries(SNAKES))(ends[t]??=new Set).add('snake')
 for(let q=1;q<=100;q++){const{x,y}=cellOf(q),t=typeOf(q),art=t&&t!=='start'
  h+=`<rect x="${x+2.5}" y="${y+2.5}" width="95" height="95" fill="none" stroke="#c6a25a" stroke-opacity=".55" stroke-width="1"/>`
  if(art)h+=`<image href="/icons/${t}.svg" x="${x+6}" y="${y+6}" width="88" height="88"/>`
  // landing squares: dashed, green inside red when both a ladder and a snake end there (26)
  ;[...(ends[q]||[])].sort().forEach((k,i)=>h+=`<rect x="${x+9+i*6}" y="${y+9+i*6}" width="${82-i*12}" height="${82-i*12}" fill="none" stroke="${COLR[k]}" stroke-width="2" stroke-dasharray="7 5"/>`)
  if(t!=='goal'){const dark=t==='event'||t==='tariff',f=fwd(q),txt=q===1?'Start':q
   h+=`<text class="lnum" x="${f?x+88:x+12}" y="${y+31}" text-anchor="${f?'end':'start'}" fill="${dark?'#17110a':'url(#lgold)'}">${txt}</text>`}
  if(LADDERS[q])h+=`<text class="ldelta" x="${x+90}" y="${y+89}" text-anchor="end">Δ${LADDERS[q]-q}</text>`
  if(SHIELDS[q]){const on=!t
   if(on)h+=`<path d="M0,-13 L11,-9 L11,1 C11,8 5,12 0,14 C-5,12 -11,8 -11,1 L-11,-9 Z" transform="translate(${x+50},${y+52})" fill="none" stroke="#c23a4e" stroke-width="2.4"/><path d="M-5,1 L-1,5 L6,-4" transform="translate(${x+50},${y+52})" fill="none" stroke="#c23a4e" stroke-width="2.2" stroke-linecap="round"/>`
   h+=`<text class="lshield" x="${on?x+90:x+12}" y="${y+89}" text-anchor="${on?'end':'start'}" fill="${on?'#e2526a':'#2a0d10'}">∫-${SHIELDS[q]}</text>`}}
 return h}

// ---------- the routes: a calm flow along each line, brighter where it is about to be used ----------
export function liveRoutes(hot){const now=performance.now();let h=''
 for(const[key,r]of Object.entries(ROUTES)){const[f]=key.split('>').map(Number),k=LADDERS[f]?'ladder':'snake',d=routeD(r),on=hot===f
  // the flow restarts on every redraw, so its phase is pinned to the clock (no jump when the board redraws)
  const dl=-(now%(k==='ladder'?1400:2200))
  h+=`<g class="lroute ${k} ${on?'hot':''}" data-f="${f}"><path d="${d}" class="lr-edge"/><path d="${d}" class="lr-core" stroke="${COLR[k]}"/><path d="${d}" class="lr-flow" style="animation-delay:${dl}ms"/>${head(r,k)}</g>`}
 return h}

// a bright pulse that runs along a route when a token takes it
export function routePulse(layer,f,t,ms){const r=ROUTES[f+'>'+t];if(!r||!layer)return
 const k=LADDERS[f]?'ladder':'snake',p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',routeD(r));p.setAttribute('class','lr-pulse '+k);layer.appendChild(p)
 const L=p.getTotalLength();p.style.strokeDasharray=`40 ${L+40}`
 p.animate([{strokeDashoffset:40},{strokeDashoffset:-L}],{duration:ms,easing:'ease-in-out'}).finished.then(()=>p.remove(),()=>p.remove())
 document.querySelector(`.lroute[data-f="${f}"]`)?.animate([{opacity:1},{opacity:1,filter:'brightness(1.8)'},{opacity:1}],{duration:ms})}
