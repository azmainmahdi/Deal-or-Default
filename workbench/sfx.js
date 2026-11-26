// sound effects, synthesised with Web Audio (no files, nothing to license). SFX.play('name'); muted state is remembered.
// ponytail: every sound is a few oscillators or a noise burst; swap a name for a recorded sample if one ever sounds cheap
;(()=>{
let ctx=null,out=null,room=null,noiseBuf=null
let muted=(()=>{try{return localStorage.getItem('dod-sound')==='off'}catch(e){return false}})()
function init(){if(ctx)return ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null
 ctx=new AC();out=ctx.createGain();out.gain.value=.55
 const comp=ctx.createDynamicsCompressor();out.connect(comp);comp.connect(ctx.destination)
 noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1
 // a small room (decaying noise as the impulse): sounds sent here get a short tail, so hits sit on a table, not in a void
 const conv=ctx.createConvolver(),L=Math.round(ctx.sampleRate*1.6),ir=ctx.createBuffer(2,L,ctx.sampleRate)
 for(let c=0;c<2;c++){const x=ir.getChannelData(c);for(let i=0;i<L;i++)x[i]=(Math.random()*2-1)*Math.pow(1-i/L,4)}
 conv.buffer=ir;room=ctx.createGain();room.gain.value=.22;room.connect(conv);conv.connect(out)
 return ctx}
// browsers start audio only after a click or key; unlock on the first one
const unlock=()=>{init();ctx?.state==='suspended'&&ctx.resume()};addEventListener('pointerdown',unlock,{capture:true});addEventListener('keydown',unlock,{capture:true})
const R=(a,b)=>a+Math.random()*(b-a)
// route a voice dry and, by `wet`, into the room
function send(node,wet){node.connect(out);if(wet){const g=ctx.createGain();g.gain.value=wet;node.connect(g);g.connect(room)}}

// one tone: type, start/end frequency, length, volume, delay, attack, room send
function tone(type,f0,f1,len,vol,at=0,attack=.005,wet=0){const t=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain()
 o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+len)
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+len)
 o.connect(g);send(g,wet);o.start(t);o.stop(t+len+.02)}
// filtered noise: filter type, centre frequency (start/end), length, volume, delay, Q, room send, attack
function noise(ft,f0,f1,len,vol,at=0,q=1,wet=0,attack=0){const t=ctx.currentTime+at,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain()
 s.buffer=noiseBuf;s.loop=true;f.type=ft;f.Q.value=q;f.frequency.setValueAtTime(f0,t);if(f1!==f0)f.frequency.exponentialRampToValueAtTime(f1,t+len)
 if(attack){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+attack)}else g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+len)
 s.connect(f);f.connect(g);send(g,wet);s.start(t,Math.random()*.5);s.stop(t+len+.02)}
// a hard little object meeting a hard surface: a bright click and the short ring of the object (no low thump, which read as a drum)
const tick=(at,vol,pitch=1)=>{noise('bandpass',R(3800,5200)*pitch,R(2600,3400)*pitch,.022,vol,at,1.4,.35);tone('sine',R(2300,2900)*pitch,R(2200,2800)*pitch,.06,vol*.3,at,.001,.35);tone('sine',R(5600,6600)*pitch,R(5500,6500)*pitch,.035,vol*.14,at,.001)}
// wood on wood, for the pieces and the gavel's lighter knocks
const knock=(at,pitch=1,vol=.3)=>{noise('bandpass',1500*pitch,1100*pitch,.04,vol*.7,at,2.2,.3);tone('sine',620*pitch,560*pitch,.07,vol*.4,at,.002,.3)}
const ping=(f,at=0,vol=.18,len=.5)=>{tone('sine',f,f,len,vol,at,.005,.3);tone('sine',f*2.76,f*2.76,len*.4,vol*.25,at)}
// a die dropped on the table, timed to the 3D throw (touchdowns at .6, .9, 1.1, 1.23 s after it leaves the hand), then a short roll
function dieDrop(off){[[.6,.3],[.9,.17],[1.1,.1],[1.23,.06]].forEach(([t,v])=>tick(off+t+R(-.01,.01),v))
 let t=off+1.27;for(let i=0;i<6;i++){tick(t,R(.015,.035),R(.85,1.05));t+=R(.028,.05)}}

const SOUNDS={
 click(){noise('highpass',3000,3000,.025,.1)},
 dice(off=0){dieDrop(off)},
 // a token set down: soft, felted, low
 step(){tone('sine',R(300,330),R(250,270),.11,.045,0,.006,.25);noise('lowpass',700,400,.06,.035,0,.7,.25,.004)},
 ladder(){[523,659,784,1047].forEach((f,i)=>tone('triangle',f,f,.22,.13,i*.07,.005,.3));noise('bandpass',900,4000,.45,.05,0,.8,.3)},
 snake(){tone('sawtooth',520,90,.75,.05);noise('bandpass',1200,200,.75,.07,0,1.5,.3)},
 crash(){tone('sine',110,40,.5,.4,0,.005,.3);noise('lowpass',1600,140,.5,.3,0,1,.35);[0,.06,.13].forEach(a=>tick(a,.08,.6))},
 shield(){ping(1320,0,.16,.7);ping(1980,.05,.1,.6);noise('highpass',2500,6000,.25,.05)},
 card(){noise('bandpass',600,3200,.28,.18,0,.9,.2)},
 flip(){noise('bandpass',2400,900,.16,.14,0,1.2,.2)},
 coinUp(){ping(1568,0,.14,.35);ping(2093,.07,.12,.45)},
 coinDown(){ping(1047,0,.12,.3);ping(784,.06,.09,.3)},
 invest(){[0,.05,.1].forEach((a,i)=>ping(1319+i*220,a,.09,.3));tick(.16,.08)},
 tariff(){knock(0,.7,.35);noise('lowpass',900,200,.18,.2,0,1,.3)},
 // the sanction, in the order the effect plays (sanctionFx calls each one at its moment)
 gavelRise(){noise('bandpass',300,1400,.45,.06,0,1.2,.4,.25);ping(1760,.3,.04,.6)},
 gavelMerge(n=0){ping(1175*Math.pow(1.122,n),0,.07,.5);tick(0,.05,.8)},
 gavelWind(){noise('bandpass',500,1600,.22,.07,0,1.5,.2,.15)},
 // the blow: a hard crack of wood on the block, the block's body, then a deep boom felt more than heard
 gavelStrike(){noise('bandpass',2600,1800,.03,.5,0,1.1,.5);noise('bandpass',900,500,.09,.4,0,2,.5);tone('sine',230,170,.18,.45,0,.002,.5)
  tone('sine',75,32,1.1,.6,0,.004,.6);noise('lowpass',400,60,.9,.35,0,.8,.6,.01)},
 // the shock wave rolling out across the board: a low swell and a wide sweep of air, with a glitter on top for the pixels
 shockwave(){noise('bandpass',180,1100,.55,.22,0,.9,.6,.18);noise('bandpass',1100,140,1.1,.18,.5,.9,.6);tone('sine',48,36,1.5,.3,0,.25,.5)
  noise('highpass',6000,9000,.9,.025,.15,1,.4,.3)},
 waiver(){ping(988,0,.11,.4);ping(1319,.08,.11,.5)},
 card_good(){[659,831,988].forEach((f,i)=>tone('triangle',f,f,.35,.09,i*.06,.005,.3))},
 card_bad(){[392,370,311].forEach((f,i)=>tone('triangle',f,f,.4,.09,i*.09,.005,.3))},
 turn(){ping(880,0,.08,.5);ping(1320,.09,.06,.6)},
 // two dice thrown together: the duel's throw leaves the hand .32 s later, the second die .07 s after the first
 duel(){dieDrop(.32);dieDrop(.39)},
 win(){[523,659,784,1047,784,1047].forEach((f,i)=>tone('triangle',f,f,i>3?.6:.2,.13,i*.12,.005,.35))},
}
SOUNDS.sanction=()=>{SOUNDS.gavelStrike();SOUNDS.shockwave()}   // the test panel's one-button preview
window.SFX={
 play(name,...a){if(muted||document.hidden||!SOUNDS[name]||!init()||ctx.state!=='running')return;try{SOUNDS[name](...a)}catch(e){}},
 get muted(){return muted},
 toggle(){muted=!muted;try{localStorage.setItem('dod-sound',muted?'off':'on')}catch(e){};if(!muted){unlock();SFX.play('click')};return muted},
}
})()
