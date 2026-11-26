// The playable game. The rules engine (src/rules) owns the state; this file shows it with the approved step 6 look
// (kit.js, kit.css), turns clicks into engine intents, plays each engine event as an animation, and lets bots take
// their seats. Flow: render -> human click or bot timer -> step() -> play(events) -> render.
import {newGame, step, projectTerms} from '../src/rules/engine.ts'
import {botIntent} from '../src/rules/sim.ts'
import {CARDS as DEF, FLAVOUR} from '../src/rules/cards.ts'
import {COUNTRIES, COUNTRY_IDS} from '../src/rules/countries.ts'
import {repayCost} from '../src/rules/ops.ts'
import {renderTokens,PC} from './tokens.js'
import {LADDERS,SNAKES} from '../src/rules/board.ts'
import {roll as rngRoll} from '../src/rules/rng.ts'
import {liveStatic,liveRoutes,travelD,routePulse} from './live.js'   // (kit.js has the same maps as L and S; S here is the game state)

const $=id=>document.getElementById(id)
let S=null,V=null,SEATS=[],CUR=0,TOK=[],tableLook=store('dod-table')||'wood',routeLook=store('dod-routes')||'printed',dieLook=store('dod-die')||'brass',fontLook=store('dod-font')||'almendra',busy=false,botT=0,inv=2,bankSel=3,lastCard=null,cardOpen=null,dealWait=null,dd=null
const T=ms=>document.hidden?1:Math.max(1,ms*(window.SPEED??1))
// speed: bot turns can run fast; human turns always play at normal speed
let fast=store('dod-fast')==='1'
const setSpeed=()=>{window.SPEED=S&&fast&&!human(S.current)?.3:1}

// ---------- view: what the screen shows (follows the events while they play, then snaps to the engine state) ----------
const view=s=>s.players.map((p,i)=>({name:p.name,c:p.country,cap:p.capital,debt:p.debt,waiver:p.waivers,sq:p.square,
 proj:p.projects.map(x=>({id:x.id,profit:x.profit,ttm:x.ttm})),bot:SEATS[i]?.bot}))
const human=i=>!SEATS[i]?.bot
// printed card faces, rendered from the .ai files (31 Oct); Devaluation and Rate Hike were never printed
const ART=Object.fromEntries('commodityBoom lendLease debtRestructure fastTrack tariffTruce exportSubsidy productivitySurge surplusBudget strategicReserve alliedAid warBond tradeCorridor bankingPanic cyberAttack embargo strike sovereignDefault portBlockade insuranceFraud corruptionProbe debtSpiral sanctionThreat commodityCrash capitalControls'.split(' ').map(id=>[id,`/art/events/${id}.jpg`]))
const cardView=id=>{const d=DEF[id];return{name:d.name,kind:d.kind==='beneficial'?'good':'bad',art:ART[id]||'/world-bg.jpg',titled:!!ART[id],quote:FLAVOUR[id]?.[0]||'',rule:d.text}}
const say=t=>{$('log').textContent=t.replace(/^You's /,'Your ').replace(/^You is /,'You are ').replace(/^You (rolled|draws|uses|loses|hedged|reaches|challenges|would|doesn't|goes|is)/,(m,v)=>'You '+({draws:'draw',uses:'use',loses:'lose',reaches:'reach',challenges:'challenge',goes:'go',is:'are',"doesn't":"don't"}[v]||v))}
const nm=i=>V[i].name

// ---------- board ----------
// snakes and ladders as drawn in routes.html (his two kept looks: Deco pieces, Trade routes), switchable in the top bar
const C={ladder:'#2ee6b0',snake:'#ff5a6a'},IN=7,W=100-2*IN
// quadratic arc between tile centres, bowed up off the board (or down, for falling shapes)
function geo(r,lift=.28,down=false){const a=mid(r.f),b=mid(r.t),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)
 let px=-dy/d,py=dx/d;if(py>0||(Math.abs(py)<.01&&px<0)){px=-px;py=-py}if(down){px=-px;py=-py}
 const k=Math.min(d*lift,150),c={x:(a.x+b.x)/2+px*k,y:(a.y+b.y)/2+py*k}
 const at=t=>({x:(1-t)**2*a.x+2*(1-t)*t*c.x+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*c.y+t*t*b.y})
 const tan=t=>{const x=2*(1-t)*(c.x-a.x)+2*t*(b.x-c.x),y=2*(1-t)*(c.y-a.y)+2*t*(b.y-c.y);return Math.atan2(y,x)*180/Math.PI}
 const sh={x:(a.x+b.x)/2+px*k*.25,y:(a.y+b.y)/2+py*k*.25+14}
 return{a,b,c,d,at,tan,len:d*1.15,shadow:`M${a.x},${a.y+10} Q${sh.x},${sh.y} ${b.x},${b.y+10}`}}
const head=(p,ang,k,s=1)=>`<path fill="${C[k]}" stroke="#0a0f1c" stroke-width="2" d="M-2,-8 L13,0 L-2,8 Z" transform="translate(${p.x},${p.y}) rotate(${ang}) scale(${s})"/>`
const endT=g=>1-30/g.len
const PLANE='M0,-1.5 L6,-1.5 L10,-0.6 L10,0.6 L6,1.5 L0,1.5 Z M3,-1.5 L6,-7 L8,-7 L7,-1.5 Z M3,1.5 L6,7 L8,7 L7,1.5 Z M0,-1.2 L-2.5,-4.5 L-1,-4.5 L1.5,-1.2 Z M0,1.2 L-2.5,4.5 L-1,4.5 L1.5,1.2 Z'
const DIVE='M-7,-6 L-2,-1 L1,-4 L7,4 M7,4 L7,-1 M7,4 L2,4'
function flight(r){const up=r.k==='ladder',g=geo(r,up?.38:.22,!up),et=endT(g),e=g.at(et),d=`M${g.a.x},${g.a.y} Q${g.c.x},${g.c.y} ${e.x},${e.y}`,m=g.at(.55)
 const icon=up?`<g transform="translate(${m.x},${m.y}) rotate(${g.tan(.55)}) scale(2.3)"><path d="${PLANE}" fill="#e9fff8" stroke="#0a0f1c" stroke-width=".6"/></g>`
  :`<g transform="translate(${m.x},${m.y})"><circle r="13" fill="#40121a" stroke="${C.snake}" stroke-width="2"/><path d="${DIVE}" fill="none" stroke="#ffb3bb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>`
 return`<path class="shadow" d="${g.shadow}"/><path d="${d}" fill="none" stroke="#0a0f1c" stroke-width="6" stroke-linecap="round"/>
 <path d="${d}" fill="none" stroke="${C[r.k]}" stroke-width="2.6" stroke-dasharray="${up?'9 7':'3 6'}" stroke-linecap="round"/>
 <circle cx="${g.a.x}" cy="${g.a.y}" r="5" fill="${C[r.k]}"/>${head(e,g.tan(et),r.k,.9)}${icon}`}
// centreline helpers: straight for ladders, gentle S-curve for snakes
function spine(r,wave){const a=mid(r.f),b=mid(r.t),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),px=-dy/d,py=dx/d,n=Math.max(1,Math.round(d/130))
 return Array.from({length:61},(_,i)=>{const t=i/60,w=wave?Math.sin(t*Math.PI*2*n)*wave*Math.sin(t*Math.PI):0;return{x:a.x+dx*t+px*w,y:a.y+dy*t+py*w}})}
function decoPiece(r){const up=r.k==='ladder'
 if(up){const a=mid(r.f),b=mid(r.t),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d,px=-uy*12,py=ux*12,A={x:a.x+ux*8,y:a.y+uy*8},B={x:b.x-ux*22,y:b.y-uy*22}
  const rail=(sg)=>`M${A.x+px*sg},${A.y+py*sg}L${B.x+px*sg},${B.y+py*sg}`
  let rungs='';for(let s=10;s<d-34;s+=18){const x=A.x+ux*s,y=A.y+uy*s;rungs+=`M${x+px},${y+py} L${x+ux*6},${y+uy*6} L${x-px},${y-py}`}
  const fin=(p,sg)=>`<path d="M0,-7 L5,0 L0,7 L-5,0 Z" fill="#fbe7a1" stroke="#5a3c08" stroke-width="1.5" transform="translate(${p.x},${p.y})"/>`
  return`<g><path d="${rail(1)}${rail(-1)}${rungs}" fill="none" stroke="#000" stroke-width="8" opacity=".35" transform="translate(4,6)" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${rail(1)}${rail(-1)}${rungs}" fill="none" stroke="#3a2a0c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${rail(1)}${rail(-1)}${rungs}" fill="none" stroke="url(#gold)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  ${fin({x:B.x+px,y:B.y+py})}${fin({x:B.x-px,y:B.y-py})}${fin({x:A.x+px,y:A.y+py})}${fin({x:A.x-px,y:A.y-py})}
  <path d="M0,-9 L14,0 L0,9 L4,0 Z" fill="#2ee6b0" stroke="#0a0f1c" stroke-width="2" transform="translate(${B.x+ux*12},${B.y+uy*12}) rotate(${Math.atan2(uy,ux)*180/Math.PI})"/></g>`}
 const p=spine(r,22),L1=[],R1=[];let bands=''
 p.forEach((q,i)=>{const n=p[Math.min(i+1,60)],o=p[Math.max(i-1,0)],tx=n.x-o.x,ty=n.y-o.y,tl=Math.hypot(tx,ty)||1,w=11*(1-i/60*.8),nx=-ty/tl*w,ny=tx/tl*w
  L1.push(`${q.x+nx},${q.y+ny}`);R1.unshift(`${q.x-nx},${q.y-ny}`);if(i%4===2&&i<58)bands+=`M${q.x+nx},${q.y+ny}L${q.x+tx/tl*4},${q.y+ty/tl*4}L${q.x-nx},${q.y-ny}`})
 const body=`M${L1.join(' L')} L${R1.join(' L')} Z`,h=p[0],h2=p[2],ang=Math.atan2(h.y-h2.y,h.x-h2.x)*180/Math.PI
 return`<g><path d="${body}" fill="#000" opacity=".35" transform="translate(4,6)"/><path d="${body}" fill="#a3182b" stroke="#f5d67b" stroke-width="2.2" stroke-linejoin="round"/>
 <path d="${bands}" fill="none" stroke="#f5d67b" stroke-width="1.6" opacity=".85"/>
 <g transform="translate(${h.x},${h.y}) rotate(${ang})"><path d="M-6,-13 L14,-6 L20,0 L14,6 L-6,13 Z" fill="#a3182b" stroke="#f5d67b" stroke-width="2.4" stroke-linejoin="round"/>
 <path d="M6,-5 l4,2 l-4,2 Z M6,3 l4,2 l-4,2 Z" fill="#f5d67b" transform="translate(0,-1)"/></g></g>`}
const RT=[...Object.entries(LADDERS).map(([f,t])=>({f:+f,t,k:'ladder'})),...Object.entries(SNAKES).map(([f,t])=>({f:+f,t,k:'snake'}))]
const GOLDDEF='<defs><linearGradient id="gold" x1="0" x2="1"><stop offset="0" stop-color="#b8892e"/><stop offset=".45" stop-color="#f5d67b"/><stop offset="1" stop-color="#c9962f"/></linearGradient></defs>'

// ---------- gutter routes (his "lines in the gaps" look, rebuilt 21 Oct; reworked 22 Oct after his review) ----------
// A route leaves its square at a corner, runs along the gaps between squares and enters the destination at a corner,
// every bend rounded, never a hairpin. The number corner and a ladder's Δ corner are avoided but allowed when they give a
// clearly simpler path (29 → 32 shares a corner and goes straight across it). Lines that share a gap run side by side
// in lanes. Crossings are checked on every segment, diagonals included; routes are re-picked against each other from
// several shuffled starts, keeping the shortest, simplest set with the fewest crossings. A crossing left over draws as a
// bridge, with the ladder going over the snake, like the printed board.
const fwdRow=q=>Math.floor((q-1)/10)%2===0
const CORN=[[0,0],[100,0],[0,100],[100,100]]
function cornerCost(q,c,isLadderStart){const num=fwdRow(q)?[100,0]:[0,0],dl=fwdRow(q)?[100,100]:[0,100],eq=(a,b)=>a[0]===b[0]&&a[1]===b[1]
 return(eq(c,num)?70:0)+(isLadderStart&&eq(c,dl)?70:0)}
const gdot=(a,b,c,d)=>(b.x-a.x)*(d.x-c.x)+(b.y-a.y)*(d.y-c.y)
const gLegs=p=>p.slice(1,-1).map((q,i,a)=>i<a.length-1?[q,a[i+1]]:null).filter(g=>g&&(g[0].x!==g[1].x||g[0].y!==g[1].y))
const gSegs=p=>p.slice(0,-1).map((q,i)=>[q,p[i+1]]).filter(([u,v])=>u.x!==v.x||u.y!==v.y)
// his drawings (22 Oct): 31 drops past 30 and runs under 29; the ladders run along the gap above and hop the snakes
const PINNED={'31>14':[{x:900,y:700},{x:900,y:800},{x:700,y:800}],'71>86':[{x:900,y:200},{x:600,y:200}],'10>13':[{x:900,y:900},{x:800,y:900}],'28>9':[{x:800,y:800},{x:800,y:900}]}
function gCands(f,t,k){const s=cell(f),d=cell(t),out=[]
 // ponytail: routes he drew by hand are pinned as corner lists; the search fits the rest around them
 const pin=PINNED[f+'>'+t];if(pin){const A=pin[0],B=pin.at(-1),i=(q,c,n)=>q>c+50?-n:n
  const p=[{x:A.x+i(A.x,s.x,8),y:A.y+i(A.y,s.y,8)},...pin,{x:B.x+i(B.x,d.x,9),y:B.y+i(B.y,d.y,9)}];return[{p,L:gLegs(p),cost:0,k}]}
 for(const sc of CORN)for(const dc of CORN)for(const lane of[0,-1,1]){const[sx,sy]=sc,[dx,dy]=dc,o=lane*5
  const A={x:s.x+sx+o,y:s.y+sy+o},B={x:d.x+dx+o,y:d.y+dy+o}
  // the line touches the tile at its corner (8 in), never over the number
  const inS={x:s.x+sx+(sx?-8:8),y:s.y+sy+(sy?-8:8)},inD={x:d.x+dx+(dx?-9:9),y:d.y+dy+(dy?-9:9)}
  const extra=cornerCost(f,sc,k==='ladder')+cornerCost(t,dc,false)+10*Math.abs(lane)
  // the same corner: straight across it
  if(A.x===B.x&&A.y===B.y){if(gdot(inS,A,B,inD)>=0)out.push({p:[inS,A,inD],L:[],cost:extra});continue}
  const mids=[]
  for(let g=Math.max(0,Math.min(A.y,B.y)-o-100);g<=Math.min(1000,Math.max(A.y,B.y)-o+100);g+=100)mids.push([{x:A.x,y:g+o},{x:B.x,y:g+o}])
  for(let g=Math.max(0,Math.min(A.x,B.x)-o-100);g<=Math.min(1000,Math.max(A.x,B.x)-o+100);g+=100)mids.push([{x:g+o,y:A.y},{x:g+o,y:B.y}])
  for(const m of mids){const p=[inS,A,...m,B,inD].filter((q,i,a)=>!i||q.x!==a[i-1].x||q.y!==a[i-1].y),L=gLegs(p)
   if(!L.length)continue
   let hair=(gdot(inS,A,L[0][0],L[0][1])<=0)+(gdot(L.at(-1)[0],L.at(-1)[1],B,inD)<=0)
   for(let i=1;i<L.length;i++)if(gdot(L[i-1][0],L[i-1][1],L[i][0],L[i][1])<0)hair++
   const len=L.reduce((n,[u,v])=>n+Math.abs(u.x-v.x)+Math.abs(u.y-v.y),0)
   // ladders climb: a route that dips below the start square's row (his 71→75, 10→13) costs extra
   const under=k==='ladder'&&p.slice(1).some(q=>q.y>=s.y+90)?160:0
   out.push({p,L,cost:len+30*(L.length-1)+extra+5000*hair+under})}}
 return out.sort((a,b)=>a.cost-b.cost).slice(0,90).map(c=>(c.k=k,c))}
const gSpan=(u,v,k)=>[Math.min(u[k],v[k]),Math.max(u[k],v[k])]
const cross2=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x)
// two segments cross (properly, not just touching at an end)
function segX(a,b,c,d){const d1=cross2(c,d,a),d2=cross2(c,d,b),d3=cross2(a,b,c),d4=cross2(a,b,d)
 if(((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0))){const t=d1/(d1-d2);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}}return null}
// same lane overlap is very bad; each crossing costs about one detour of a square and a half
function gClash(P,Q,list){let c=0
 for(const[a,b]of gSegs(P.p))for(const[e,f]of gSegs(Q.p)){const ah=a.y===b.y,av=a.x===b.x,eh=e.y===f.y,ev=e.x===f.x
  if((ah&&eh)||(av&&ev)){const k=ah?'y':'x',r=ah?'x':'y';if(Math.abs(a[k]-e[k])<3){const[p,q]=gSpan(a,b,r),[m,n]=gSpan(e,f,r);if(Math.min(q,n)-Math.max(p,m)>2)c+=1000}}
  const x=segX(a,b,e,f);if(x){c+=P.k!==Q.k?40:160;   // a ladder hopping a snake is cheap (his drawings); same kind stays dear
  list?.push({...x,segP:[a,b],segQ:[e,f]})}}
 // keep clear of where another line starts or ends: a route that squeezes past another's corner reads as tangled
 // (his example: 31 → 14 should drop down past 30 and run under 29, not cut over 29 → 32's corner)
 for(const [u,v] of gSegs(P.p))for(const q of[Q.p[1],Q.p.at(-2)])if(segDist(q,u,v)<9)c+=140
 for(const [u,v] of gSegs(Q.p))for(const q of[P.p[1],P.p.at(-2)])if(segDist(q,u,v)<9)c+=140
 // two lines ending (or starting) at the same grid corner cross right at their bends, with no room to hop
 for(const e of[P.p[1],P.p.at(-2)])for(const q of[Q.p[1],Q.p.at(-2)])if(Math.hypot(e.x-q.x,e.y-q.y)<15)c+=220
 return c}
function segDist(q,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/l));return Math.hypot(a.x+dx*t-q.x,a.y+dy*t-q.y)}
let GUTTER=null
function gutterRoutes(){if(GUTTER)return GUTTER
 const routed=[...Object.entries(LADDERS).map(([f,t])=>[+f,t,'ladder']),...Object.entries(SNAKES).map(([f,t])=>[+f,t,'snake'])]
 const C2=routed.map(([f,t,k])=>gCands(f,t,k))
 // clash is symmetric and re-asked thousands of times across starts: remember each pair
 let id=0;C2.flat().forEach(c=>c.id=id++);const memo=new Map(),clash=(a,b)=>{const key=a.id<b.id?a.id*8192+b.id:b.id*8192+a.id
  let v=memo.get(key);if(v===undefined)memo.set(key,v=gClash(a,b));return v}
 let best=null,seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647
 for(let start=0;start<16;start++){const pick=C2.map(c=>start?Math.floor(rnd()*Math.min(8,c.length)):0)
  const order=routed.map((_,i)=>i).sort(()=>start?rnd()-.5:0)
  for(let pass=0;pass<12;pass++){let moved=false
   for(const i of order){let bi=pick[i],bc=Infinity
    C2[i].forEach((c,j)=>{const v=c.cost+routed.reduce((n,_,k)=>k===i?n:n+clash(c,C2[k][pick[k]]),0);if(v<bc){bc=v;bi=j}})
    if(bi!==pick[i]){pick[i]=bi;moved=true}}
   if(!moved)break}
  let tot=0;for(let i=0;i<routed.length;i++){tot+=C2[i][pick[i]].cost;for(let k=i+1;k<routed.length;k++)tot+=clash(C2[i][pick[i]],C2[k][pick[k]])}
  if(!best||tot<best.tot)best={tot,pick:[...pick]}}
 const lines=routed.map(([f,t,k],i)=>({f,t,k,...C2[i][best.pick[i]]})),bridges=[]
 for(let i=0;i<lines.length;i++)for(let k=i+1;k<lines.length;k++){const l=[];gClash(lines[i],lines[k],l)
  // the ladder goes over; two of a kind: the first one
  // ...unless the crossing sits at its bend, where a hop has no straight run: then the other line hops
  const room=([u,v],x)=>Math.min(Math.hypot(x.x-u.x,x.y-u.y),Math.hypot(x.x-v.x,x.y-v.y))>=18
  l.forEach(x=>{let overI=lines[i].k==='ladder'||lines[k].k!=='ladder'
   if(!room(overI?x.segP:x.segQ,x)&&room(overI?x.segQ:x.segP,x))overI=!overI
   bridges.push({x:x.x,y:x.y,over:overI?lines[i]:lines[k],seg:overI?x.segP:x.segQ,under:overI?lines[k]:lines[i]})})}
 return GUTTER={lines,bridges,tot:best.tot}}
function gutterLayer(){const{lines,bridges}=gutterRoutes(),col={ladder:'#2ee6b0',snake:'#ff5a6a'},BG='#0e1529'
 let h=''
 const hops=new Map();for(const x of bridges)hops.set(x.over,[...(hops.get(x.over)||[]),x])
 const draw=r=>{const d=smooth(r.p,12,hops.get(r)||[]),a=r.p.at(-2),b=r.p.at(-1),ang=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI
  return`<g><path d="${d}" fill="none" stroke="#0a0f1c" stroke-width="6.5" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col[r.k]}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M0,-6 L11,0 L0,6 Z" fill="${col[r.k]}" stroke="#0a0f1c" stroke-width="1.5" transform="translate(${b.x},${b.y}) rotate(${ang})"/></g>`}
 // under lines first, then the lines that hop over them (the hop is drawn into the top line's own path)
 lines.filter(r=>!hops.has(r)).forEach(r=>h+=draw(r));lines.filter(r=>hops.has(r)).forEach(r=>h+=draw(r))
 return h}
// rounded corners; hops = crossings on this line: a small upward (or leftward) curve built into the same path
function smooth(p,r=12,hops=[]){const HL=11,HH=8,n=p.length,K=p.map(()=>0)
 for(let i=1;i<n-1;i++){const a=p[i-1],b=p[i],c=p[i+1];K[i]=Math.min(r,Math.hypot(b.x-a.x,b.y-a.y)/2,Math.hypot(c.x-b.x,c.y-b.y)/2)}
 // a hop near a bend: the bend gets tighter so the hop fits on the straight part
 const onSeg=[...Array(n)].map(()=>[])
 for(const x of hops){const i=p.indexOf(x.seg[1]);if(i<1||p[i-1]!==x.seg[0])continue
  const a=p[i-1],b=p[i],len=Math.hypot(b.x-a.x,b.y-a.y)||1,t=Math.hypot(x.x-a.x,x.y-a.y)
  K[i-1]=Math.min(K[i-1],Math.max(0,t-HL-1));K[i]=Math.min(K[i],Math.max(0,len-t-HL-1));onSeg[i].push(t)}
 const at=(a,b,t)=>{const l=Math.hypot(b.x-a.x,b.y-a.y)||1;return{x:a.x+(b.x-a.x)*t/l,y:a.y+(b.y-a.y)*t/l}}
 const hop=(a,b,t)=>{const l=Math.hypot(b.x-a.x,b.y-a.y)||1,ux=(b.x-a.x)/l,uy=(b.y-a.y)/l,f=(-ux>0||(ux===0&&uy>0))?-1:1,nx=uy*f,ny=-ux*f
  const P=(s,w)=>`${a.x+ux*(t+s)+nx*w},${a.y+uy*(t+s)+ny*w}`;return` L${P(-HL,0)} C${P(-HL*.45,HH*1.35)} ${P(HL*.45,HH*1.35)} ${P(HL,0)}`}
 let d=`M${p[0].x},${p[0].y}`
 for(let i=1;i<n;i++){const a=p[i-1],b=p[i]
  for(const t of onSeg[i].sort((u,v)=>u-v))d+=hop(a,b,t)
  if(i===n-1){d+=` L${b.x},${b.y}`;break}
  const c=p[i+1],k=K[i],e=at(b,a,k),x=at(b,c,k);d+=` L${e.x},${e.y} Q${b.x},${b.y} ${x.x},${x.y}`}
 return d}
function routesLayer(){if(routeLook==='gutter')return gutterLayer();return RT.slice().sort((a,b)=>cell(a.f).y-cell(b.f).y).map(r=>`<g>${routeLook==='flight'?flight(r):decoPiece(r)}</g>`).join('')}
// board contents from board.html: dashed outlines where a ladder or snake lands, the climb on each ladder square, Start
function extras(){let h='';const ends={};RT.forEach(r=>ends[r.t]=r.k)
 for(let q=1;q<=100;q++){const{x,y}=cell(q)
  if(ends[q])h+=`<rect class="dest ${ends[q]}" x="${x+IN+5}" y="${y+IN+5}" width="${W-10}" height="${W-10}" rx="2"/>`
  if(LADDERS[q]){const fwd=Math.floor((q-1)/10)%2===0;h+=`<text class="delta" x="${fwd?x+100-IN-4:x+IN+4}" y="${y+100-IN-6}" text-anchor="${fwd?'end':'start'}">Δ${LADDERS[q]-q}</text>`}}
 const s=cell(1);return h+`<text class="startl" x="${s.x+50}" y="${s.y+58}" text-anchor="middle">Start</text>`}
// a player's gold token (rendered once from tokens.js); the flag puck stands in until it is ready
const TS=150,GROUND=24   // the base meets the board this far below the square's centre
function token(i,dx){const p=V[i],{x,y}=mid(p.sq),t=TOK[i]
 // 1 Nov: no flat disc under the token; a tight contact shadow where the base meets the board, and the token's own
 // silhouette laid flat as a soft cast shadow away from the key light (top left), so it stands on the board
 return`<g class="tok ${i===CUR?'on':''}" id="pk${i}" data-dx="${dx}" transform="translate(${x+dx},${y})"><ellipse class="halo" cx="0" cy="${GROUND}" rx="42" ry="14" fill="${PC[i]}" style="filter:blur(7px)"/>
  <g class="body">${t?`<ellipse cx="0" cy="${GROUND-1}" rx="27" ry="7.5" fill="#000" opacity=".9" style="filter:blur(1.8px)"/>
  <image href="${t.src}" x="${-TS/2}" y="${-TS*t.foot}" width="${TS}" height="${TS}" transform="matrix(1,0,-.7,-.36,0,${GROUND-2})" opacity=".62" style="filter:brightness(0) blur(2px)"/>
  <image href="${t.src}" x="${-TS/2}" y="${GROUND-2-TS*t.foot}" width="${TS}" height="${TS}" style="filter:drop-shadow(0 1px 1.5px #000e)"/>`:puckSvg(p.c)}</g></g>`}
// the decision on the board, as in the step 6 scenes: where investing climbs to (with the payout), where a crash drops
// you and where a hedge stops it, where a tariff pushes you back
// a short result card in a player's row after something happens to them (like the step 6 scenes)
const RES={}
function result(i,col,icon,title,body){RES[i]={html:`<div class="res" style="--rc:${col}"><div class="rh">${icon}${title}</div>${body}</div>`,until:Date.now()+T(3200)};renderRows();setTimeout(()=>{if(!busy)renderRows()},T(3300))}
let hov=null,hovN=0   // what the pointer is over in the decision panel: the board previews that choice
function preview(){const d=S.decision;if(busy||!d||!human(d.player))return''
 if(d.kind==='invest'){if(hov==='skip')return land(d.from,COL.gold)
  const p=S.players[d.player],k=Math.min(Math.max(1,hovN||inv),d.max),t=projectTerms(p.country,k,d.to-d.from,S.config)
  return pathEl(arcD(d.from,d.to),'green')+land(d.to,COL.green)+payTag(d.to,t.profit,t.ttm)}
 if(d.kind==='hedge'){const stop=d.from-Math.ceil((d.from-d.to)/2),b=best(d.player)
  if(hov==='hedge')return pathEl(snakeRoute(range(d.from,stop)),'green')+`<path class="pathln faded" d="${snakeRoute(range(stop,d.to))}" stroke="${COL.red}"/>`+land(stop,COL.green)+`<g>${SHIELD(stop,'hon')}</g>`+costTag(stop,d.cost)
  if(hov==='nohedge')return range(d.from,d.to).slice(1).map(q=>wash(q,COL.red,.25)).join('')+pathEl(snakeRoute(range(d.from,d.to)),'red')+land(d.to,COL.red)+(b?loseTag(d.to,b.profit,b.ttm):'')
  return pathEl(snakeRoute(range(d.from,d.to)),'red')+land(d.to,COL.red)+hedgeHint(stop)+costTag(stop,d.cost)}
 if(d.kind==='waiver'){const p=V[d.player],to=Math.max(1,p.sq-d.setback)
  if(hov==='use')return land(p.sq,COL.green)+`<g>${SHIELD(p.sq,'hon')}</g>`
  return pathEl(tileD(p.sq,to),'orange')+land(to,COL.orange)}
 return''}
function crunchTint(){const p=V[CUR],f=S.config.crunchFrom;if(!(p.debt>0&&p.sq>=f))return'';let h='<g class="crunch">';for(let q=f;q<=100;q++){const c=cell(q);h+=`<rect x="${c.x+5}" y="${c.y+5}" width="90" height="90" rx="6"/>`}return h+'</g>'}
// the printed board (SVG/board.png from his Illustrator file, cropped to the grid) replaces the drawn tiles and routes
// 31 Oct perf: the image is the .tilt background and tokens live in their own svg (#tk), so a token step or the
// turn glow repaints only the tokens, not the board image, routes and tiles under them
// live board: the static squares go in #lb once; #b holds only the moving routes, previews and effects
let lbLook=null
function drawBoard(){const pr=routeLook==='printed',lv=routeLook==='live',tl=document.querySelector('.tilt');tl.classList.toggle('printed',pr);tl.classList.toggle('live',lv)
 if(lbLook!==routeLook){$('lb').innerHTML=lv?liveStatic():'';lbLook=routeLook}
 const d=S.decision,hot=d&&(d.kind==='invest'||d.kind==='hedge')?d.from:0
 let h=GOLDDEF+(pr||lv?boardTiles(true):boardTiles())+crunchTint()+(lv?liveRoutes(hot):pr?'':extras()+routesLayer())+preview(),tk='';const here={}
 V.forEach((p,i)=>(here[p.sq]??=[]).push(i))
 // back to front, so a token lower on the board stands in front of one above it
 V.map((p,i)=>i).sort((a,b)=>mid(V[a].sq).y-mid(V[b].sq).y).forEach(i=>{const g=here[V[i].sq],k=g.indexOf(i),x=cell(V[i].sq).x
  // spread players sharing a square, but keep the group inside the square (the edge columns pushed tokens off the board)
  let dx=g.length>1?(k-(g.length-1)/2)*Math.min(24,56/(g.length-1)):0;dx=Math.max(22-50,Math.min(78-50,dx));tk+=token(i,dx)})
 $('b').innerHTML=h;$('tk').innerHTML=tk}

// ---------- player rows ----------
const TC={invest:TILE_COL.ladder,hedge:TILE_COL.snake,waiver:TILE_COL.tariff,takeover:TILE_COL.takeover,ackCard:TILE_COL.event,cardChoice:TILE_COL.event}
// loans growing more expensive: amber when the cheap repay ends next turn, red once a loan is late
function loanState(i){const pl=S.players[i],N=S.players.length;let st=''
 for(const l of pl.loans||[]){const left=3-Math.floor((S.turn-l.turn)/N);if(left<=0)return'late';if(left===1)st='due'}return st}
function money(p,on,i){const ls=loanState(i)
 return`<div class="money"><div class="cash" ${on?'id="mycash"':''}>${coin(on?26:22)}<span>${p.cap}</span></div><div class="msub">${p.debt?`<span class="debtA ${ls}" title="${ls==='late'?'A loan is late: it now costs 2 extra':ls==='due'?'Repay this turn to pay 1 extra; from next turn it is 2':'Loans you owe'}">${debtTok(15)}<span>${p.debt}</span></span>`:''}<span class="tw ${p.waiver?'':'none'}">${TW_ICON}${p.waiver}</span></div></div>`}
function renderRows(){const d=!busy&&S.phase==='playing'?S.decision:null,act=d?d.player:CUR
 $('rows').innerHTML=V.map((p,i)=>{const on=i===act,dec=on&&d?decisionHTML(d):''
  return`<div class="row ${on?'on':''}" data-i="${i}" style="--pcol:${PC[i]};--art:url(/art/countries/${p.c}.jpg);${on?`--tc:${d&&TC[d.kind]||TILE_COL.bank}`:''}"><div class="por" title="${COUNTRIES[p.c].name}: ${COUNTRIES[p.c].perk}"><span class="fl"><svg viewBox="0 0 30 20" preserveAspectRatio="none">${FLAG[p.c]}</svg></span></div>
  <div><div class="name">${p.name}${i===CUR?'<span class="turn">Your turn</span>':''}${p.bot?'<span class="bot">bot</span>':''}</div><div class="inc">${pjs(p.proj.map(x=>[x.profit,x.ttm]))}</div></div>
  ${money(p,on,i)}${dec?`<div class="dec">${dec}</div>`:RES[i]&&RES[i].until>Date.now()?`<div class="dec">${RES[i].html}</div>`:''}</div>`}).join('')
 bindDecision()}

// the decision in the active row, built like the workbench scenes
const best=i=>V[i].proj.reduce((a,x)=>!a||x.profit>a.profit?x:a,null)
function decisionHTML(d){if(!human(d.player))return`<div class="rp thinking">${V[d.player].name} is thinking…</div>`
 const q=(icon,t)=>`<div class="q">${icon}${t}</div>`
 if(d.kind==='invest'){const p=S.players[d.player],k=Math.min(Math.max(1,inv),d.max),t=projectTerms(p.country,k,d.to-d.from,S.config)
  return q(ICON('ladder'),'Invest?')+`<div class="inv"><div class="pick" id="pick">${[...Array(d.max)].map((_,j)=>`<button class="${j<k?'on':''}" data-n="${j+1}" aria-label="Invest ${j+1}"><span class="c3d"></span></button>`).join('')}</div>
   <div class="tl" id="tl"><div class="nums"><span class="o">−${k}</span><span class="i">+${t.profit}</span></div><div class="bar">${'<i></i>'.repeat(t.ttm)}</div><div class="cap"><span>now</span><span>${CLK}${t.ttm===1?'next turn':`in ${t.ttm} turns`}</span></div></div></div>
   <div class="go"><button class="btn" data-x="skip">Skip</button><button class="btn primary" data-x="invest">Invest ${k}</button></div>`}
 if(d.kind==='hedge'){const b=best(d.player)
  return q(ICON('snake'),'Market crash: hedge?')+`<div class="go"><button class="btn good two" data-x="hedge"><span>${SH} Hedge</span>${cost(d.cost)}</button><button class="btn bad two" data-x="nohedge"><span>Don’t hedge</span><span class="cost">${b?`lose ${proj(b.profit,b.ttm,'lose')}`:'nothing to lose'}</span></button></div>`}
 if(d.kind==='waiver')return q(ICON('tariff'),`${V[d.from].name}’s tariff: back ${d.setback}`)+`<div class="go"><button class="btn good" data-x="use">Use waiver</button><button class="btn bad" data-x="back">Go back ${d.setback}</button></div>`
 if(d.kind==='takeover')return q(SWORDS,'Hostile takeover?')+`<div class="vic">${d.victims.map(v=>{const b=best(v);return`<div class="v">${mini(V[v])}${b?proj(b.profit,b.ttm):''}</div>`}).join('')}</div>
   <div class="rp" style="margin-top:6px">Both roll; the higher takes the other’s best project.</div><div class="go">${d.victims.map(v=>`<button class="btn primary" data-v="${v}">Challenge ${V[v].name} ${cost(S.config.takeoverCost)}</button>`).join('')}<button class="btn" data-v="-1">Pass</button></div>`
 if(d.kind==='ackCard'||d.kind==='cardChoice')return q(ICON('event'),'Event card')
 return''}
function bindDecision(){const d=S.decision,root=$('rows');if(!d)return;const P=d.player
 root.querySelectorAll('[data-n]').forEach(b=>{b.onclick=()=>{inv=+b.dataset.n;hovN=0;renderRows();drawBoard()}
  b.onmouseenter=()=>{hovN=+b.dataset.n;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('pre',+x.dataset.n<=hovN));drawBoard()}
  b.onmouseleave=()=>{hovN=0;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.remove('pre'));drawBoard()}})
 root.querySelectorAll('[data-x]').forEach(b=>{b.onmouseenter=b.onfocus=()=>{hov=b.dataset.x;drawBoard()};b.onmouseleave=b.onblur=()=>{hov=null;drawBoard()}})
 const go={skip:{type:'invest',chips:0},invest:{type:'invest',chips:Math.min(inv,d.max||0)},hedge:{type:'hedge',hedge:true},nohedge:{type:'hedge',hedge:false},use:{type:'waiver',use:true},back:{type:'waiver',use:false}}
 root.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>act({player:P,...go[b.dataset.x]}))
 root.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>act({player:P,type:'takeover',victim:+b.dataset.v<0?null:+b.dataset.v}))}

// ---------- the roll card (always on the table; live on a human's roll) ----------
function rollCard(){const rc=document.querySelector('.rcol');let el=$('rollov')
 const d=S.decision,live=!busy&&S.phase==='playing'&&d&&(d.kind==='debtWindow'||d.kind==='roll')&&human(d.player)
 const who=`${mini(V[CUR])}${V[CUR].name} · ${live?'your roll':V[CUR].bot?'bot':'turn'}`
 if(!el){el=document.createElement('div');el.id='rollov';el.className='rollov'
  el.innerHTML=`${ORN}<div class="who"></div><div class="rbody"><span class="rn" id="rn"></span><canvas class="rdie" aria-label="Roll the die"></canvas></div>`
  rc.insertBefore(el,rc.firstChild)
  const mk=()=>{if(window.duelDice)dd=window.duelDice(el.querySelector('canvas'),1,dieLook);else setTimeout(mk,50)};mk()
  el.querySelector('canvas').onclick=()=>{const d=S.decision;if(!busy&&d&&(d.kind==='debtWindow'||d.kind==='roll')&&human(d.player))act({player:d.player,type:'roll'})}}
 el.querySelector('.who').innerHTML=who;el.classList.toggle('idle',!live)}

// ---------- the bank (tap the marble bank on the table) ----------
function bankWin(){const p=CUR,pl=S.players[p],d=S.decision,free=d.take,held=pl.loans||[]
 if(!free.includes(bankSel))bankSel=free[free.length-1]||0
 const k=bankSel,N=S.players.length
 const pick=[1,2,3].map(n=>`<button class="bsz ${n===k?'on':''}" data-bs="${n}" ${free.includes(n)?'':'disabled'}>${spinCoins(n)}</button>`).join('')
 const owe=held.map(l=>{const left=3-Math.floor((S.turn-l.turn)/N),c=(v,cls='')=>`<span class="oc ${cls}">${v}${coin(15)}</span>`,can=d.repay.includes(l.n)
  return`<div class="bowe">${debtTok(22)}<b>${l.n}</b><span class="bt2">${left>0?`${c(l.n+1)}${left===1?'now':`${left} turns`}<span class="ar">→</span>${c(l.n+2,'r')}${left===1?'next turn':'after'}`:`${c(l.n+2,'r')}late`}</span><button class="btn" data-rp="${l.n}" ${can?'':'disabled'}>Repay <span class="cost"><b>${repayCost(S,p,l.n)}</b>${coin(17)}</span></button></div>`}).join('')
 return`<div class="bankw"><div class="bwh">${BANK_SVG}<h3>Bank</h3><button class="x" data-bx aria-label="Close">✕</button></div>
  ${k?`<div class="bpick">${pick}<button class="btn primary" data-bw="${k}">Borrow ${k}</button></div>
  <div class="bflow"><div class="bx g"><small>Now</small><b>+${k*(pl.country==='uk'?S.config.ukDebtCapital:1)}<span class="c3d bc"></span></b></div><span class="ar">→</span>
   <div class="bx"><small>Pay back</small><b>${k+1}<span class="c3d bc"></span></b><em>${'<i></i>'.repeat(3)}${CLK}3 turns</em></div><span class="or">or</span>
   <div class="bx late"><small>Later</small><b>${k+2}<span class="c3d bc"></span></b><em>${CLK}after that</em></div></div>`:`<div class="bnone">${S.turnFlags.borrowed?'One loan a turn: you have borrowed this turn.':'You hold all three loans.'}</div>`}
  ${owe?`<div class="bowes">${owe}</div>`:''}</div>`}
function bankOpen(){const d=S.decision;if(busy||!d||d.kind!=='debtWindow'||!human(d.player))return;const ov=$('ov');ov.innerHTML=bankWin();ov.classList.add('on');cardOpen=null
 ov.querySelector('[data-bx]').onclick=bankClose;ov.onclick=e=>{if(e.target===ov)bankClose()}
 ov.querySelectorAll('[data-bs]').forEach(b=>b.onclick=()=>{bankSel=+b.dataset.bs;bankOpen()})
 ov.querySelector('[data-bw]')?.addEventListener('click',async e=>{const n=+e.currentTarget.dataset.bw;await act({player:CUR,type:'takeDebt',n});bankOpen()})
 ov.querySelectorAll('[data-rp]').forEach(b=>b.onclick=async()=>{await act({player:CUR,type:'repay',n:+b.dataset.rp});bankOpen()})}
function bankClose(){const ov=$('ov');if(!ov.querySelector('.bankw'))return;ov.classList.remove('on');ov.innerHTML='';ov.onclick=null}
function bankBadge(){const b=$('bankm');let o=b.querySelector('.owe');const n=V[CUR].debt
 if(!n){o?.remove();return}if(!o){o=document.createElement('span');o.className='owe';b.appendChild(o)}o.textContent=n}

// ---------- the event pile ----------
function renderPile(){const el=$('pile'),bd=document.querySelector('.board');const lc=lastCard&&cardView(lastCard),ready=!!dealWait
 el.innerHTML=`<span class="lab">last played</span><div class="last ${lc?'':'none'}">${lc?cardBack(lc):''}</div><span class="lab">${ready?'draw a card':'draw'}</span>
  <div class="draw" aria-label="Draw an event card">${CB.replace('<div class="cb">','<div class="cb" style="left:4px;top:8px">')}${CB.replace('<div class="cb">','<div class="cb" style="left:2px;top:4px">')}<div class="top"><div class="cb" style="left:0;top:0"></div></div><span class="count">${S.deck.length}</span></div>`
 el.classList.toggle('ready',ready);document.querySelector('.stage').classList.toggle('drawing',ready)
 el.style.top=(bd.offsetTop+bd.offsetHeight-el.offsetHeight)+'px'
 const top=el.querySelector('.draw .top');let drag=null
 top.onpointerdown=e=>{if(!dealWait)return;e.preventDefault();try{top.setPointerCapture(e.pointerId)}catch(_){};drag={x:e.clientX,y:e.clientY,moved:0}}
 top.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved=Math.hypot(dx,dy);top.style.transform=`translate(${dx}px,${dy}px) rotate(${dx/18}deg) scale(1.08)`;top.style.animation='none'}
 top.onpointerup=()=>{if(!drag)return;const ok=drag.moved>70||drag.moved<6;drag=null;if(ok&&dealWait)dealWait();else{top.style.transform='';top.style.animation=''}}
 el.querySelector('.draw').onclick=e=>{if(!e.target.closest('.top')&&dealWait)dealWait()}}
// draw: wait for the human (tap or drag) or a beat for a bot, fly the card to the board, show the picture, turn it over
async function drawCard(p,id){
 if(human(p)){await new Promise(r=>{dealWait=r;renderPile()});dealWait=null}else{dealWait=()=>{};renderPile();await wait(700);dealWait=null}
 const top=document.querySelector('#pile .draw .top'),from=top.getBoundingClientRect(),to=document.querySelector('.board').getBoundingClientRect()
 const f=document.createElement('div');f.className='flycard';f.innerHTML=cardFront(cardView(id));Object.assign(f.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});document.body.appendChild(f)
 renderPile()
 // the card flies to exactly where the open card will sit, then hands over to it: no fade, no gap
 showCard(id,true);const card=$('ov').querySelector('.card'),dst=card.getBoundingClientRect()
 f.style.transformOrigin='0 0'
 await Promise.race([f.animate([{transform:'none'},{transform:`translate(${(dst.left-from.left)*.5}px,${(dst.top-from.top)*.5-80}px) rotate(-8deg) scale(${dst.width/from.width*.6},${dst.height/from.height*.6})`,offset:.55},{transform:`translate(${dst.left-from.left}px,${dst.top-from.top}px) scale(${dst.width/from.width},${dst.height/from.height})`}],{duration:T(700),easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).finished.catch(()=>{}),wait(T(700)+60)])
 card.style.visibility='';f.remove();flipSoon(id)}
function showCard(id,flying){const c=cardView(id),k=c.kind==='good'?COL.green:COL.red,ov=$('ov');cardOpen=id
 ov.innerHTML=`<div class="card ${c.titled?'printed':''}" style="--k:${k}${flying?';visibility:hidden':''}"><div class="side front"><div class="art" style="--art:url(${c.art})"></div>${c.titled?'':`<h3>${c.name}</h3><img class="logo" src="logo.png" alt="">`}</div>
  <div class="side back ${c.kind}"><div class="quote">“${c.quote}”</div><div class="rule">${c.rule}</div></div></div><div class="go" id="cardgo"></div>`
 ov.classList.add('on');if(!flying)flipSoon(id,T(900))}
function flipSoon(id,ms=T(350)){const c=cardView(id);setTimeout(()=>{const el=$('ov').querySelector('.card');if(!el||cardOpen!==id)return;el.classList.add('flip');SFX.play('flip');setTimeout(()=>SFX.play(c.kind==='good'?'card_good':'card_bad'),T(250))},ms)}
const OPT={pay:'Pay 2',debt:'Take a loan',capital:'+2 Capital',repay:'Clear 1 debt'}
function cardButtons(){const d=S.decision,g=$('cardgo');if(!g)return;g.innerHTML=''
 if(!d||busy||(d.kind!=='ackCard'&&d.kind!=='cardChoice'))return
 if(!human(d.player)){g.innerHTML=`<div class="rp thinking">${V[d.player].name} is reading…</div>`;return}
 g.innerHTML=d.kind==='ackCard'?'<button class="btn primary" data-c="ok">OK</button>':d.options.map(o=>`<button class="btn ${o==='pay'?'good':o==='debt'?'bad':'primary'}" data-c="${o}">${OPT[o]||o}</button>`).join('')
 g.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>act(d.kind==='ackCard'?{player:d.player,type:'ack'}:{player:d.player,type:'choose',option:b.dataset.c}))}
function closeCard(){if(!cardOpen)return;lastCard=cardOpen;cardOpen=null;const ov=$('ov');ov.classList.remove('on');ov.innerHTML='';renderPile()}

// ---------- moving tokens ----------
// follow any SVG path (ladder arcs, snake curves) with a timer fallback for hidden tabs
function follow(el,d,ms,jump=0){return new Promise(res=>{if(!el)return res();const p=svgEl('path',{d});const L=p.getTotalLength?.()||0;const dx=+(el.dataset.dx||0),body=el.querySelector('.body'),t0=performance.now();let over=false
 const at=t=>{const q=p.getPointAtLength(L*t);return q}
 const end=()=>{if(over)return;over=true;const q=at(1);el.setAttribute('transform',`translate(${q.x+dx},${q.y})`);body?.removeAttribute('transform');res()}
 $('b').appendChild(p);p.style.display='none'
 ;(function f(now){if(over)return;const t=Math.min(1,(now-t0)/ms),e=easeIO(t),q=at(e);el.setAttribute('transform',`translate(${q.x+dx},${q.y})`);if(jump)body?.setAttribute('transform',`translate(0,${-Math.sin(Math.PI*t)*jump})`);if(t<1)requestAnimationFrame(f);else{p.remove();end()}})(t0)
 setTimeout(()=>{p.remove();end()},document.hidden?0:ms+150)})}
let rollPushes=0   // pushes still to come from a sanction: those roll back instead of hopping
// step 6 motion: a cartoon jump up a ladder (crouch, stretch, hang, squash), a fall down a snake, a hedge that brakes
function pathMove(el,d,ms,style){return new Promise(res=>{if(!el)return res();const p=svgEl('path',{d});$('b').appendChild(p);p.style.display='none'
 const L=p.getTotalLength(),body=el.querySelector('.body'),dx=+(el.dataset.dx||0),t0=performance.now();let over=false
 const end=()=>{if(over)return;over=true;const q=p.getPointAtLength(L);el.setAttribute('transform',`translate(${q.x+dx},${q.y})`);body?.removeAttribute('transform');p.remove();res()}
 ;(function f(now){if(over)return;const t=Math.max(0,Math.min(1,(now-t0)/ms));let e=t,lift=0,sx=1,sy=1
  if(style==='hop'){const A=.2,B=.84
   if(t<A){const k=Math.sin(Math.PI/2*t/A);e=0;sx=1+.2*k;sy=1-.24*k}
   else if(t<B){const u=(t-A)/(B-A);e=easeIO(u);lift=150*4*u*(1-u);const st=.22*Math.pow(Math.cos(Math.PI*u),2);sy=1+st;sx=1-st*.6}
   else{const v=(t-B)/(1-B);e=1;sx=1+.26*Math.sin(Math.PI*v);sy=1-.3*Math.sin(Math.PI*v)}}
  else if(style==='brake')e=t*(.6+.4*t)
  else if(style==='fall')e=t*t
  const q=p.getPointAtLength(L*Math.min(1,e));el.setAttribute('transform',`translate(${q.x+dx},${q.y})`);body?.setAttribute('transform',`translate(0,${-lift}) scale(${sx},${sy})`)
  if(t<1)requestAnimationFrame(f);else end()})(t0)
 setTimeout(end,document.hidden?0:ms+150)})}
const kill=(e,a)=>a.finished.then(()=>e.remove()).catch(()=>e.remove())
// a crash: the square shatters into shards that fall away, a red flash, the board shakes, the token is squashed flat
function crashAt(q,el){const g=fxLayer(),{x,y}=cell(q),rnd=(a,b)=>a+Math.random()*(b-a)
 const hole=svgEl('rect',{x:x+7,y:y+7,width:86,height:86,rx:3,fill:'#05070f'});g.appendChild(hole);kill(hole,hole.animate([{opacity:1},{opacity:1,offset:.7},{opacity:0}],{duration:T(1500)}))
 const P=[[0,0],[45,0],[86,0],[86,40],[86,86],[40,86],[0,86],[0,45]],c=[43+rnd(-8,8),43+rnd(-8,8)]
 for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],m=[(a[0]+b[0])/2+rnd(-10,10),(a[1]+b[1])/2+rnd(-10,10)]
  for(const tri of[[a,m,c],[m,b,c]]){const sh=svgEl('polygon',{points:tri.map(p=>`${x+7+p[0]},${y+7+p[1]}`).join(' '),fill:i%2?'#c43a4c':'#1c2a4c',stroke:'#ff9aa2','stroke-width':1.5});g.appendChild(sh)
   const dx=(tri[0][0]+tri[1][0]+c[0])/3-43,dy=(tri[0][1]+tri[1][1]+c[1])/3-43,vx=dx*rnd(3,5),r=rnd(-260,260);sh.style.transformBox='fill-box';sh.style.transformOrigin='center'
   kill(sh,sh.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${vx*.5}px,${dy*2-60}px) rotate(${r*.5}deg)`,opacity:1,offset:.35},{transform:`translate(${vx}px,${dy*2+260}px) rotate(${r}deg)`,opacity:0}],{duration:T(1100),easing:'cubic-bezier(.3,.1,.6,1)'}))}}
 const flash=svgEl('rect',{x:-30,y:-30,width:1060,height:1060,fill:'#ff2a3d'});g.appendChild(flash);kill(flash,flash.animate([{opacity:.38},{opacity:0}],{duration:T(500),easing:'ease-out'}))
 el?.querySelector('.body')?.animate([{transform:'scale(1.7,.3)'},{transform:'scale(1.7,.3)',offset:.45},{transform:'scale(.85,1.2)',offset:.7},{transform:'scale(1)'}],{duration:T(900),easing:'ease-out'})
 document.querySelector('.board').animate([0,1,2,3,4,5,6].map(i=>({transform:i===6?'none':`translate(${rnd(-14,14)}px,${rnd(-10,10)}px) rotate(${rnd(-1,1)}deg)`})),{duration:T(620),easing:'ease-out'})}
// the hedge: the square lights, a shield grows out of it and the token lands on it, then a ripple
function shieldAt(q){const g=fxLayer(),{x,y}=cell(q),m=mid(q)
 const glow=svgEl('rect',{x:x+5,y:y+5,width:90,height:90,rx:6,fill:'#4fdcaa'});g.appendChild(glow);kill(glow,glow.animate([{opacity:0},{opacity:.65,offset:.3},{opacity:0}],{duration:T(1400)}))
 const sh=svgEl('g',{transform:`translate(${m.x},${m.y-6})`});sh.innerHTML=`<g><path d="M0-58 46-40v30c0 32-21 54-46 64-25-10-46-32-46-64v-30z" fill="#4fdcaa40" stroke="#9af5d6" stroke-width="5" stroke-linejoin="round"/><path d="M0-46 34-33v23c0 25-15 42-34 50-19-8-34-25-34-50v-23z" fill="none" stroke="#4fdcaa" stroke-width="2.5" opacity=".7"/></g>`;g.appendChild(sh)
 kill(sh,sh.firstChild.animate([{transform:'scale(.2)',opacity:0},{transform:'scale(1.12)',opacity:1,offset:.25},{transform:'scale(1)',opacity:1,offset:.6},{transform:'scale(1)',opacity:0}],{duration:T(1500),easing:'cubic-bezier(.2,.9,.3,1)'}))
 setTimeout(()=>ringFx(m,COL.green,40,700,6),T(180))}
// skipping a ladder: a small double bounce in place and a soft ring
function nopeFx(i){const el=$('pk'+i);el?.querySelector('.body')?.animate([{transform:'translate(0,0)'},{transform:'translate(0,-22px) scale(.95,1.08)'},{transform:'translate(0,0) scale(1.08,.92)'},{transform:'translate(0,-10px)'},{transform:'translate(0,0)'}],{duration:T(560),easing:'ease-out'});ringFx(mid(V[i].sq),COL.gold,40,700,4)}
// landing on someone else's square: bump the owner, gold rings, the knight badge pops above and throbs (takeover build-up)
async function clashFx(p){const sq=V[p].sq,others=V.map((_,i)=>i).filter(i=>i!==p&&V[i].sq===sq);if(!others.length)return
 const m=mid(sq),g=fxLayer();ringFx(m,COL.gold,34,600,6);setTimeout(()=>ringFx(m,COL.gold,34,700,3),T(180))
 $('pk'+p)?.querySelector('.body')?.animate([{transform:'none'},{transform:'translate(10px,0) scale(1.15,.85)'},{transform:'none'}],{duration:T(320)})
 others.forEach(o=>$('pk'+o)?.querySelector('.body')?.animate([{transform:'none'},{transform:'translate(16px,-6px) rotate(14deg)',offset:.35},{transform:'translate(-4px,0)',offset:.7},{transform:'none'}],{duration:T(560)}))
 const sw=svgEl('g',{});sw.innerHTML='<g><image href="/icons/takeover.svg" x="-26" y="-26" width="52" height="52" style="filter:drop-shadow(0 4px 6px #000a)"/></g>';g.appendChild(sw)
 sw.animate([{transform:`translate(${m.x}px,${m.y-30}px) scale(0) rotate(-40deg)`},{transform:`translate(${m.x}px,${m.y-80}px) scale(1.3) rotate(8deg)`,offset:.55},{transform:`translate(${m.x}px,${m.y-74}px) scale(1) rotate(0)`}],{duration:T(480),easing:'cubic-bezier(.3,0,.3,1.4)',fill:'forwards'})
 setTimeout(()=>sw.firstChild.animate([{transform:'scale(1)'},{transform:'scale(1.15)'},{transform:'scale(1)'},{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:T(900)}),T(500))
 await wait(1100);sw.animate([{opacity:1},{opacity:0}],{duration:T(300),fill:'forwards'});setTimeout(()=>sw.remove(),T(320))}
// in debt and into the last 20 squares (rolls halved): the squares there flush red and a dark aura spreads from the token
async function crunchFx(p){const g=fxLayer(),m=mid(V[p].sq),from=S.config.crunchFrom
 for(let q=from;q<=100;q++){const c=cell(q),d=Math.hypot(c.x+50-m.x,c.y+50-m.y),r=svgEl('rect',{x:c.x+5,y:c.y+5,width:90,height:90,rx:6,fill:'#ff2a3d',opacity:0});g.appendChild(r)
  kill(r,r.animate([{opacity:0},{opacity:.45,offset:.3},{opacity:0}],{duration:T(900),delay:T(d*1.1),fill:'both'}))}
 ;[0,180,360].forEach(dl=>setTimeout(()=>ringFx(m,'#ff2a3d',30,900,7),T(dl)))
 say(`${V[p].name} is in debt in the last 20 squares: rolls are halved`);await wait(700)}
let hedgeNext=false
async function moveFx(e){const el=$('pk'+e.player),a=e.path[0],b=e.path[e.path.length-1]
 if(e.via==='walk')await hopPath(el,e.path,T(Math.min(1600,230*(e.path.length-1))))
 else if(e.via==='ladder'){SFX.play('ladder');const lt=routeLook==='live'&&travelD(a,b);if(lt)routePulse($('b'),a,b,T(1100));await pathMove(el,lt||arcD(a,b),T(lt?1100:1000),lt?'brake':'hop')}
 else if(e.via==='snake'){SFX.play('snake');const st=routeLook==='live'&&travelD(a,b);if(st)routePulse($('b'),a,b,T(1100));if(hedgeNext){hedgeNext=false;await pathMove(el,st||snakeRoute(range(a,b)),T(820),'brake');SFX.play('shield');shieldAt(b)}else{await pathMove(el,st||snakeRoute(range(a,b)),T(1100),'fall');SFX.play('crash');crashAt(b,el)}}
 else if(e.via==='push'&&rollPushes>0){rollPushes--;await rollPath(el,e.path,T(1100))}
 else await hopPath(el,e.path,T(Math.min(1400,260*(e.path.length-1))))
 V[e.player].sq=b
 if(e.via==='walk')await clashFx(e.player)
 const crunch=S.config.crunchFrom;if(V[e.player].debt>0&&a<crunch&&b>=crunch)await crunchFx(e.player)}

// ---------- effects ----------
function floater(i,txt,up){const r=document.querySelector(`.row[data-i="${i}"] .cash`)?.getBoundingClientRect();if(!r)return;const f=document.createElement('div');f.className='floater '+(up?'up':'dn');f.textContent=txt;f.style.left=r.left+'px';f.style.top=r.top+'px';document.body.appendChild(f)
 f.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-34px)',opacity:0}],{duration:T(1100),easing:'ease-out',fill:'forwards'}).finished.then(()=>f.remove(),()=>f.remove());setTimeout(()=>f.remove(),1300)}
async function tariffFx(from,to){const g=fxLayer(),o=mid(V[from].sq),m=mid(V[to].sq),cx=(o.x+m.x)/2+(o.y-m.y)*.25,cy=(o.y+m.y)/2-Math.abs(o.x-m.x)*.15-40
 const n=svgEl('g',{});n.innerHTML='<g><rect x="-17" y="-22" width="34" height="44" rx="5" fill="#fff6ea" stroke="#d8521f" stroke-width="2.2"/><rect x="-17" y="-22" width="34" height="10" rx="5" fill="#ee7a32"/><text y="12" text-anchor="middle" fill="#d8521f" style="font:900 19px Nunito">%</text></g>';g.appendChild(n)
 await Promise.race([n.animate([{transform:`translate(${o.x}px,${o.y}px) scale(.4) rotate(-200deg)`},{transform:`translate(${cx}px,${cy}px) scale(1.25) rotate(-60deg)`,offset:.5},{transform:`translate(${m.x}px,${m.y-52}px) scale(1) rotate(0)`}],{duration:T(650),easing:'cubic-bezier(.3,.6,.4,1)',fill:'forwards'}).finished.catch(()=>{}),wait(700)])
 ringFx(m,COL.orange,30,520,5);setTimeout(()=>n.remove(),T(900))}
// sanction: the approved effect from the workbench (gavels from every other player merge, the blow, ripples)
async function sanctionFx(ki){const k=V[ki],km=mid(k.sq),g=fxLayer(),G=window.GAVEL_SRC,T=ms=>document.hidden?1:ms
  g.insertAdjacentHTML('beforeend',`<defs><radialGradient id="spot" gradientUnits="userSpaceOnUse" cx="${km.x}" cy="${km.y}" r="170"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#05030a" stop-opacity=".75"/></radialGradient>
   <mask id="clr" maskUnits="userSpaceOnUse" x="-40" y="-40" width="1080" height="1080"><rect x="-40" y="-40" width="1080" height="1080" fill="#fff"/><circle id="hole" cx="${km.x}" cy="${km.y}" r="1500" fill="#000" style="transform-box:fill-box;transform-origin:center;transform:scale(0)"/></mask></defs>`)
  const dim=svgEl('rect',{x:-40,y:-40,width:1080,height:1080,fill:'url(#spot)',mask:'url(#clr)',opacity:0});g.appendChild(dim)
  const rows=document.querySelectorAll('#rows .row'),voters=V.map((_,i)=>i).filter(i=>i!==ki),N=voters.length
  // the gavel image: head at (29%,29%), handle end at (60%,62%); the head is .45S from the handle end.
  // rotate(+40deg) lifts the head straight up; rotate(-47deg) brings it down level, onto the token to its left.
  // Every gavel is the big image scaled down around its handle end, so the flyers land exactly on the big one.
  const BIG=230,pivot={x:km.x+.45*BIG,y:km.y-14},s0=70/BIG,grow=n=>.4+.6*(n+1)/N
  const gav=()=>{const im=svgEl('image',{href:G,width:BIG,height:BIG,x:pivot.x-.6*BIG,y:pivot.y-.62*BIG});im.style.transformBox='fill-box';im.style.transformOrigin='60% 62%';im.style.filter='drop-shadow(0 0 10px #f5dc94aa)';g.appendChild(im);return im}   // the glow keeps black lacquer visible on the dark board
  const big=gav();big.style.opacity=0;SFX.play('gavelRise')
  const fl=voters.map(i=>{const a=mid(V[i].sq),im=gav(),at=`translate(${a.x-pivot.x}px,${a.y-pivot.y}px)`
   im.animate([{transform:`${at} scale(0) rotate(40deg)`,opacity:0},{transform:`${at} scale(${s0}) rotate(40deg)`,opacity:1}],{duration:T(320),easing:'cubic-bezier(.3,0,.3,1.5)',fill:'forwards'})
   ringFx(a,'#e2b552',26,520,4);rows[i]?.animate([{boxShadow:'inset 0 0 0 2px #e2b552'},{boxShadow:'inset 0 0 0 0 transparent'}],{duration:900});return{im,at}})
  await wait(650)
  dim.animate([{opacity:0},{opacity:1}],{duration:T(700),fill:'forwards'})
  let size=0
  await Promise.all(fl.map(({im,at},n)=>new Promise(res=>{const to=grow(n)
   const an=im.animate([{transform:`${at} scale(${s0}) rotate(40deg)`},{transform:`${at} scale(${s0*1.3}) rotate(220deg)`,offset:.45},{transform:`translate(0,0) scale(${to}) rotate(400deg)`}],{duration:T(640),delay:T(n*170),easing:'cubic-bezier(.45,0,.35,1)',fill:'forwards'})
   let done=false;const fin=()=>{if(done)return;done=true;im.remove();SFX.play('gavelMerge',n)
    big.animate([{transform:`rotate(40deg) scale(${size||to*.9})`,opacity:size?1:.6},{transform:`rotate(40deg) scale(${to*1.08})`,opacity:1,offset:.5},{transform:`rotate(40deg) scale(${to})`,opacity:1}],{duration:T(220),fill:'forwards'});big.style.opacity=1;size=to;res()}
   an.finished.then(fin,fin);setTimeout(fin,640+n*170+80)})))   // frames can stall in a hidden tab: the timer keeps it moving
  await wait(260)
  // wind up, then down once
  SFX.play('gavelWind');await Promise.race([big.animate([{transform:'rotate(40deg) scale(1)'},{transform:'rotate(48deg) scale(1)'}],{duration:T(200),fill:'forwards',easing:'ease-out'}).finished.catch(()=>{}),wait(240)])
  big.animate([{transform:'rotate(48deg)'},{transform:'rotate(-47deg)',offset:.85},{transform:'rotate(-40deg)'}],{duration:T(260),easing:'cubic-bezier(.7,0,1,.6)',fill:'forwards'})
  await wait(200);SFX.play('gavelStrike');const el=document.getElementById('pk'+ki)
  el.querySelector('.body').animate([{transform:'scale(1.7,.3)'},{transform:'scale(1.7,.3)',offset:.45},{transform:'none'}],{duration:600})
  document.querySelector('.board').animate([0,1,2,3,4,5,6,7].map(i=>{const a=12*(1-i/7);return{transform:i===7?'none':`translate(${i%2?-a:a}px,${(i%2?.5:-.5)*a}px) rotate(${(i%2?-.4:.4)*(1-i/7)}deg)`}}),{duration:560,easing:'ease-out'})
  rows[ki]?.animate([{boxShadow:'inset 0 0 0 2px #ff6b78'},{boxShadow:'inset 0 0 0 0 transparent'}],{duration:900})
  // the blow sends ripples out across the board; the dark clears behind the first one
  const RIP=T(1300);boardRipple(km,RIP);SFX.play('shockwave')
  pixelWave(km,RIP*1.15)
document.getElementById('hole').animate([{transform:'scale(0)'},{transform:'scale(1)'}],{duration:RIP,easing:'cubic-bezier(.2,.6,.4,1)',fill:'forwards'})
  ;[['#c4a0ff',7,0],['#e2b552',3,140],['#c4a0ff',2,300]].forEach(([c,w,d])=>{const r=svgEl('circle',{cx:km.x,cy:km.y,r:1500,fill:'none',stroke:c,'stroke-width':w,'vector-effect':'non-scaling-stroke'});r.style.transformBox='fill-box';r.style.transformOrigin='center';g.appendChild(r)
   r.animate([{transform:'scale(0)',opacity:1},{transform:'scale(1)',opacity:0}],{duration:RIP,delay:T(d),easing:'cubic-bezier(.2,.6,.4,1)',fill:'both'}).finished.then(()=>r.remove(),()=>{})})
  await wait(420);big.animate([{opacity:1},{opacity:0}],{duration:250,fill:'forwards'})
  dim.animate([{opacity:1},{opacity:0}],{duration:400,fill:'forwards'});setTimeout(()=>dim.remove(),450)}
async function duelFx(e){const ov=$('ov'),A=V[e.challenger],B=V[e.defender]
 ov.innerHTML=`<div class="duelov"><div class="cols"><div class="col" id="dA">${mini(A)}<b>${A.name}</b></div><span class="vsx">VS</span><div class="col" id="dB">${mini(B)}<b>${B.name}</b></div></div><canvas id="dcv"></canvas><div class="msg" id="dmsg">Rolling…</div></div>`;ov.classList.add('on')
 const d2=window.duelDice($('dcv'),2,dieLook),msg=t=>$('dmsg').textContent=t
 for(const [a,b] of e.rolls){SFX.play('duel');await d2.roll(a,b);if(a===b){msg(`Both rolled ${a}. Roll again`);await wait(700)}}
 const [a,b]=e.rolls[e.rolls.length-1],w=e.winner===e.challenger
 $(w?'dA':'dB').classList.add('win');$(w?'dB':'dA').classList.add('lose');msg(`${Math.max(a,b)} beats ${Math.min(a,b)}. ${V[e.winner].name} wins`)
 await wait(1500);ov.classList.remove('on');ov.innerHTML='';d2.dispose()}
// every country's perk, and who is playing it
function countriesInfo(){const ov=$('ov');if(ov.classList.contains('on')&&!ov.querySelector('.ctys'))return
 ov.innerHTML=`<div class="fin ctys"><h2>Countries</h2>${COUNTRY_IDS.map(c=>{const who=S?S.players.map((p,i)=>p.country===c?i:-1).filter(i=>i>=0):[];return`<div class="fr"><span></span><span class="mini" style="--art:url(/art/countries/${c}.jpg)${who.length?`;box-shadow:0 0 0 2.5px ${PC[who[0]]}`:''}"></span><div>${COUNTRIES[c].name}${who.length?` · ${S.players[who[0]].name}`:''}<small>${COUNTRIES[c].perk}</small></div><span></span></div>`}).join('')}<div class="go"><button class="btn primary" id="ctyx">Close</button></div></div>`
 ov.classList.add('on');$('ctyx').onclick=()=>{ov.classList.remove('on');ov.innerHTML=''}}
function ledger(){const r=S.result,ov=$('ov'),w=V[r.rows.find(x=>x.rank===1).player]
 ov.innerHTML=`<div class="fin"><h2>Final ledger</h2><div class="wcard" style="background-image:url(${cardImg(w.c)})"></div><div class="wname">${w.name}</div>${r.rows.map(x=>`<div class="fr ${x.rank===1?'win':''}"><b>${x.rank}</b>${mini(V[x.player])}<div>${V[x.player].name}<small>${x.capital} capital${x.bonus?` (incl. +${x.bonus} for 100)`:''}${x.debtCost?` · −${x.debtCost} open loans`:''}</small></div><span class="nw">${x.netWorth}</span></div>`).join('')}
  <div class="go"><button class="btn primary" id="again">Play again</button></div></div>`
 ov.classList.add('on');$('again').onclick=()=>{ov.classList.remove('on');ov.innerHTML='';setup()}}

// ---------- the move log (1 Nov): the last seven things that happened, newest on top, older ones fading ----------
let MOVES=[],lastRoll=[]
const DIE_I='<svg viewBox="0 0 20 20" width="17" height="17"><rect x="2" y="2" width="16" height="16" rx="4.5" fill="#f3eee4" stroke="#c9962f" stroke-width="1.6"/><circle cx="7" cy="7" r="1.7" fill="#1b2440"/><circle cx="13" cy="13" r="1.7" fill="#1b2440"/></svg>'
const ic=t=>`<img src="/icons/${t}" width="19" height="19" alt="">`,COIN_I=()=>window.coinImg?.(17)||''
function note(p,icon,txt){MOVES.unshift({p,icon,txt,t:Date.now()});MOVES.length=Math.min(MOVES.length,7);renderMoves()}
function renderMoves(){const el=$('moves');if(!el||!V)return
 el.innerHTML=MOVES.map((m,i)=>`<div class="mv ${i===0&&Date.now()-m.t<400?'new':''}" style="opacity:${(1-i*.13).toFixed(2)}"><span class="av" style="--art:url(/art/countries/${V[m.p].c}.jpg);--pcol:${PC[m.p]}"></span><span class="mi">${m.icon}</span><span>${m.txt}</span></div>`).join('')}

// ---------- the character cards in play (1 Nov) ----------
const cardImg=c=>`/art/countries/cards/${c}.jpg`
// game start: each player's card is dealt from the middle of the board, turns face up and settles into their seat
async function dealIn(){const bd=document.querySelector('.board').getBoundingClientRect(),W=Math.min(150,bd.width*.2),H=W*1.4,cx=bd.left+bd.width/2,cy=bd.top+bd.height/2
 await Promise.all(V.map((p,i)=>new Promise(res=>{const to=document.querySelector(`.row[data-i="${i}"] .por`)?.getBoundingClientRect();if(!to||document.hidden)return res()
  const d=document.createElement('div');d.className='dealc';d.innerHTML=`<div class="di"><div class="dbk"></div><div class="dfr" style="background-image:url(${cardImg(p.c)})"></div></div>`
  Object.assign(d.style,{left:cx-W/2+'px',top:cy-H/2+'px',width:W+'px',height:H+'px'});document.body.appendChild(d)
  const k=to.width/W,tx=to.left+to.width/2-cx,ty=to.top+to.height/2-cy,off=(i-(V.length-1)/2)*W*.62,dl=i*260
  setTimeout(()=>SFX.play('card'),dl);setTimeout(()=>SFX.play('flip'),dl+380)
  d.animate([{transform:'translateY(40px) scale(.5)',opacity:0},{transform:`translate(${off}px,0) scale(1)`,opacity:1,offset:.3},{transform:`translate(${off}px,0) scale(1)`,offset:.62},{transform:`translate(${tx}px,${ty}px) scale(${k})`,opacity:1,offset:.94},{transform:`translate(${tx}px,${ty}px) scale(${k})`,opacity:0}],{duration:1500,delay:dl,easing:'cubic-bezier(.45,0,.25,1)',fill:'both'})
  d.firstChild.animate([{transform:'rotateY(0)'},{transform:'rotateY(0)',offset:.25},{transform:'rotateY(180deg)',offset:.5},{transform:'rotateY(180deg)'}],{duration:1500,delay:dl,easing:'ease-in-out',fill:'both'})
  setTimeout(()=>{d.remove();document.querySelector(`.row[data-i="${i}"] .por`)?.animate([{transform:'scale(1.25)'},{transform:'none'}],{duration:320,easing:'ease-out'});res()},1500+dl)})))}
// a perk at work: that player's card peeks out beside their seat for a moment with what it just did
function peek(p,txt){const row=document.querySelector(`.row[data-i="${p}"]`)?.getBoundingClientRect();if(!row||document.hidden)return
 const d=document.createElement('div');d.className='peek';d.innerHTML=`<div class="pk" style="background-image:url(${cardImg(V[p].c)})"></div><span>${txt}</span>`
 Object.assign(d.style,{left:row.left-128+'px',top:row.top+row.height/2-70+'px'});document.body.appendChild(d);SFX.play('flip')
 d.animate([{transform:'translateX(70px) rotate(10deg)',opacity:0},{transform:'translateX(0) rotate(-5deg)',opacity:1,offset:.15},{transform:'translateX(0) rotate(-4deg)',opacity:1,offset:.85},{transform:'translateX(60px) rotate(8deg)',opacity:0}],{duration:2400,easing:'ease-out',fill:'forwards'}).finished.then(()=>d.remove(),()=>d.remove());setTimeout(()=>d.remove(),2600)}
function perkOf(e,p){const c=V[p]?.c,cfg=S.config;switch(e.type){
 case 'capital':return e.reason==='export surplus'?'Export surplus: +'+e.delta:e.reason==='export champion'?'Export champion: +'+e.delta:e.reason==='borrowed'&&c==='uk'?'Each loan pays 2':''
 case 'tariffHit':return c==='china'?'Only back '+e.setback:''
 case 'hedged':return c==='japan'?'Hedge 1 cheaper':''
 case 'projectCreated':{const x=e.project;return c==='usa'&&x.chips>cfg.maxInvest?`Invested ${x.chips}`:c==='germany'&&x.profit>x.chips*x.delta?'Made in Germany: +'+(x.profit-x.chips*x.delta):c==='bangladesh'&&x.delta<=cfg.bangladeshMaxDelta?'Matures a turn sooner':''}}
 return ''}

// ---------- play one batch of engine events ----------
const PAID={invested:1,hedged:1,'repaid debt':1,'hostile takeover':1}
async function play(events){
 if(cardOpen&&!events.some(e=>e.type==='cardDrawn'))closeCard()
 for(const e of events){const p=e.player;dod.count[e.type]=(dod.count[e.type]||0)+1
  {const k=p!=null&&perkOf(e,p);if(k)peek(p,k)}
  switch(e.type){
   case 'turnStarted':CUR=p;if(human(p))SFX.play('turn');setSpeed();say(V[p].name==='You'?'Your turn':`${V[p].name}'s turn`);drawBoard();renderRows();rollCard();bankBadge();await wait(250);break
   case 'turnSkipped':note(p,ic('event.svg'),'skips a turn');say(`${V[p].name} is under embargo and skips a turn`);await wait(700);break
   case 'diceRolled':{const rn=$('rn');rn?.classList.remove('on');lastRoll[p]=e.value;SFX.play('dice');if((window.SPEED??1)>=.1)await dd?.roll(e.raw);if(rn){rn.textContent=e.value;rn.classList.add('on')}
    say(`${V[p].name} rolled ${e.raw}${e.crunched?', halved by the crunch':''}${e.bonus?`, +${e.bonus}`:''}`);await wait(350);break}
   case 'noMove':note(p,DIE_I,e.reason==='zero'?'no move':`${lastRoll[p]} · stays (would pass 100)`);say(e.reason==='zero'?`${V[p].name} doesn't move`:`${V[p].name} would pass 100 and stays`);await wait(600);break
   case 'moved':{const a=e.path[0],b=e.path.at(-1),mk={walk:[DIE_I,`${lastRoll[p]} · ${a} → ${b}`],ladder:[ic('ladder.svg'),`ladder ${a} → ${b}`],snake:[ic('snake.svg'),`${hedgeNext?'hedged ':''}snake ${a} → ${b}`],card:[ic('event.svg'),`card ${a} → ${b}`]}[e.via]
    if(mk)note(p,...mk);await moveFx(e);break}
   case 'capital':V[p].cap+=e.delta;SFX.play(e.delta>0?'coinUp':'coinDown');if(e.delta<0&&PAID[e.reason]&&p===CUR)await toBank(-e.delta);floater(p,(e.delta>0?'+':'')+e.delta,e.delta>0);renderRows();break
   case 'debt':if(e.reason==='borrowed'||e.delta<0)note(p,COIN_I(),e.delta>0?`borrowed ${e.delta}`:`repaid ${-e.delta}`);V[p].debt+=e.delta;if(e.delta>0&&e.reason==='borrowed')await fromBank(e.delta);renderRows();bankBadge();break
   case 'waiver':V[p].waiver+=e.delta;renderRows();break
   case 'projectCreated':note(p,COIN_I(),`invested ${e.project.chips} on ${e.project.delta>0?'Δ'+e.project.delta:'a ladder'}`);SFX.play('invest');V[p].proj.push({id:e.project.id,profit:e.project.profit,ttm:e.project.ttm});result(p,COL.green,ICON('ladder'),'Invested',`<div class="rvis"><div class="ln">${proj(e.project.profit,e.project.ttm)}<span class="paid">paid <b>${e.project.chips}</b>${coin(15)}</span></div></div>`);break
   case 'projectTicked':{const x=V[p].proj.find(x=>x.id===e.id);if(x)x.ttm=e.ttm;break}
   case 'projectChanged':{const x=V[p].proj.find(x=>x.id===e.id);if(x)x.profit=e.profit;renderRows();break}
   case 'projectMatured':note(p,COIN_I(),`project pays ${e.profit}`);V[p].proj=V[p].proj.filter(x=>x.id!==e.id);say(`${V[p].name}'s project pays ${e.profit}`);renderRows();await wait(250);break
   case 'projectLost':{note(p,ic('snake.svg'),'loses a project');const x=V[p].proj.find(x=>x.id===e.id);V[p].proj=V[p].proj.filter(y=>y.id!==e.id);say(`${nm(p)} loses a project`);result(p,COL.red,ICON('snake'),'Market crash',`<div class="rvis"><div class="ln">${x?proj(x.profit,x.ttm,'lose'):''}<span class="gone">✕ lost</span></div></div>`);break}
   case 'projectStolen':{const x=V[e.from].proj.find(x=>x.id===e.id);V[e.from].proj=V[e.from].proj.filter(y=>y.id!==e.id);if(x)V[e.to].proj.push(x);renderRows();break}
   case 'hedged':note(p,COIN_I(),`hedged for ${e.cost}`);hedgeNext=true;say(`${nm(p)} hedged for ${e.cost}`);{const b=best(p);result(p,COL.green,SH,'Hedged',`<div class="rvis"><div class="ln"><span class="ok">✓ safe</span>${b?proj(b.profit,b.ttm):''}<span class="paid">paid <b>${e.cost}</b>${coin(15)}</span></div></div>`)};break
   case 'cardDrawn':note(p,ic('event.svg'),cardView(e.card).name);SFX.play('card');say(`${V[p].name} draws an event card`);await drawCard(p,e.card);break
   case 'deckShuffled':say('The event deck is reshuffled');break
   case 'tariffHit':note(p,ic('tariff.svg'),`tariff, back ${e.setback}`);SFX.play('tariff');say(`Tariff: ${V[p].name} back ${e.setback}`);await tariffFx(e.from,p);break
   case 'waiverUsed':note(p,ic('waiver.png'),'uses a waiver');SFX.play('waiver');ringFx(mid(V[p].sq),COL.green,30,600,6);say(`${V[p].name} uses a waiver`);break
   case 'tariffCancelled':ringFx(mid(V[p].sq),COL.green,40,700,6);say('Trade Corridor: the tariff is cancelled');await wait(500);break
   case 'sanctionHit':note(p,ic('sanction.svg'),`sanctioned, back ${e.setback}`);say(`Sanction: ${V[p].name} goes back ${e.setback}`);await sanctionFx(p);rollPushes++;break
   case 'statusAdded':break
   case 'duel':await duelFx(e);note(e.winner,ic('takeover.svg'),`wins a duel with ${nm(e.winner===e.challenger?e.defender:e.challenger)}`);break
   case 'finished':note(p,ic('goal.svg'),`reaches 100, +${e.bonus}`);SFX.play('win');say(`${V[p].name} reaches 100! +${e.bonus}`);await wait(600);break
  }
  }
 rollPushes=0}

// ---------- act: one intent through the engine ----------
async function act(intent){if(busy||!intent)return;if(intent.type==='roll'&&GOD.roll){S=forceRoll(S,GOD.roll);if(!GOD.lock)GOD.roll=0;godRender()}const r=step(S,intent);if(r.error){console.warn(r.error);return}
 busy=true;clearTimeout(botT);hov=null;hovN=0;renderRows();rollCard()
 if(intent.type==='invest'&&!intent.chips){nopeFx(intent.player);await wait(560)}
 if(intent.type==='takeDebt'||intent.type==='repay'){}else bankClose()
 try{await play(r.events)}catch(err){console.error(err)}
 S=r.state;V=view(S);busy=false
 // the card stays on screen while its OK or choice is pending
 if(cardOpen&&!(S.decision&&(S.decision.kind==='ackCard'||S.decision.kind==='cardChoice')))closeCard()
 render()}

// ---------- save: the engine state is plain JSON, so the last game is one localStorage key ----------
const save=()=>{if(!S)return;if(S.phase==='finished'){store('dod-save','');return}store('dod-save',JSON.stringify({S,SEATS,lastCard,at:Date.now()}))}
const saved=()=>{try{const v=JSON.parse(store('dod-save')||'null');return v?.S?.players?v:null}catch(e){return null}}
function resume(){const v=saved();if(!v)return;S=v.S;SEATS=v.SEATS;lastCard=v.lastCard||null;CUR=S.current;V=view(S);TOK=[];busy=false;cardOpen=null
 renderTokens(S.players.map((p,i)=>[p.country,PC[i]])).then(t=>{TOK=t;if(!busy)drawBoard()}).catch(e=>console.warn('tokens',e))
 MOVES=[];lastRoll=[];renderMoves();$('setup').classList.remove('on');$('ov').classList.remove('on');$('ov').innerHTML='';const d=S.decision;if(d&&(d.kind==='ackCard'||d.kind==='cardChoice'))showCard(d.card);render();say(`Resumed: ${V[CUR].name==='You'?'your':V[CUR].name+"'s"} turn`)}
function render(){save();if(GOD.on)setTimeout(godRender);drawBoard();renderRows();rollCard();bankBadge();renderPile();cardButtons()
 if(S.phase==='finished'){ledger();return}
 const d=S.decision
 if(d&&!human(d.player)&&!GOD.pause){clearTimeout(botT);const cur=S;botT=setTimeout(()=>{if(S===cur&&!busy)act(botIntent(S))},T(d.kind==='debtWindow'||d.kind==='roll'?600:900))}}

// ---------- setup: seats, names, human or bot, countries ----------
const NAMES=['You','Ana','Bo','Kenji','Lena','Rafi']
let N=4,SEAT=[...Array(6)].map((_,i)=>({name:NAMES[i],bot:i>0,c:'random'})),PICK=0   // PICK: the seat the card row is choosing for
// two screens: 1 players (count, names, human or bot), 2 cards (each seat takes a printed card, or Random)
let STEP=1,JUST=null
const FLIPPED=new Set()
// the printed character backs (6 Country Cards.ai): title and quote as printed; the perk is the game's rule
const PRINT_NAME={usa:'United States',china:'China',japan:'Japan',germany:'Germany',bangladesh:'Bangladesh',uk:'United Kingdom'}
const CQUOTE={usa:'Wall Street’s ocean of capital lets investors pour funds deeper and faster than any rival.',
 china:'Factory might and state backing trim tariff shocks to a mere two-square stumble.',
 japan:'Meticulous risk culture slices hedge costs to the leanest, safeguarding every venture.',
 germany:'Precision efficiency turns a tidy two-chip stake into premium profit on the balance sheet.',
 bangladesh:'Agile garment lines fast-track smaller projects, maturing modest climbs one turn sooner.',
 uk:'London’s financial arteries convert fresh debt into instant capital on the global stage.'}
function setup(){const el=$('setup');el.classList.add('on');const seats=SEAT.slice(0,N),nm=i=>SEAT[i].name.trim()||NAMES[i]
 const resumeBtn=(()=>{const v=saved();if(!v)return'';const ago=Math.round((Date.now()-v.at)/60000),lead=Math.max(...v.S.players.map(p=>p.square))
  return`<button class="btn" id="resume">Resume last game<small>${v.S.players.length} players, leader on ${lead}, ${ago<1?'just now':ago<60?ago+' min ago':ago<1440?Math.round(ago/60)+' h ago':Math.round(ago/1440)+' d ago'}</small></button>`})()
 if(STEP===1){el.innerHTML=`<div class="sbox"><h1>Deal or Default</h1><div class="sub">Players and bots</div>
  <div class="scount">${[2,3,4,5,6].map(n=>`<button class="${n===N?'on':''}" data-pc="${n}">${n}</button>`).join('')}</div>
  ${seats.map((s,i)=>`<div class="seat"><span class="snum">${i+1}</span><input value="${s.name}" data-nm="${i}" aria-label="Name"><div class="who2"><button class="${s.bot?'':'on'}" data-hb="${i}:0">Human</button><button class="${s.bot?'on':''}" data-hb="${i}:1">Bot</button></div></div>`).join('')}
  <div class="go">${resumeBtn}<button class="btn primary" id="next">Choose cards</button></div></div>`
  el.querySelectorAll('[data-pc]').forEach(b=>b.onclick=()=>{N=+b.dataset.pc;PICK=Math.min(PICK,N-1);setup()})
  el.querySelectorAll('[data-nm]').forEach(b=>b.oninput=()=>SEAT[+b.dataset.nm].name=b.value)
  el.querySelectorAll('[data-hb]').forEach(b=>b.onclick=()=>{const[i,v]=b.dataset.hb.split(':');SEAT[+i].bot=v==='1';setup()})
  $('next').onclick=()=>{STEP=2;PICK=Math.max(0,seats.findIndex(s=>s.c==='random'));setup()}
  if($('resume'))$('resume').onclick=resume;return}
 const pc=SEAT[PICK].c
 el.innerHTML=`<div class="sbox wide"><h1>Choose your cards</h1>
  <div class="who3">${seats.map((s,i)=>`<button class="${i===PICK?'on':''}" data-ps="${i}"><span class="sc" style="${s.c==='random'?'':`background-image:url(/art/countries/cards/${s.c}.jpg)`}">${s.c==='random'?'?':''}</span>${nm(i)}${s.bot?'<small>bot</small>':''}</button>`).join('')}</div>
  <div class="cph">Card for <b>${nm(PICK)}</b></div>
  <div class="cards big">${COUNTRY_IDS.map(c=>{const who=seats.findIndex(s=>s.c===c),C=COUNTRIES[c];return`<button class="pc ${who===PICK?'mine':who>=0?'taken':''} ${FLIPPED.has(c)&&c!==JUST?'flip':''}" data-cc="${c}" aria-label="${C.name}"><div class="pci">
   <div class="pf" style="background-image:url(/art/countries/cards/${c}.jpg)"></div>
   <div class="pb"><b>${PRINT_NAME[c]}</b><p>${C.perk}</p><i>“${CQUOTE[c]}”</i></div></div>${who>=0&&who!==PICK?`<em>${nm(who)}</em>`:''}</button>`}).join('')}</div>
  <div class="go row"><button class="btn" id="back">Back</button><button class="btn ${pc==='random'?'on':''}" data-cc="random">Random for ${nm(PICK)}</button><button class="btn primary" id="start">Start game</button></div></div>`
 if(JUST){const j=JUST;JUST=null;requestAnimationFrame(()=>requestAnimationFrame(()=>el.querySelector(`.pc[data-cc="${j}"]`)?.classList.toggle('flip',FLIPPED.has(j))))}
 el.querySelectorAll('[data-ps]').forEach(b=>b.onclick=()=>{PICK=+b.dataset.ps;setup()})
 // a card goes to the seat being picked for and turns over to show its perk; clicking it again turns it back.
 // taking someone's card sends them back to random; then on to the next seat still on random
 el.querySelectorAll('[data-cc]').forEach(b=>{const c=b.dataset.cc
  b.onclick=()=>{if(c!=='random'){JUST=c;if(SEAT[PICK].c===c&&FLIPPED.has(c)){FLIPPED.delete(c);setup();return}FLIPPED.add(c);SFX.play('flip')}
   if(c!=='random')seats.forEach(s=>{if(s.c===c)s.c='random'});SEAT[PICK].c=c
   if(c!=='random'){const nx=seats.findIndex((s,i)=>i>PICK&&s.c==='random');if(nx>=0)PICK=nx}setup()}})
 $('back').onclick=()=>{STEP=1;setup()};$('start').onclick=start}
function start(){const seats=SEAT.slice(0,N),picked=seats.map(s=>s.c).filter(c=>c!=='random')
  const pool=COUNTRY_IDS.filter(c=>!picked.includes(c)).sort(()=>Math.random()-.5)
 const countries=seats.map(s=>s.c==='random'?pool.pop():s.c)
 SEATS=seats.map(s=>({bot:s.bot}))
 const r=newGame({names:seats.map((s,i)=>s.name.trim()||NAMES[i]),seed:Math.floor(Math.random()*1e9),countries})
 S=r.state;CUR=S.current;V=view(S);lastCard=null;TOK=[];MOVES=[];lastRoll=[]
 renderTokens(countries.map((c,i)=>[c,PC[i]])).then(t=>{TOK=t;if(!busy)drawBoard()}).catch(e=>console.warn('tokens',e))
STEP=1;$('setup').classList.remove('on');$('ov').classList.remove('on');$('ov').innerHTML=''
 busy=true;render();renderMoves();say(`${V[CUR].name} starts`);setTimeout(()=>dealIn().then(()=>{busy=false;render()}),350)}


// ---------- test mode (his "god mode"): edit the live state, fix the next roll or card, pause bots ----------
// edits go straight into the engine state between steps, so everything after them plays by the real rules
const GOD={on:false,p:0,roll:0,lock:false,pause:false}
const clone=s=>JSON.parse(JSON.stringify(s))
// the next roll comes from S.rng: walk the seed until the die shows the wanted face (a few tries at most)
function forceRoll(s,v){const c=clone(s);let r=c.rng;for(let k=0;k<500&&rngRoll(r)[0]!==v;k++)r=(r+1)|0;c.rng=r;return c}
// start a seat's turn at the roll (skips their loan window), so the decision always matches whose turn it is
const godTurn=(c,p)=>{c.current=p;c.decision={kind:'roll',player:p};c.turnFlags={rollBonus:0,noRepay:false,landings:0,borrowed:false}}
function godEdit(fn){if(!S||busy)return;const c=clone(S);fn(c,c.players[GOD.p]);S=c;V=view(S);render();godRender()}
// the roll that lands the player on the nearest square of a kind ahead (moving first if none is within 6)
function godReach(kind){godEdit((c,pl)=>{let t=0;for(let q=pl.square+1;q<100;q++)if(type(q)===kind){t=q;break}
 if(!t)return;if(t-pl.square>6)pl.square=t-3;if(c.current!==GOD.p||c.decision?.player!==GOD.p)godTurn(c,GOD.p);GOD.roll=t-pl.square;say(`Test: next roll is ${GOD.roll}, onto ${t}`)})}
function godRender(){let el=$('godp');if(!GOD.on){el?.remove();return}
 if(!el){el=document.createElement('div');el.id='godp';document.body.appendChild(el)
  // drag it by its header; the spot is remembered
  const pos=JSON.parse(store('dod-godpos')||'null');if(pos)Object.assign(el.style,{left:pos[0]+'px',top:pos[1]+'px',right:'auto',bottom:'auto'})
  el.addEventListener('pointerdown',e=>{if(!e.target.closest('.gh')||e.target.closest('button'))return;const r=el.getBoundingClientRect(),ox=e.clientX-r.left,oy=e.clientY-r.top
   const mv=ev=>{const x=Math.max(0,Math.min(innerWidth-r.width,ev.clientX-ox)),y=Math.max(0,Math.min(innerHeight-40,ev.clientY-oy));Object.assign(el.style,{left:x+'px',top:y+'px',right:'auto',bottom:'auto'})}
   const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);const b=el.getBoundingClientRect();store('dod-godpos',JSON.stringify([b.left,b.top]))}
   addEventListener('pointermove',mv);addEventListener('pointerup',up)})}
 if(!S){el.innerHTML='<div class="gh"><b>Test mode</b><button data-g="x">Close</button></div><p>Start or resume a game first.</p>';el.querySelector('[data-g=x]').onclick=()=>{GOD.on=false;godRender();topbar()};return}
 const pl=S.players[GOD.p],cards=Object.keys(DEF)
 el.innerHTML=`<div class="gh"><b>Test mode</b><span class="gk">drag me · \` toggles</span><button data-g="x">Close</button></div>
 <div class="gr">${S.players.map((p,i)=>`<button class="${i===GOD.p?'on':''}" data-gp="${i}">${p.name}</button>`).join('')}</div>
 <label>Square <input type="number" min="1" max="100" value="${pl.square}" id="gsq"><button data-g="sq">Move</button><button data-g="turn">Make it their turn</button></label>
 <label>Next roll ${[1,2,3,4,5,6].map(n=>`<button class="${GOD.roll===n?'on':''}" data-gr="${n}">${n}</button>`).join('')}<button class="${GOD.lock?'on':''}" data-g="lock">Every roll</button></label>
 <label>Land on ${['ladder','snake','event','tariff','sanction'].map(k=>`<button data-gk="${k}">${k}</button>`).join('')}</label>
 <label>Next card <select id="gcard"><option value="">random</option>${cards.map(k=>`<option value="${k}" ${S.deck[0]===k&&GOD.card===k?'selected':''}>${DEF[k].name}</option>`).join('')}</select></label>
 <label>Capital <b>${pl.capital}</b><button data-gm="-5">−5</button><button data-gm="-1">−1</button><button data-gm="1">+1</button><button data-gm="5">+5</button><button data-gm="50">+50</button></label>
 <label>Debt <b>${pl.debt}</b><button data-g="loan">+1 loan</button><button data-g="clear">Clear</button> Waivers <b>${pl.waivers}</b><button data-gw="1">+1</button><button data-gw="-1">−1</button></label>
 <label>Seats <button data-g="human">${SEATS.every(s=>!s.bot)?'Give bots back':'I play every seat'}</button><button class="${GOD.pause?'on':''}" data-g="pause">${GOD.pause?'Bots paused':'Pause bots'}</button>${GOD.pause?'<button data-g="stepbot">Bot moves once</button>':''}</label>
 <label>Sounds ${'dice step ladder snake crash shield card flip coinUp tariff sanction win'.split(' ').map(n=>`<button data-gs="${n}">${n}</button>`).join('')}</label>`
 const q=s=>el.querySelectorAll(s)
 el.querySelector('[data-g=x]').onclick=()=>{GOD.on=false;godRender();topbar()}
 q('[data-gp]').forEach(b=>b.onclick=()=>{GOD.p=+b.dataset.gp;godRender()})
 el.querySelector('[data-g=sq]').onclick=()=>godEdit((c,p)=>p.square=Math.max(1,Math.min(100,+$('gsq').value||1)))
 el.querySelector('[data-g=turn]').onclick=()=>godEdit(c=>godTurn(c,GOD.p))
 q('[data-gr]').forEach(b=>b.onclick=()=>{GOD.roll=GOD.roll===+b.dataset.gr?0:+b.dataset.gr;godRender()})
 el.querySelector('[data-g=lock]').onclick=()=>{GOD.lock=!GOD.lock;godRender()}
 q('[data-gk]').forEach(b=>b.onclick=()=>godReach(b.dataset.gk))
 $('gcard').onchange=e=>{const k=e.target.value;GOD.card=k;if(k)godEdit(c=>{c.deck=[k,...c.deck.filter(x=>x!==k)]})}
 q('[data-gm]').forEach(b=>b.onclick=()=>godEdit((c,p)=>p.capital=Math.max(0,p.capital+ +b.dataset.gm)))
 el.querySelector('[data-g=loan]').onclick=()=>godEdit((c,p)=>{p.loans.push({n:1,turn:c.turn});p.debt++})
 el.querySelector('[data-g=clear]').onclick=()=>godEdit((c,p)=>{p.loans=[];p.debt=0})
 q('[data-gw]').forEach(b=>b.onclick=()=>godEdit((c,p)=>p.waivers=Math.max(0,p.waivers+ +b.dataset.gw)))
 el.querySelector('[data-g=human]').onclick=()=>{const all=SEATS.every(s=>!s.bot);if(all&&GOD.seats)SEATS=GOD.seats;else{GOD.seats=SEATS;SEATS=SEATS.map(()=>({bot:false}))}V=view(S);render();godRender()}
 el.querySelector('[data-g=pause]').onclick=()=>{GOD.pause=!GOD.pause;clearTimeout(botT);if(!GOD.pause&&S)render();godRender()}
 const sb=el.querySelector('[data-g=stepbot]');if(sb)sb.onclick=()=>{const d=S.decision;if(d&&!human(d.player)&&!busy)act(botIntent(S)).then(godRender)}
 q('[data-gs]').forEach(b=>b.onclick=()=>SFX.play(b.dataset.gs))}
addEventListener('keydown',e=>{if(e.key==='`'&&!e.target.closest('input,select')){GOD.on=!GOD.on;godRender();topbar()}})

// ---------- boot ----------
window.dod={count:{},peek:(p,t)=>peek(p,t),get state(){return S},get busy(){return busy},gutter:()=>{const t=performance.now(),g=(GUTTER=null,gutterRoutes());return{ms:Math.round(performance.now()-t),bridges:g.bridges.map(b=>b.over.f+'>'+b.over.t+' over '+b.under.f+'>'+b.under.t),hair:g.lines.filter(l=>l.cost>=5000).map(l=>l.f+'>'+l.t),r:Object.fromEntries(g.lines.map(l=>[l.f+'>'+l.t,Math.round(l.cost)])),p:Object.fromEntries(g.lines.map(l=>[l.f+'>'+l.t,l.p.map(q=>[Math.round(q.x??q[0]),Math.round(q.y??q[1])])]))}}}   // for checking from the console
$('bankart').outerHTML=BANK_SVG
$('bankm').onclick=bankOpen
// the table under the board: his wood photo (step 1, default) and the three other tables from the earlier game
const TABLES={wood:'wood',felt:'felt',marble:'marble',world:'world'}
const table=()=>{document.body.dataset.table=tableLook}
// the die looks (die.html, plus gold-and-white 1 Nov): gold (key 'brass', kept for saved choices) is the default
const ROUTE_NAMES={printed:'printed board',live:'live board',deco:'Deco pieces',flight:'trade routes',gutter:'gutter lines'}
const DIE={brass:'gold',goldwhite:'gold and white',ivory:'ivory',lacquer:'matte black'}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.id!=='snd')SFX.play('click')},true)
// the font switch: [label, title font, rules font]; federo = the old look with no swap
const FONTS={almendra:['Almendra',"'Almendra'","'Almendra'"],inknut:['Inknut Antiqua',"'Inknut Antiqua'","'Inknut Antiqua'"],grenze:['Grenze',"'Grenze'","'Grenze'"],texturina:['Texturina',"'Texturina'","'Texturina'"],obra:['Obra Letra (local)',"'KC Obra Letra'","'KC Obra Letra'"],federo:['Federo']}
const fontApply=()=>{if(!FONTS[fontLook])fontLook='almendra';const f=FONTS[fontLook],r=document.documentElement;r.classList.toggle('fx',!!f[1]);r.style.setProperty('--disp',f[1]||'Federo');r.style.setProperty('--rule',f[2]||'Federo');lbLook=null}
const topbar=()=>{fontApply();$('top').innerHTML=`<button id="newg">New game</button><button id="spd">Bot turns: ${fast?'fast':'normal'}</button><button id="rts">Routes: ${ROUTE_NAMES[routeLook]}</button><button id="dce">Die: ${DIE[dieLook]}</button><button id="tbl">Table: ${TABLES[tableLook]}</button><button id="snd">Sound: ${SFX.muted?'off':'on'}</button><button id="fnt">Font: ${FONTS[fontLook][0]}</button><button id="cty">Countries</button><button id="god" class="${GOD.on?'on':''}">Test mode</button>`;$('god').onclick=()=>{GOD.on=!GOD.on;godRender();topbar()};$('snd').onclick=()=>{SFX.toggle();topbar()};$('fnt').onclick=()=>{const k=Object.keys(FONTS);fontLook=k[(k.indexOf(fontLook)+1)%k.length];store('dod-font',fontLook);fontApply();topbar();if(S)drawBoard()};$('cty').onclick=countriesInfo;$('tbl').onclick=()=>{const k=Object.keys(TABLES);tableLook=k[(k.indexOf(tableLook)+1)%k.length];store('dod-table',tableLook);table();topbar()};$('newg').onclick=setup;$('dce').onclick=()=>{const k=Object.keys(DIE);dieLook=k[(k.indexOf(dieLook)+1)%k.length];store('dod-die',dieLook);topbar()
  const el=$('rollov');if(el){dd?.dispose();const c=el.querySelector('canvas'),n=c.cloneNode();c.replaceWith(n);n.onclick=c.onclick;dd=window.duelDice(n,1,dieLook)}};$('rts').onclick=()=>{const k=Object.keys(ROUTE_NAMES);routeLook=k[(k.indexOf(routeLook)+1)%k.length];store('dod-routes',routeLook);topbar();if(S)drawBoard()};$('spd').onclick=()=>{fast=!fast;store('dod-fast',fast?'1':'0');topbar();setSpeed()}}
topbar();table()
// the left-side money preview uses #mycash; kit's toBank/fromBank fly coins between it and the bank
const boot=()=>{if(!window.COIN_SRC)return setTimeout(boot,50);setup()};boot()
