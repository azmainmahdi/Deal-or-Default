import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
import {RoomEnvironment} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js'
// The approved gold die from die.html (same faces, body and throw), set up for a two-dice duel.
const FACE_VALUE=[2,5,1,6,3,4]
const A=.28,Z=.72
const PIPS={1:[[.5,.5]],2:[[A,A],[Z,Z]],3:[[A,A],[.5,.5],[Z,Z]],4:[[A,A],[Z,A],[A,Z],[Z,Z]],
 5:[[A,A],[Z,A],[.5,.5],[A,Z],[Z,Z]],6:[[A,.26],[Z,.26],[A,.5],[Z,.5],[A,.74],[Z,.74]]}
const STYLES={
 ivory:{label:'Ivory',face:'#efe4cb',pip:(n,c)=>c&&n%2?'#b8243a':'#1b2440',edge:'#c9962f',shape:'diamond',r:.092,border:'#c9962f',faceMetal:0,pipMetal:0,rough:.38,clear:.6},
 // matte (1 Nov): the glossy black vanished into the dark table; a satin finish catches soft light on every edge
 lacquer:{label:'Matte black',face:'#202126',pip:()=>'#ffe3a0',shape:'round',r:.1,border:'#e7c06a',faceMetal:0,pipMetal:.5,shade:.22,rough:.62,clear:.12},
 brass:{label:'Gold',face:'#e9b85a',pip:()=>'#1b2440',shape:'round',r:.1,border:'#fff0b8',faceMetal:1,pipMetal:0,rough:.28,clear:0},
 // gold and white (1 Nov): white enamel inside each face's frame, gold metal on the rounded edges and corners
 goldwhite:{label:'Gold and white',face:'#e9b85a',inlay:'#f3eee4',pip:(n,c)=>c&&n%2?'#b8243a':'#1b2440',shape:'round',r:.1,border:'#c9962f',faceMetal:1,pipMetal:0,rough:.34,clear:.35},
}
// Art Deco frame: a rectangle with stepped corners, inset from the edge
function decoFrame(x,S,i){const a=S*i,w=S*(1-2*i);x.beginPath();x.roundRect(a,a,w,w,S*.16);x.stroke()}
function pipPath(x,S,cx,cy,r,shape){x.beginPath();if(shape==='diamond'){x.moveTo(cx,cy-r*1.25);x.lineTo(cx+r*1.25,cy);x.lineTo(cx,cy+r*1.25);x.lineTo(cx-r*1.25,cy);x.closePath()}else x.arc(cx,cy,r,0,7)}
function faceMaps(st,n){const S=512,mk=()=>{const c=document.createElement('canvas');c.width=c.height=S;return c},col=mk(),bump=mk(),met=mk()
 const C=col.getContext('2d'),B=bump.getContext('2d'),M=met.getContext('2d')
 C.fillStyle=st.face;C.fillRect(0,0,S,S);B.fillStyle='#fff';B.fillRect(0,0,S,S);M.fillStyle=st.faceMetal?'#fff':'#000';M.fillRect(0,0,S,S)
 if(st.inlay){const a=S*.11,w=S*.78;C.fillStyle=st.inlay;C.beginPath();C.roundRect(a,a,w,w,S*.16);C.fill();M.fillStyle='#000';M.beginPath();M.roundRect(a,a,w,w,S*.16);M.fill()}
 if(st.border){[C,B,M].forEach((x,k)=>{x.lineWidth=S*.012;x.strokeStyle=k===0?st.border:k===1?'#777':'#fff';decoFrame(x,S,.11)})}
 PIPS[n].forEach(([u,v],k)=>{const cx=u*S,cy=v*S,r=st.r*S*(n===1?1.4:1),centre=u===.5&&v===.5
  pipPath(C,S,cx,cy,r,st.shape);C.fillStyle=st.pip(n,centre);C.fill()
  C.save();pipPath(C,S,cx,cy,r,st.shape);C.clip();const sh=C.createRadialGradient(cx+r*.25,cy+r*.35,r*.1,cx,cy,r*1.15)
  sh.addColorStop(0,'rgba(255,255,255,.10)');sh.addColorStop(.6,'rgba(0,0,0,0)');sh.addColorStop(1,`rgba(0,0,0,${st.shade??.55})`);C.fillStyle=sh;C.fillRect(cx-r*1.5,cy-r*1.5,r*3,r*3);C.restore()
  if(st.edge){C.lineWidth=S*.012;C.strokeStyle=st.edge;C.stroke()}
  const g=B.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'#000');g.addColorStop(.55,'#000');g.addColorStop(.9,'#555');g.addColorStop(1,'#fff');pipPath(B,S,cx,cy,r,st.shape);B.fillStyle=g;B.fill()
  pipPath(M,S,cx,cy,r,st.shape);{const q=Math.round((st.pipMetal||0)*255);M.fillStyle=`rgb(${q},${q},${q})`};M.fill()})
 const t=c=>{const x=new THREE.CanvasTexture(c);x.anisotropy=8;return x},map=t(col);map.colorSpace=THREE.SRGBColorSpace
 return new THREE.MeshPhysicalMaterial({map,bumpMap:t(bump),bumpScale:7,metalness:1,metalnessMap:t(met),roughness:st.rough,clearcoat:st.clear,clearcoatRoughness:.08})}

const SIZE=.62
// Die body: how real dice are made, a cube trimmed by a sphere. The sphere cuts each corner deep,
// so every face reads as a very rounded square, while the edges between faces stay crisp
// (a p-norm of 10 rounds them only slightly). A soft minimum blends the two so there is no seam.
function dieGeometry(S){const g=new THREE.BoxGeometry(S,S,S,48,48,48),p=g.attributes.position,h=S/2,Rs=h*1.56,k=h*.025,v=new THREE.Vector3()
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=10;v.multiplyScalar(h/Math.pow(Math.abs(v.x)**n+Math.abs(v.y)**n+Math.abs(v.z)**n,1/n))
  const r=v.length(),soft=-k*Math.log(Math.exp(-r/k)+Math.exp(-Rs/k));v.multiplyScalar(soft/r);p.setXYZ(i,v.x,v.y,v.z)}
 g.computeVertexNormals();return g}
function makeDie(key){const st=STYLES[key],mesh=new THREE.Mesh(dieGeometry(SIZE),FACE_VALUE.map(n=>faceMaps(st,n)));mesh.castShadow=mesh.receiveShadow=true;return mesh}

// orientation that puts face value n on top, with a random spin about the vertical
const UPS={1:[0,0,0],6:[Math.PI,0,0],2:[0,0,Math.PI/2],5:[0,0,-Math.PI/2],3:[-Math.PI/2,0,0],4:[Math.PI/2,0,0]}
const restQ=n=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...UPS[n])).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),(Math.random()-.5)*1.2))

const BOUNCES=[0,.34,.58,.74,.84],DUR=1.25
function bounceY(t){for(let i=0;i<BOUNCES.length-1;i++){const a=BOUNCES[i],b=BOUNCES[i+1];if(t<b){const k=(t-a)/(b-a),h=.9*Math.pow(.42,i);return Math.sin(Math.PI*k)*h}}return 0}

// Gold dice on a see-through canvas (two for a duel, one for a turn roll). roll(...values) throws them and resolves
// when they have settled on those values.
export function duelDice(canvas,count=2,style='brass'){const r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});r.setPixelRatio(Math.min(devicePixelRatio,2))
 r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.1;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap
 const scene=new THREE.Scene();scene.environment=new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(),.04).texture
 const key=new THREE.DirectionalLight('#fff1dc',2.3);key.position.set(-3,6,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-3,right:3,top:2,bottom:-2});key.shadow.radius=4;scene.add(key)
 scene.add(new THREE.HemisphereLight('#ffe9c8','#2a1608',.5))
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(8,5),new THREE.ShadowMaterial({opacity:.45}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor)
 const cam=new THREE.PerspectiveCamera(30,2.4,.1,40);cam.position.set(0,3.5,1.7);cam.lookAt(0,0,.05)
 const dice=(count===1?[0]:[-1.05,1.05]).map(x=>{const d=makeDie(STYLES[style]?style:'brass');if(style==='brass'||!STYLES[style])d.material.forEach(m=>{m.roughness=.5;m.envMapIntensity=.55;m.bumpScale=9});d.position.set(x,SIZE/2,0);d.quaternion.copy(restQ(1+Math.floor(Math.random()*6)));scene.add(d);return{d,home:new THREE.Vector3(x,SIZE/2,0),anim:null}})
 const fit=()=>{const w=canvas.clientWidth||300,h=canvas.clientHeight||125;r.setSize(w,h,false);cam.aspect=w/h;cam.position.set(0,3.5,1.7).multiplyScalar(count===1?1.55:1.15*Math.max(1,2.4/cam.aspect));cam.lookAt(0,count===1?1.9:0,.05);cam.updateProjectionMatrix()};fit();requestAnimationFrame(()=>{fit();r.render(scene,cam)});r.render(scene,cam)   // draw once now: a hidden tab may not run the loop
 let wait=null
 r.setAnimationLoop(()=>{const now=performance.now()/1000;let busy=false
  dice.forEach(o=>{const a=o.anim;if(!a)return;busy=true
   if(now<a.t0){const k=a.t0-now,j=.07;o.d.position.set(a.from.x+(Math.random()-.5)*j,a.from.y+(Math.random()-.5)*j,a.from.z+(Math.random()-.5)*j)
    o.d.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random()*.6,Math.random()*.6,Math.random()*.6)));return}
   let t=(now-a.t0)/DUR;t=Math.min(1,t)
   const e=1-Math.pow(1-t,3);o.d.position.lerpVectors(a.from,a.to,e);o.d.position.y=SIZE/2+bounceY(t)+(1-e)*.55
   o.d.quaternion.copy(a.end).premultiply(new THREE.Quaternion().setFromAxisAngle(a.axis,-(1-e)*a.turns*Math.PI*2));if(t>=1)o.anim=null})
  if(!busy&&wait){const w=wait;wait=null;w()}
  r.render(scene,cam)})
 return{roll(...v){return new Promise(res=>{v.forEach((n,i)=>{const o=dice[i],axis=new THREE.Vector3(Math.random()-.5,.3*(Math.random()-.5),1).normalize()
   o.anim={t0:performance.now()/1000+(count===1?.18:.5)+i*.07,axis,turns:2+Math.random()*1.5,from:o.home.clone().add(new THREE.Vector3(0,.55,count===1?.15:.55)),to:o.home.clone(),end:restQ(n)}})
   wait=res;setTimeout(()=>{if(wait){dice.forEach((o,i)=>{o.anim=null;o.d.position.copy(o.home);o.d.quaternion.copy(restQ(v[i]))});const w=wait;wait=null;w()}},DUR*1000+1100)})},
  dispose(){r.setAnimationLoop(null);r.dispose()}}}
