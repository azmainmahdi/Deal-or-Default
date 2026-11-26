import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'

// ---------- the coin: modelled in 3D and lit like the reference illustration, rendered once to an image ----------
// Raised parts (rim, square frame) are polished and bright; the recessed face is a touch deeper orange and less
// polished, which reads as ambient occlusion in the dips. A big bright softbox top left and a smaller one bottom
// right give the two highlights; a dark amber surround keeps the contrast that makes metal read as gold.
function roundedSquare(path,h,r,rot=Math.PI/4){const pts=[]
 for(let k=0;k<4;k++)for(let i=0;i<=8;i++){const cx=[1,-1,-1,1][k]*(h-r),cy=[1,1,-1,-1][k]*(h-r),a=k*Math.PI/2+(i/8)*Math.PI/2;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}
 const c=Math.cos(rot),s=Math.sin(rot);pts.map(([x,y])=>[x*c-y*s,x*s+y*c]).forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();return path}
function ring(R,r){const s=new THREE.Shape();s.absarc(0,0,R,0,Math.PI*2,false);const h=new THREE.Path();h.absarc(0,0,r,0,Math.PI*2,true);s.holes.push(h);return s}
const METAL={gold:{hi:'#ffdc5c',lo:'#ffbe3a'},copper:{hi:'#ffa274',lo:'#e07848'}}
function coinMesh(kind){const g=new THREE.Group(),m=METAL[kind]
 const hi=new THREE.MeshPhysicalMaterial({color:m.hi,metalness:1,roughness:.1,clearcoat:.8,clearcoatRoughness:.05})
 const lo=new THREE.MeshPhysicalMaterial({color:m.lo,metalness:1,roughness:.3})
 const ex=(shape,depth,z,bev,mat)=>{const o=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:10,curveSegments:128}),mat);o.position.z=z;return o}
 const body=new THREE.Shape();body.absarc(0,0,.97,0,Math.PI*2,false);body.holes.push(roundedSquare(new THREE.Path(),.27,.07))
 g.add(ex(body,.16,0,.04,lo),ex(ring(.97,.79),.07,.16,.035,hi))
 const frame=roundedSquare(new THREE.Shape(),.41,.11);frame.holes.push(roundedSquare(new THREE.Path(),.27,.07));g.add(ex(frame,.065,.16,.03,hi))
 return g}
function studio(r){const env=new THREE.Scene();env.background=new THREE.Color('#8f5616')
 const box=(w,h,col,k,pos)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(k),side:THREE.DoubleSide}));o.position.set(...pos);o.lookAt(0,0,0);env.add(o)}
 box(4.2,4.2,'#fffaf0',4.2,[-3.4,3.4,4.2])     // big key softbox, top left: the broad bright highlight
 box(1.8,1.8,'#fff4dc',3.2,[3.2,-3,4])         // small fill, bottom right: the second highlight
 box(5,5,'#ffd27a',1.9,[0,0,6])                // warm bounce straight on: keeps the face golden
 box(9,.5,'#ffffff',7,[0,5.2,1.5]);box(.5,9,'#fff6e4',5,[-5.2,0,1.5])   // thin strips: crisp glints on the bevels
 box(9,.7,'#ffcf80',1.4,[0,-5.2,1.5])
 return new THREE.PMREMGenerator(r).fromScene(env,.02).texture}
export function renderCoin(size,tilt,kind='gold',exp=1.25){const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.setSize(size,size)
 r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=exp;r.outputColorSpace=THREE.SRGBColorSpace
 const scene=new THREE.Scene();scene.environment=studio(r)
 const key=new THREE.DirectionalLight('#ffffff',2.2);key.position.set(-3,3.4,4);scene.add(key)   // hot specks on the bevels
 const k2=new THREE.DirectionalLight('#fff0d0',1.2);k2.position.set(3,-3,4);scene.add(k2)
 const cam=new THREE.PerspectiveCamera(24,1,.1,20);cam.position.set(0,0,5.2);const c=coinMesh(kind);c.position.z=-.1;c.rotation.set(...tilt);scene.add(c)
 r.render(scene,cam);const url=r.domElement.toDataURL('image/png');r.dispose();return url}

// a spin you can play on hover: the real 3D coin rendered frame by frame along a loop that tips it on all
// three axes (x twice per loop, y and z once), so the highlights travel across it. Frame 0 is the resting tilt.
export function renderSpin(size,frames=40,kind='gold',exp=1.35){const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.setSize(size,size)
 r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=exp;r.outputColorSpace=THREE.SRGBColorSpace
 const scene=new THREE.Scene();scene.environment=studio(r)
 const key=new THREE.DirectionalLight('#ffffff',2.2);key.position.set(-3,3.4,4);scene.add(key)
 const k2=new THREE.DirectionalLight('#fff0d0',1.2);k2.position.set(3,-3,4);scene.add(k2)
 const cam=new THREE.PerspectiveCamera(24,1,.1,20);cam.position.set(0,0,5.2);const c=coinMesh(kind);c.position.z=-.1;scene.add(c)
 const out=document.createElement('canvas');out.width=size*frames;out.height=size;const g=out.getContext('2d')
 for(let i=0;i<frames;i++){const t=i/frames,w=Math.PI*2*t
  c.rotation.set(-.22+.34*Math.sin(2*w),.18+.55*Math.sin(w),.22*Math.sin(w+Math.PI/2)-.22*Math.sin(Math.PI/2))
  r.render(scene,cam);g.drawImage(r.domElement,i*size,0)}
 r.dispose();return out.toDataURL('image/png')}

// a small toy bank for beside the board: cream body with rounded edges, four columns, a gold roof and steps,
// a gold coin stuck in a slot on the roof ridge. Rendered once from a high three-quarter view.
export function renderBank(size,exp=1.2){const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.setSize(size,size)
 r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=exp;r.outputColorSpace=THREE.SRGBColorSpace
 const scene=new THREE.Scene();scene.environment=studio(r)
 const key=new THREE.DirectionalLight('#fff6e6',2.4);key.position.set(-3,5,4);scene.add(key);scene.add(new THREE.HemisphereLight('#fff3dc','#4a2e10',.9))
 const cream=new THREE.MeshStandardMaterial({color:'#f6ead0',roughness:.5,envMapIntensity:.6})
 const gold=new THREE.MeshPhysicalMaterial({color:'#ffd24a',metalness:1,roughness:.18,clearcoat:.6})
 const navy=new THREE.MeshStandardMaterial({color:'#24345e',roughness:.35})
 const g=new THREE.Group()
 // a rounded slab: a rounded rectangle extruded with a soft bevel
 const slab=(w,h,d,rad,mat,y,z=0)=>{const s=new THREE.Shape(),x=-w/2,yy=-h/2;s.moveTo(x+rad,yy);s.lineTo(x+w-rad,yy);s.quadraticCurveTo(x+w,yy,x+w,yy+rad);s.lineTo(x+w,yy+h-rad);s.quadraticCurveTo(x+w,yy+h,x+w-rad,yy+h);s.lineTo(x+rad,yy+h);s.quadraticCurveTo(x,yy+h,x,yy+h-rad);s.lineTo(x,yy+rad);s.quadraticCurveTo(x,yy,x+rad,yy)
  const b=Math.min(.06,rad*.6),m=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:5,curveSegments:16}),mat);m.position.set(0,y,z-d/2+b);g.add(m);return m}
 slab(2.3,.2,1.5,.08,gold,.1);slab(2.06,.18,1.32,.07,gold,.29)
 slab(1.7,1.05,.95,.16,cream,.9,-.12)
 slab(.42,.62,.1,.12,navy,.71,.38)
 for(const x of[-.66,-.24,.24,.66]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.1,.11,.98,24),cream);c.position.set(x,.88,.46);g.add(c)
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.06,24),gold);cap.position.set(x,1.38,.46);g.add(cap)}
 slab(2.08,.18,1.36,.07,gold,1.47)
 const tri=new THREE.Shape();tri.moveTo(-1.08,0);tri.lineTo(1.08,0);tri.lineTo(0,.58);tri.closePath()
 const ped=new THREE.Mesh(new THREE.ExtrudeGeometry(tri,{depth:1.1,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:4}),gold);ped.position.set(0,1.56,-.55);g.add(ped)
 const slot=new THREE.Mesh(new THREE.BoxGeometry(.5,.06,.12),navy);slot.position.set(0,2.17,0);g.add(slot)
 const c=coinMesh('gold');c.scale.setScalar(.26);c.rotation.set(0,Math.PI/2.4,0);c.position.set(0,2.36,0);g.add(c)
 g.rotation.y=-.5;scene.add(g)
 const cam=new THREE.PerspectiveCamera(30,1,.1,30);cam.position.set(0,2.9,5.25);cam.lookAt(0,1.12,0)
 r.render(scene,cam);const url=r.domElement.toDataURL('image/png');r.dispose();return url}

// a judge's gavel in the black lacquer of the die, with gold trim: barrel head with two bands, a turned handle with a knob.
// Drawn on the diagonal: the head sits top left (about 29%,29%) and the handle ends lower right (about 60%,62%),
// so a page can swing it around the handle end.
export function renderGavel(size,exp=1.3){const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.setSize(size,size)
 r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=exp;r.outputColorSpace=THREE.SRGBColorSpace
 const scene=new THREE.Scene();scene.environment=studio(r)
 const key=new THREE.DirectionalLight('#ffffff',2.2);key.position.set(-3,3.4,4);scene.add(key)
 const gold=new THREE.MeshPhysicalMaterial({color:'#0f1117',metalness:0,roughness:.3,clearcoat:.6,clearcoatRoughness:.25})   // lacquer body, satin so it doesn't glare
 const deep=new THREE.MeshPhysicalMaterial({color:'#e7c06a',metalness:1,roughness:.35})   // gold trim, the die's edge colour
 const g=new THREE.Group(),cyl=(rt,rb,h,mat,seg=48)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat)
 const head=new THREE.Group();head.add(cyl(.3,.3,.86,gold))
 for(const y of[-.47,.47]){const cap=cyl(.33,.33,.08,gold);cap.position.y=y;head.add(cap)}
 for(const y of[-.27,.27]){const band=new THREE.Mesh(new THREE.TorusGeometry(.305,.035,16,64),deep);band.rotation.x=Math.PI/2;band.position.y=y;head.add(band)}
 head.rotation.z=Math.PI/2;g.add(head)
 const handle=cyl(.075,.095,1.25,gold);handle.position.y=-.82;g.add(handle)
 const collar=cyl(.12,.12,.08,deep);collar.position.y=-.3;g.add(collar)
 const knob=new THREE.Mesh(new THREE.SphereGeometry(.13,32,16),gold);knob.position.y=-1.47;g.add(knob)
 g.rotation.set(.35,-.25,Math.PI/4);g.position.set(-.5,.5,0);scene.add(g)
 const cam=new THREE.OrthographicCamera(-1.2,1.2,1.2,-1.2,.1,20);cam.position.set(0,0,6);cam.lookAt(0,0,0)
 r.render(scene,cam);const url=r.domElement.toDataURL('image/png');r.dispose();return url}
