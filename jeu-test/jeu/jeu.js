/* La Nuit de l'EHPAD — jeu test Allan BIM.
   Se pose dans le dossier d'une maquette Blender exportée par Allan BIM (donnees.js, modele.js, images.js, three.min.js).
   Plan du fichier : 1 outils · 2 chargement · 3 rendu · 4 personnages · 5 son · 6 commandes · 7 joueur · 8 PNJ · 9 réseau · 10 partie · 11 boucle */
(function () {
"use strict";
/* ───────── 1. outils ───────── */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TAU = Math.PI * 2;
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const TOUCH = matchMedia("(pointer:coarse)").matches || "ontouchstart" in window;
if (TOUCH) document.body.classList.add("touch");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const FILES = { data: "donnees.js", model: "modele.js", images: "images.js", monde: "jeu/jeu_monde.js", peer: "jeu/peerjs.min.js" };
let EYE = 1.5; const SPD = { slow: 1.0, walk: 2.2, run: 4.7, mWalk: 2.5, mRun: 5.0 };
let THREE = window.THREE, W = null, D = null;

/* ───────── 2. chargement ───────── */
function script(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error("Fichier manquant : " + src)); document.head.appendChild(s); }); }
async function gunzip(b64) {
  if (typeof DecompressionStream === "undefined") throw new Error("Ce navigateur est trop ancien pour ouvrir la maquette. Mets-le à jour.");
  const bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
  return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
}
let ldone = 0, ltotal = 16;
function step(msg) { ldone++; $("bar").firstElementChild.style.width = Math.min(100, Math.round(4 + ldone / ltotal * 96)) + "%"; if (msg) $("loadmsg").textContent = msg; }
function loadImg(name) { const d = (window.MAQ_IMG || {})[name]; if (!d) return Promise.reject(new Error("Image manquante dans la maquette : " + name)); return new Promise((res, rej) => { const im = new Image(); im.onload = () => { step(); res(im); }; im.onerror = () => rej(new Error("Image illisible : " + name)); im.src = d; }); }

/* ───────── 3. rendu ───────── */
const GLSL_COMMON = `
uniform sampler2D uSky; uniform float uSkyU0, uSkyS, uExposure, uEnv;
uniform vec4 uFog;
vec3 skyLin(vec3 d, float lod){
  float u=uSkyU0+uSkyS*atan(d.y,d.x)*0.15915494; float v=0.5+asin(clamp(d.z,-1.0,1.0))*0.31830989;
  vec3 c=textureLod(uSky, vec2(u,v), lod).rgb; return c*c*(0.6+1.3*c)*uEnv*vec3(0.6,0.75,1.0);
}
vec3 tone(vec3 x){ x*=uExposure; x=(x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14); return pow(clamp(x,0.0,1.0), vec3(0.4545)); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x), mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x), f.y); }
vec3 fogged(vec3 c, float dist){ return mix(uFog.rgb, c, exp(-dist*uFog.a)); }
`;
/* éclairage dynamique : lampe du joueur, lampes des autres, petites lumières (veilleuses, clé, sortie, yeux) */
const GLSL_DYN = `
uniform vec3 uLampPos, uLampDir; uniform vec4 uLampP;
uniform vec4 uSpPos[3]; uniform vec4 uSpDir[3];
uniform vec4 uPtPos[8]; uniform vec3 uPtCol[8];
vec3 dyn(vec3 P, vec3 N){
  vec3 s=vec3(0.0);
  vec3 L=uLampPos-P; float d=length(L); L/=max(d,1e-4); float c=dot(-L,uLampDir);
  float cone=smoothstep(uLampP.z,uLampP.y,c);
  s+=vec3(1.0,0.94,0.80)*uLampP.x*cone*(0.55+0.45*smoothstep(uLampP.y,1.0,c))*(max(dot(N,L),0.0)*0.85+0.15)/(1.0+0.05*d*d)*smoothstep(uLampP.w,uLampP.w*0.55,d);
  s+=vec3(0.75,0.8,1.0)*uLampP.x*0.012/(1.0+0.6*d*d);
  for(int i=0;i<3;i++){ if(uSpPos[i].w<=0.0) continue; vec3 L2=uSpPos[i].xyz-P; float d2=length(L2); L2/=max(d2,1e-4); float c2=dot(-L2,uSpDir[i].xyz);
    s+=vec3(1.0,0.94,0.80)*uSpPos[i].w*smoothstep(0.86,0.95,c2)*(max(dot(N,L2),0.0)*0.85+0.15)/(1.0+0.05*d2*d2)*smoothstep(uSpDir[i].w,uSpDir[i].w*0.7,d2); }
  for(int i=0;i<8;i++){ float r=uPtPos[i].w; if(r<=0.0) continue; vec3 Lp=(uPtPos[i].xyz-P)*vec3(1.0,1.0,2.4); float dp=length(Lp); float a=clamp(1.0-dp/r,0.0,1.0);
    s+=uPtCol[i]*a*a*(max(dot(N,Lp/max(dp,1e-4)),0.0)*0.7+0.3); }
  return s;
}`;
const VS = `
attribute vec4 aTint;
#ifdef K_L
attribute vec2 aUv2; varying vec2 vUv2;
#endif
#ifdef K_V
attribute vec4 aBake; varying vec3 vBake;
#endif
varying vec3 vW; varying vec3 vTint; flat varying float vMat;
void main(){
  vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vTint=aTint.rgb; vMat=floor(aTint.a*255.0+0.5);
  #ifdef K_L
  vUv2=aUv2;
  #endif
  #ifdef K_V
  vBake=aBake.rgb;
  #endif
  gl_Position=projectionMatrix*viewMatrix*w;
}`;
const FS = `
precision highp sampler2DArray;
uniform sampler2DArray uTex; uniform sampler2D uLM; uniform sampler2D uGL; uniform vec4 uGround; uniform vec3 uNight;
varying vec3 vW; varying vec3 vTint; flat varying float vMat;
#ifdef K_L
varying vec2 vUv2;
#endif
#ifdef K_V
varying vec3 vBake;
#endif
` + GLSL_COMMON + GLSL_DYN + `
vec3 tri(float layer, float sc, vec3 p, vec3 n){
  vec3 w=abs(n); w=w*w*w; w/=(w.x+w.y+w.z); vec3 q=p/sc;
  vec3 c=texture(uTex, vec3(q.yz,layer)).rgb*w.x+texture(uTex, vec3(q.xz,layer)).rgb*w.y+texture(uTex, vec3(q.xy,layer)).rgb*w.z;
  return c*c;
}
float lineAA(float x, float period, float width){ float f=abs(fract(x/period-0.5)-0.5)*period; float a=fwidth(x)*1.2; return 1.0-smoothstep(width-a, width+a, f); }
void main(){
  vec3 N=normalize(cross(dFdx(vW), dFdy(vW))); vec3 V=normalize(cameraPosition-vW); if(dot(N,V)<0.0) N=-N;
  float nv=max(dot(N,V),0.0); float dist=length(cameraPosition-vW);
  int m=int(vMat); vec3 tint=vTint*vTint; vec3 alb=tint; float rough=0.65, metal=0.0, f0=0.04; vec3 emis=vec3(0.0);
  float h=(abs(N.x)>abs(N.y))?vW.y:vW.x;
  if(m==1){ float gv=vnoise(vW.xy*0.045); alb=tri(0.0,2.0,vW,N)*mix(vec3(0.27,0.50,0.26), vec3(0.40,0.56,0.27), gv)*mix(0.82,1.12,vnoise(vW.xy*0.4)); alb=mix(alb, vec3(dot(alb,vec3(0.333))), 0.12); rough=0.95; }
  else if(m==2){ alb=tri(1.0,1.2,vW,N)*vec3(0.52,0.35,0.24); rough=0.72; }
  else if(m==3){ alb=tri(2.0,2.0,vW,N)*0.68; rough=0.95; }
  else if(m==4){ alb=tri(3.0,2.1,vW,N)*0.95; rough=0.82; }
  else if(m==5){ alb=tri(4.0,1.8,vW,N)*vec3(1.0,1.08,1.16); rough=0.8; }
  else if(m==6){ float row=floor(vW.z/0.3); float j=max(lineAA(vW.z,0.3,0.006), lineAA(h+mod(row,2.0)*0.6,1.2,0.006)*step(abs(N.z),0.5));
    alb=tint*(0.82+0.36*hash2(vec2(row, floor((h+mod(row,2.0)*0.6)/1.2))))*(0.92+0.16*vnoise(vec2(h,vW.z)*14.0)); alb=mix(alb, alb*0.28, j*smoothstep(90.0,25.0,dist)); rough=0.7; }
  else if(m==7){ float s=lineAA(vW.z,0.11,0.01); alb=tint*(0.85+0.3*vnoise(vec2(h*4.5,vW.z*9.0)))*(1.0-0.45*s*smoothstep(70.0,20.0,dist)); rough=0.8; }
  else if(m==8){ alb=tint*(0.985+0.03*vnoise(vW.xy*23.0+vW.z*19.0)); rough=0.9; }
  else if(m==9){ alb=tint*(0.88+0.24*vnoise(vec2(h,vW.z)*2.2+vW.xy*1.3)); rough=0.85; }
  else if(m==10){ alb=tint*(0.9+0.2*vnoise(vec2(h+vW.y,vW.z)*30.0)); metal=1.0; rough=0.36; }
  else if(m==11){ float dk=step(dot(tint,vec3(0.333)),0.12); metal=mix(1.0,0.35,dk); rough=mix(0.3,0.5,dk); alb=mix(tint,tint*1.6+0.02,dk); }
  else if(m==12){ float g=max(lineAA(vW.x,0.165,0.004), lineAA(vW.y,0.165,0.004)); alb=mix(vec3(0.012,0.02,0.055), vec3(0.25,0.28,0.33), g*smoothstep(40.0,10.0,dist)); rough=0.1; f0=0.09; }
  else if(m==13){ if(N.z>0.7){ alb=tri(5.0,1.6,vW,N)*vec3(1.35,1.6,1.9); rough=0.36; f0=0.05; } else { alb=vec3(0.5); rough=0.85; } }
  else if(m==14){ alb=vec3(0.86,0.86,0.84); rough=0.92; if(N.z<-0.7){ float g=max(lineAA(vW.x,0.6,0.008), lineAA(vW.y,0.6,0.008)); alb*=1.0-0.4*g*smoothstep(30.0,8.0,dist); alb*=0.975+0.035*vnoise(vW.xy*40.0); } }
  else if(m==15){ metal=0.55; rough=0.45; }
  else if(m==18){ rough=0.42; f0=0.05; }
  else if(m==19){ vec3 g=tri(1.0,0.9,vW,N); alb=tint*(0.55+1.9*dot(g,vec3(0.33))); rough=0.6; }
  else if(m==20){ alb=tint*(0.93+0.14*vnoise(vec2(h,vW.z)*18.0)); rough=0.95; }
  else if(m==21){ float wr=vnoise(vec2(h,vW.z)*26.0); alb=tint*(0.8+0.3*wr); metal=1.0; rough=0.34+0.2*wr; }
  else if(m==255){ emis=tint*0.04; rough=0.5; }
  /* usure : les murs et les sols sont un peu salis, la nuit ça se voit à la lampe */
  alb*=0.80+0.28*vnoise(vW.xy*1.7+vW.z*2.3)*vnoise(vec2(h*0.7,vW.z*0.5)+3.1);
  vec3 E=vec3(0.0);
  #ifdef K_L
  vec3 c=texture2D(uLM, vUv2).rgb; E=c*c*4.0;
  #endif
  #ifdef K_V
  E=vBake*vBake*4.0;
  #endif
  #ifdef K_S
  vec3 c=texture2D(uGL, (vW.xy-uGround.xy)*uGround.zw).rgb; E=c*c*4.0;
  #endif
  float le=dot(E,vec3(0.333));
  E=E*uNight+uNight*0.02;
  vec3 dl=dyn(vW,N);
  vec3 R=reflect(-V,N); float F=f0+(max(1.0-rough,f0)-f0)*pow(1.0-nv,5.0);
  vec3 env=skyLin(R, rough*6.5);
  float so=clamp(le*0.8+0.06,0.0,1.0);
  vec3 spec=env*mix(vec3(F), alb*(0.65+0.35*F), metal)*so*(1.0-0.55*rough);
  /* reflet de la lampe sur les sols lisses */
  vec3 Hh=normalize(V+normalize(uLampPos-vW)); spec+=dl*pow(max(dot(N,Hh),0.0), mix(60.0,6.0,rough))*(1.0-rough)*0.5;
  vec3 col=alb*(E+dl)*(1.0-0.5*metal)+spec+emis;
  gl_FragColor=vec4(tone(fogged(col,dist)), 1.0);
}`;
const FS_GLASS = `
varying vec3 vW; varying vec3 vTint; flat varying float vMat;
` + GLSL_COMMON + GLSL_DYN + `
void main(){
  vec3 N=normalize(cross(dFdx(vW), dFdy(vW))); vec3 V=normalize(cameraPosition-vW); if(dot(N,V)<0.0) N=-N;
  float nv=max(dot(N,V),0.0); float F=0.07+0.93*pow(1.0-nv,5.0); float dist=length(cameraPosition-vW);
  vec3 dl=dyn(vW,N);
  vec3 col=skyLin(reflect(-V,N),1.0)*F*1.2+vec3(0.004,0.006,0.008)+dl*0.05+dl*pow(nv,40.0)*0.6;
  gl_FragColor=vec4(tone(fogged(col,dist)), clamp(0.22+F*0.9+dot(dl,vec3(0.2)),0.0,0.94));
}`;
const FS_LED = `
uniform float uLed; varying vec3 vW; varying vec3 vTint; flat varying float vMat;
` + GLSL_COMMON + `
void main(){ float dist=length(cameraPosition-vW); gl_FragColor=vec4(tone(fogged(vec3(0.85,0.92,1.0)*uLed,dist)), 1.0); }`;
const VS_SKY = `varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*viewMatrix*vec4(position*1500.0+cameraPosition,1.0); gl_Position=p.xyww; }`;
const FS_SKY = `varying vec3 vD; uniform float uSkyGain;` + GLSL_COMMON + `
void main(){ vec3 d=normalize(vD); float u=uSkyU0+uSkyS*atan(d.y,d.x)*0.15915494; float v=0.5+asin(clamp(d.z,-1.0,1.0))*0.31830989;
  vec3 c=textureLod(uSky, vec2(u,v), 0.0).rgb; c=pow(c,vec3(2.2))*uSkyGain*vec3(0.45,0.62,1.0);
  vec2 g=vec2(atan(d.y,d.x)*260.0, d.z*420.0); vec2 gf=fract(g)-0.5; float st=step(0.9975,hash2(floor(g)))*smoothstep(0.03,0.3,d.z)*smoothstep(0.42,0.1,length(gf)); c+=vec3(st)*0.05*(0.3+hash2(floor(g)+7.0));
  gl_FragColor=vec4(pow(clamp(c*uExposure,0.0,1.0),vec3(0.4545)),1.0); }`;
const VS_TREE = `attribute float aLayer; varying vec2 vUv; flat varying float vL; varying vec3 vW; void main(){ vUv=uv; vL=aLayer; vW=position; gl_Position=projectionMatrix*viewMatrix*vec4(position,1.0); }`;
const FS_TREE = `precision highp sampler2DArray; uniform sampler2DArray uSpr; uniform float uRel; varying vec2 vUv; flat varying float vL; varying vec3 vW;` + GLSL_COMMON + `
void main(){ if(vL>2.5 && cameraPosition.z<vW.z+4.0) discard; vec4 c=texture(uSpr, vec3(vUv, vL)); if(c.a<0.36) discard; vec3 l=pow(c.rgb,vec3(2.2))*uRel; gl_FragColor=vec4(tone(fogged(l,length(cameraPosition-vW))),1.0); }`;
/* personnages */
const VS_CH = `attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vC=color; gl_Position=projectionMatrix*viewMatrix*w; }`;
const FS_CH = `varying vec3 vW; varying vec3 vN; varying vec3 vC; uniform vec3 uNight;` + GLSL_COMMON + GLSL_DYN + `
void main(){ vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vW); if(dot(N,V)<0.0) N=-N; float dist=length(cameraPosition-vW);
  vec3 alb=vC*vC*(0.9+0.2*vnoise(vW.xy*40.0+vW.z*31.0));
  vec3 col=alb*(uNight*(0.5+0.25*N.z)+dyn(vW,N)); col+=vec3(0.02,0.03,0.05)*uNight*pow(1.0-max(dot(N,V),0.0),3.0);
  gl_FragColor=vec4(tone(fogged(col,dist)),1.0); }`;

let renderer, scene, camera, U = {}, chunks = [], exitDoor = null, chMat = null, signs = [], frustum, pmat, sph;
function initGL() {
  renderer = new THREE.WebGLRenderer({ canvas: $("gl"), antialias: !TOUCH, alpha: false, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("Ce navigateur ne gère pas WebGL 2, nécessaire au jeu.");
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TOUCH ? 1.25 : 1.6));
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(74, 1, 0.06, 2500); camera.up.set(0, 0, 1);
  frustum = new THREE.Frustum(); pmat = new THREE.Matrix4(); sph = new THREE.Sphere();
  resize(); window.addEventListener("resize", resize);
}
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); }
function tex2D(img, opt) { const t = new THREE.Texture(img); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = !!opt.mips; t.minFilter = opt.mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.wrapS = opt.repeatS ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; return t; }
function texArray(imgs, size, alpha) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size; const cx = cv.getContext("2d", { willReadFrequently: true }); const data = new Uint8Array(size * size * 4 * imgs.length);
  imgs.forEach((im, i) => { cx.clearRect(0, 0, size, size); cx.save(); cx.translate(0, size); cx.scale(1, -1); cx.drawImage(im, 0, 0, size, size); cx.restore(); const d = cx.getImageData(0, 0, size, size).data;
    if (alpha) { let r = 0, g = 0, b = 0, n = 0; for (let k = 0; k < d.length; k += 4) if (d[k + 3] > 200) { r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; } if (n) { r /= n; g /= n; b /= n; for (let k = 0; k < d.length; k += 4) if (d[k + 3] < 8) { d[k] = r; d[k + 1] = g; d[k + 2] = b; } } }
    data.set(d, i * size * size * 4); });
  const t = new THREE.DataArrayTexture(data, size, size, imgs.length); t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = alpha ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = alpha ? 1 : Math.min(TOUCH ? 2 : 8, renderer.capabilities.getMaxAnisotropy()); t.needsUpdate = true; return t;
}
function makeMat(kind) {
  const defs = {}; if (kind === "L") defs.K_L = 1; else if (kind === "V" || kind === "G") defs.K_V = 1; else if (kind === "S") defs.K_S = 1; else defs.K_U = 1;
  return new THREE.ShaderMaterial({ defines: defs, uniforms: U, vertexShader: VS, fragmentShader: kind === "G" ? FS_GLASS : kind === "E" ? FS_LED : FS, side: THREE.DoubleSide, transparent: kind === "G", depthWrite: kind !== "G" });
}
function buildWorld(POS, AUX8, AUX16, IDX) {
  const lo = new THREE.Vector3(D.lo[0], D.lo[1], D.lo[2]), sc = new THREE.Vector3((D.hi[0] - D.lo[0]) / 65535, (D.hi[1] - D.lo[1]) / 65535, (D.hi[2] - D.lo[2]) / 65535);
  const hide = new Set(); for (const d of W.doors) if (d.open) hide.add(d.i);
  const exitEl = W.exit ? W.exit.i : -1; exitDoor = new THREE.Group(); scene.add(exitDoor);
  for (const g of D.groups) {
    if (g.d === "STR") continue;
    const pos = POS.subarray(g.v0 * 3, (g.v0 + g.vc) * 3), orig = IDX.subarray(g.i0, g.i0 + g.ic);
    const aPos = new THREE.BufferAttribute(pos, 3, false), tint = new Uint8Array(g.vc * 4), aTint = new THREE.BufferAttribute(tint, 4, true);
    const aUv2 = g.kind === "L" ? new THREE.BufferAttribute(AUX16.subarray(g.v0 * 2, (g.v0 + g.vc) * 2), 2, true) : null;
    const aBake = (g.kind === "V" || g.kind === "G") ? new THREE.BufferAttribute(AUX8.subarray(g.v0 * 4, (g.v0 + g.vc) * 4), 4, true) : null;
    const mat = makeMat(g.kind), map = new Map();
    for (const p of g.parts) {
      const el = p[0]; for (let i = p[1] * 4, n = (p[1] + p[2]) * 4; i < n; i += 4) { tint[i] = p[5]; tint[i + 1] = p[6]; tint[i + 2] = p[7]; tint[i + 3] = p[8]; }
      if (hide.has(el)) continue;
      let a = 1e9, b = 1e9, c = 1e9, d = -1, e = -1, f = -1;
      for (let i = p[1] * 3, n = (p[1] + p[2]) * 3; i < n; i += 3) { const x = pos[i], y = pos[i + 1], z = pos[i + 2]; if (x < a) a = x; if (x > d) d = x; if (y < b) b = y; if (y > e) e = y; if (z < c) c = z; if (z > f) f = z; }
      const bb = [lo.x + a * sc.x, lo.y + b * sc.y, lo.z + c * sc.z, lo.x + d * sc.x, lo.y + e * sc.y, lo.z + f * sc.z];
      const cz = (bb[2] + bb[5]) / 2, key = el === exitEl ? "exit" : g.d === "SITE" ? "site" : Math.floor((bb[0] + bb[3]) / 24) + "," + Math.floor((bb[1] + bb[4]) / 24) + "," + (cz < 3.2 ? 0 : cz < 6.9 ? 1 : 2);
      let k = map.get(key); if (!k) { k = { n: 0, parts: [], bb: [1e9, 1e9, 1e9, -1e9, -1e9, -1e9] }; map.set(key, k); }
      k.n += p[4]; k.parts.push(p); for (let j = 0; j < 3; j++) { if (bb[j] < k.bb[j]) k.bb[j] = bb[j]; if (bb[j + 3] > k.bb[j + 3]) k.bb[j + 3] = bb[j + 3]; }
    }
    for (const [key, k] of map) {
      const idx = new Uint32Array(k.n); let w = 0; for (const p of k.parts) { idx.set(orig.subarray(p[3], p[3] + p[4]), w); w += p[4]; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", aPos); geo.setAttribute("aTint", aTint); if (aUv2) geo.setAttribute("aUv2", aUv2); if (aBake) geo.setAttribute("aBake", aBake); geo.setIndex(new THREE.BufferAttribute(idx, 1));
      const mesh = new THREE.Mesh(geo, mat); mesh.position.copy(lo); mesh.scale.copy(sc); mesh.frustumCulled = false; mesh.renderOrder = g.kind === "G" ? 5 : 1;
      if (key === "exit") { const h = new THREE.Group(); h.add(mesh); exitDoor.add(h); continue; }
      scene.add(mesh); const b = k.bb;
      chunks.push({ mesh, c: new THREE.Vector3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2), r: Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2, always: key === "site", band: key === "site" ? -1 : +key.split(",")[2] });
    }
  }
  /* sol étendu, ciel, arbres */
  const gg = new THREE.BufferGeometry(), S = 3000, cx = -45, cy = 45, z = -0.06;
  gg.setAttribute("position", new THREE.BufferAttribute(new Float32Array([cx - S, cy - S, z, cx + S, cy - S, z, cx + S, cy + S, z, cx - S, cy + S, z]), 3));
  gg.setAttribute("aTint", new THREE.BufferAttribute(new Uint8Array([255, 255, 255, 1, 255, 255, 255, 1, 255, 255, 255, 1, 255, 255, 255, 1]), 4, true)); gg.setIndex([0, 1, 2, 0, 2, 3]);
  const gm = new THREE.Mesh(gg, makeMat("S")); gm.frustumCulled = false; gm.renderOrder = 0; scene.add(gm);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS_SKY, fragmentShader: FS_SKY, side: THREE.BackSide, depthWrite: false })); sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);
  const T = D.trees || [], M = D.sprites || {};
  if (T.length) { const pos = [], uv = [], lay = [], idx = []; let n = 0;
    const quad = (p, l) => { for (let k = 0; k < 4; k++) pos.push(p[k][0], p[k][1], p[k][2]); uv.push(0, 0, 1, 0, 1, 1, 0, 1); lay.push(l, l, l, l); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4; };
    for (const t of T) { const m = M[t[0]]; if (!m || t[0] === 2) continue; const x = t[1], y = t[2], zz = t[3], s = t[4], Wd = m.size * s, z0 = zz - m.base * Wd, z1 = z0 + Wd;
      for (let k = 0; k < 2; k++) { const a = t[5] + k * Math.PI / 2, dx = Math.cos(a) * Wd / 2, dy = Math.sin(a) * Wd / 2; quad([[x - dx, y - dy, z0], [x + dx, y + dy, z0], [x + dx, y + dy, z1], [x - dx, y - dy, z1]], m.side); } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("aLayer", new THREE.Float32BufferAttribute(lay, 1)); g.setIndex(idx);
    const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS_TREE, fragmentShader: FS_TREE, side: THREE.DoubleSide })); mesh.frustumCulled = false; mesh.renderOrder = 2; scene.add(mesh); }
}
function sign(text, x, y, z, col, w) {
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; const c = cv.getContext("2d");
  c.fillStyle = "rgba(4,22,12,.92)"; c.fillRect(0, 0, 512, 128); c.strokeStyle = col; c.lineWidth = 8; c.strokeRect(6, 6, 500, 116);
  c.fillStyle = col; c.font = "bold 70px 'Segoe UI',Arial,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.shadowColor = col; c.shadowBlur = 18; c.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(w || 1.1, (w || 1.1) / 4, 1); s.position.set(x, y, z); s.renderOrder = 8; scene.add(s); signs.push(s); return s;
}
const LIGHTS = [];   // {x,y,z,r,col:[r,g,b],fl:0|1, on()}
function buildDecor() {
  /* panneaux et lumières vertes des escaliers et de la sortie */
  W.links.forEach(l => {
    const top = l.lb === 2;
    sign(top ? "ESCALIER ▲" : "ESCALIER ▲", l.a[0], l.a[1], l.a[2] + 2.15, "#49e08a"); sign(top ? "ACCÈS ▼" : "ESCALIER ▼", l.b[0], l.b[1], l.b[2] + 2.15, "#49e08a", top ? 1.6 : 1.1);
    LIGHTS.push({ x: l.a[0], y: l.a[1], z: l.a[2] + 1.9, r: 4.2, col: [0.05, 0.42, 0.16] }, { x: l.b[0], y: l.b[1], z: l.b[2] + 1.9, r: top ? 7 : 4.2, col: [0.05, 0.42, 0.16] });
  });
  if (W.exit) { const e = W.exit; sign("SORTIE", e.x + 0.9, e.y, 2.45, "#49e08a", 1.0); sign("SORTIE", e.x + 3.3, e.y - 0.4, 2.55, "#49e08a", 1.0); LIGHTS.push({ x: e.x + 1.4, y: e.y, z: 2.2, r: 6.5, col: [0.03, 0.26, 0.1] }); }
  /* veilleuses : quelques points faiblement éclairés, certains clignotent */
  const r = rng(77);
  for (const L of [0, 1]) { const A = W.lv[L].A, picks = [];
    for (let i = 0; i < 4000 && picks.length < 26; i++) { const c = Math.floor(r() * W.N); if (!A[c]) continue; const p = W.xy(c); if (picks.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 13)) continue; picks.push(p);
      LIGHTS.push({ x: p[0], y: p[1], z: W.lv[L].F[c] + 2.3, r: 6.5, col: r() < 0.25 ? [0.5, 0.12, 0.05] : [0.2, 0.26, 0.36], fl: r() < 0.45 ? 1 + r() * 9 : 0 }); } }
}

/* ───────── 4. personnages ───────── */
function merge(list) {   // [[geometry, matrix|null, color hex]]
  const P = [], Nn = [], Cc = []; const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3(), col = new THREE.Color();
  for (const [g0, m, c] of list) { const g = g0.index ? g0.toNonIndexed() : g0; const p = g.attributes.position, q = g.attributes.normal; col.set(c); if (m) nm.getNormalMatrix(m);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); n.fromBufferAttribute(q, i); if (m) { v.applyMatrix4(m); n.applyMatrix3(nm).normalize(); } P.push(v.x, v.y, v.z); Nn.push(n.x, n.y, n.z); Cc.push(col.r, col.g, col.b); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(Cc, 3)); return g;
}
const M4 = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || sx || 1, sz || sx || 1));
const SKINS = [];   // 0..5 résidents, 6 mamie
function buildSkins() {
  const cyl = (rt, rb, h, s) => { const g = new THREE.CylinderGeometry(rt, rb, h, s || 10); g.rotateX(Math.PI / 2); return g; };   // axe z
  const sph2 = (r) => new THREE.SphereGeometry(r, 12, 9), box = (a, b, c) => new THREE.BoxGeometry(a, b, c);
  const RES = [["#8fa9c4", "#d9d2c5", "#e3c3a6", 0], ["#c9a3ad", "#f1eee8", "#e8c9b0", 1], ["#9db59a", "#cfcfcf", "#d9b99b", 0], ["#b7a58c", "#e9e6df", "#e3c3a6", 1], ["#7f8794", "#bdbdbd", "#dcbc9f", 0], ["#b9a7c9", "#f4f1ea", "#e8c9b0", 1]];
  const mk = (robe, hair, skin, woman, granny) => {
    const lean = granny ? 0.34 : 0.2, T = M4(0, 0, 0.56, 0, lean, 0);   // buste penché vers l'avant (pivot aux hanches)
    const at = (x, y, z, rx, ry, rz, s, sy, sz) => new THREE.Matrix4().multiplyMatrices(T, M4(x, y, z, rx, ry, rz, s, sy, sz));
    const body = [[cyl(0.16, granny ? 0.27 : 0.23, 0.78, 12), at(0, 0, 0.4), robe], [sph2(0.185), at(0, 0, 0.74, 0, 0, 0, 1, 1.18, 0.62), robe], [cyl(granny ? 0.3 : 0.24, granny ? 0.32 : 0.26, 0.24, 12), M4(0, 0, 0.44), robe],
      [cyl(0.05, 0.055, 0.1, 8), at(0.01, 0, 0.84), skin], [sph2(0.112), at(0.035, 0, 0.965, 0, 0, 0, 1, 0.94, 1.08), skin], [sph2(0.118), at(-0.012, 0, 0.995, 0, 0, 0, 1, 0.98, 1.0), hair], [sph2(0.02), at(0.142, 0, 0.955), skin],
      [sph2(granny ? 0.026 : 0.014), at(granny ? 0.112 : 0.122, 0.042, 0.992), granny ? "#0b0708" : "#1c1a18"], [sph2(granny ? 0.026 : 0.014), at(granny ? 0.112 : 0.122, -0.042, 0.992), granny ? "#0b0708" : "#1c1a18"],
      [box(0.01, granny ? 0.07 : 0.045, 0.007), at(0.133, 0, granny ? 0.905 : 0.912), granny ? "#1a0606" : "#7a4a40"]];
    if (woman || granny) body.push([sph2(0.058), at(-0.11, 0, 1.03), hair]);
    if (granny) body.push([cyl(0.2, 0.3, 0.3, 12), at(0, 0, 0.62), "#16121a"]);
    else body.push([box(0.02, 0.2, 0.5), at(0.165, 0, 0.4), "#f2efe8"]);
    const arm = [[cyl(0.045, 0.04, 0.5, 8), M4(0, 0, -0.25), robe], [sph2(0.045), M4(0.005, 0, -0.52), skin]];
    const leg = [[cyl(0.062, 0.05, 0.46, 8), M4(0, 0, -0.23), granny ? "#24202a" : "#d8d4cc"], [box(0.2, 0.085, 0.06), M4(0.045, 0, -0.47), granny ? "#0c0c0e" : "#6b5a4b"]];
    return { body: merge(body), arm: merge(arm), leg: merge(leg), lean, granny: !!granny };
  };
  RES.forEach(r => SKINS.push(mk(r[0], r[1], r[2], r[3], false)));
  SKINS.push(mk("#1c1820", "#e8e6e2", "#cfc4bb", 1, true)); SKINS[6].hunter = true; SKINS[6].eye = [0.132, 0.992];
  /* 7 : le Méchant — corps articulé : parka bleu marine à capuche de fourrure, tour de cou bleu clair avec badge, jean, baskets, écouteurs blancs */
  { const navy = "#2d3750", navy2 = "#1f273a", dark = "#14171f", fur = "#b0915f", fur2 = "#84693f", skin = "#7d5f4c", skin2 = "#69503f", jean = "#3f6297", jean2 = "#2f4c78", blue = "#58b7e6", white = "#eef1f2";
    const lathe = (pts, seg) => { const g = new THREE.LatheGeometry(pts.map(q => new THREE.Vector2(q[0], q[1])), seg || 18); g.rotateX(Math.PI / 2); return g; };
    const sp = (r, a, b) => new THREE.SphereGeometry(r, a || 14, b || 10), tor = (R, r) => new THREE.TorusGeometry(R, r, 8, 18);
    const torso = [[lathe([[0.001, 0.83], [0.2, 0.83], [0.222, 0.87], [0.225, 0.93], [0.212, 1.08], [0.228, 1.28], [0.232, 1.4], [0.2, 1.47], [0.11, 1.52], [0.07, 1.56]]), M4(0, 0, 0, 0, 0, 0, 0.68, 1, 1), navy],
      [lathe([[0.204, 0.825], [0.229, 0.835], [0.231, 0.9], [0.226, 0.908]]), M4(0, 0, 0, 0, 0, 0, 0.7, 1.005, 1), dark], [cyl(0.19, 0.2, 0.16, 14), M4(0, 0, 0.82, 0, 0, 0, 0.68, 1, 1), jean2],
      [sp(0.078), M4(0, 0.2, 1.435), navy], [sp(0.078), M4(0, -0.2, 1.435), navy],
      [box(0.02, 0.105, 0.6), M4(0.146, 0, 1.2), "#1a1e2a"], [box(0.012, 0.012, 0.6), M4(0.153, 0.057, 1.2), "#6f7887"], [box(0.012, 0.012, 0.6), M4(0.153, -0.057, 1.2), "#6f7887"],
      [box(0.012, 0.1, 0.02), M4(0.138, 0.145, 1.0, 0.35, 0, 0), navy2], [box(0.012, 0.1, 0.02), M4(0.138, -0.145, 1.0, -0.35, 0, 0), navy2],
      [box(0.008, 0.02, 0.36), M4(0.161, 0.042, 1.31, -0.15, 0.05, 0), blue], [box(0.008, 0.02, 0.36), M4(0.161, -0.042, 1.31, 0.15, 0.05, 0), blue], [box(0.01, 0.014, 0.03), M4(0.165, 0, 1.165), "#9aa3ad"],
      [box(0.008, 0.086, 0.062), M4(0.167, 0, 1.12), white], [box(0.004, 0.03, 0.036), M4(0.172, 0.02, 1.118), "#3b2a20"], [box(0.004, 0.034, 0.005), M4(0.172, -0.018, 1.128), "#333a44"], [box(0.004, 0.034, 0.005), M4(0.172, -0.018, 1.114), "#333a44"],
      [tor(0.132, 0.052), M4(-0.02, 0, 1.5, 0, -0.28, 0), fur], [tor(0.15, 0.046), M4(-0.055, 0, 1.468, 0, -0.4, 0), fur2], [sp(0.13), M4(-0.135, 0, 1.4, 0, 0, 0, 0.6, 1.15, 0.95), navy]];
    const head = [[cyl(0.05, 0.056, 0.12, 10), M4(0, 0, 0.0), skin2], [sp(0.105, 18, 14), M4(0.01, 0, 0.14, 0, 0, 0, 1.02, 0.88, 1.15), skin], [sp(0.085), M4(0.03, 0, 0.078, 0, 0, 0, 0.98, 0.86, 0.82), skin],
      [sp(0.022), M4(0.113, 0, 0.115, 0, 0, 0, 0.9, 1.35, 0.85), skin2], [box(0.03, 0.02, 0.05), M4(0.1, 0, 0.145, 0, 0.25, 0), skin],
      [sp(0.028), M4(0.0, 0.094, 0.13, 0, 0, 0, 0.55, 0.35, 1), skin2], [sp(0.028), M4(0.0, -0.094, 0.13, 0, 0, 0, 0.55, 0.35, 1), skin2],
      [sp(0.016), M4(0.093, 0.036, 0.156), "#ece7dc"], [sp(0.016), M4(0.093, -0.036, 0.156), "#ece7dc"], [sp(0.0095), M4(0.1045, 0.036, 0.156), "#120a07"], [sp(0.0095), M4(0.1045, -0.036, 0.156), "#120a07"],
      [box(0.014, 0.042, 0.009), M4(0.103, 0.037, 0.181, 0.12, 0, 0), "#0c0908"], [box(0.014, 0.042, 0.009), M4(0.103, -0.037, 0.181, -0.12, 0, 0), "#0c0908"],
      [box(0.014, 0.072, 0.024), M4(0.1, 0, 0.068), "#1a0808"], [box(0.012, 0.06, 0.01), M4(0.104, 0, 0.074), "#f4f1e8"], [box(0.012, 0.05, 0.006), M4(0.103, 0, 0.061), "#ded9cc"],
      [sp(0.108, 16, 12), M4(-0.014, 0, 0.158, 0, 0, 0, 1.02, 0.9, 1.08), "#0b0a0a"],
      [sp(0.012), M4(0.012, 0.098, 0.128), white], [sp(0.012), M4(0.012, -0.098, 0.128), white], [box(0.005, 0.005, 0.3), M4(0.05, 0.078, -0.015, -0.14, -0.28, 0), white], [box(0.005, 0.005, 0.3), M4(0.05, -0.078, -0.015, 0.14, -0.28, 0), white]];
    const uarm = [[cyl(0.063, 0.054, 0.31, 10), M4(0, 0, -0.15), navy], [sp(0.055), M4(0, 0, -0.3), navy]];
    const farm = [[cyl(0.054, 0.046, 0.26, 10), M4(0, 0, -0.13), navy], [cyl(0.049, 0.049, 0.05, 10), M4(0, 0, -0.265), dark], [sp(0.045), M4(0.006, 0, -0.335, 0, 0, 0, 0.75, 0.55, 1.25), skin]];
    const thigh = [[cyl(0.09, 0.068, 0.45, 12), M4(0, 0, -0.225), jean], [sp(0.068), M4(0, 0, -0.45), jean]];
    const shin = [[cyl(0.067, 0.062, 0.42, 12), M4(0, 0, -0.21), jean], [box(0.25, 0.096, 0.07), M4(0.055, 0, -0.452), "#101114"], [sp(0.05), M4(0.17, 0, -0.455, 0, 0, 0, 1, 0.96, 0.7), "#101114"], [box(0.27, 0.1, 0.016), M4(0.06, 0, -0.49), "#7fd6d0"]];
    SKINS.push({ rig: { torso: merge(torso), head: merge(head), uarm: merge(uarm), farm: merge(farm), thigh: merge(thigh), shin: merge(shin) }, granny: false, hunter: true }); }
  chMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS_CH, fragmentShader: FS_CH, side: THREE.DoubleSide });
}
const eyeMat = () => new THREE.MeshBasicMaterial({ color: 0xff2a14 });
function makeChar(skin) {
  const S = SKINS[skin], g = new THREE.Group(), Mh = geo => new THREE.Mesh(geo, chMat); let eyes = null, U2;
  if (S.rig) {   // corps articulé
    const R = S.rig, body = new THREE.Group(); body.add(Mh(R.torso)); g.add(body);
    const head = new THREE.Group(); head.position.set(0.012, 0, 1.54); head.add(Mh(R.head)); body.add(head);
    eyes = new THREE.Group(); const m = eyeMat(), e1 = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), m), e2 = e1.clone(); e1.position.set(0.106, 0.036, 0.156); e2.position.set(0.106, -0.036, 0.156); eyes.add(e1, e2); eyes.visible = false; head.add(eyes);
    const limb = (par, x, y, z, g1, len, g2) => { const a = new THREE.Group(); a.position.set(x, y, z); a.add(Mh(g1)); const b = new THREE.Group(); b.position.z = -len; b.add(Mh(g2)); a.add(b); par.add(a); return [a, b]; };
    const [aL, eL] = limb(body, 0, 0.222, 1.44, R.uarm, 0.3, R.farm), [aR, eR] = limb(body, 0, -0.222, 1.44, R.uarm, 0.3, R.farm), [lL, kL] = limb(g, 0, 0.097, 0.93, R.thigh, 0.45, R.shin), [lR, kR] = limb(g, 0, -0.097, 0.93, R.thigh, 0.45, R.shin);
    aL.rotation.x = 0.09; aR.rotation.x = -0.09;
    U2 = { aL, aR, lL, lR, body, eyes, eL, eR, kL, kR, head, rig: true };
  } else {
    const body = Mh(S.body); g.add(body);
    const sh = 0.56 + Math.cos(S.lean) * 0.7, sx = Math.sin(S.lean) * 0.7, aL = Mh(S.arm), aR = Mh(S.arm), lL = Mh(S.leg), lR = Mh(S.leg);
    const ay = S.armY || 0.21; aL.position.set(sx, ay, sh); aR.position.set(sx, -ay, sh); lL.position.set(0, 0.09, 0.53); lR.position.set(0, -0.09, 0.53); g.add(aL, aR, lL, lR);
    if (S.hunter) { eyes = new THREE.Group(); const m = eyeMat(), e1 = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), m), e2 = e1.clone(); const hx = Math.sin(S.lean) * S.eye[1] + Math.cos(S.lean) * S.eye[0], hz = 0.56 + Math.cos(S.lean) * S.eye[1] - Math.sin(S.lean) * S.eye[0]; e1.position.set(hx, 0.042, hz); e2.position.set(hx, -0.042, hz); eyes.add(e1, e2); eyes.visible = false; g.add(eyes); }
    U2 = { aL, aR, lL, lR, body, eyes };
  }
  g.traverse(o => { o.frustumCulled = false; });
  g.userData = Object.assign(U2, { ph: Math.random() * 6, granny: S.granny, sp: 0 }); g.visible = false; scene.add(g); return g;
}
/* pose : marche (jambes et bras), poursuite (bras tendus) */
function animChar(g, dt, speed, chase) {
  const u = g.userData; u.sp += (speed - u.sp) * Math.min(1, dt * 8); u.ph += dt * (2.2 + u.sp * 3.6);
  if (u.rig) {   // marche avec genoux et coudes ; le buste se penche en courant
    const mv = u.sp > 0.05 ? 1 : 0, sw = Math.min(0.66, 0.16 + u.sp * 0.12) * mv, ph = u.ph * 0.78, s = Math.sin(ph);
    u.lL.rotation.y = -s * sw; u.lR.rotation.y = s * sw; u.kL.rotation.y = 0.06 + 1.25 * sw * Math.max(0, Math.cos(ph + 0.5)); u.kR.rotation.y = 0.06 + 1.25 * sw * Math.max(0, -Math.cos(ph + 0.5));
    if (chase) { u.aL.rotation.y = -1.25 + s * 0.14; u.aR.rotation.y = -1.25 - s * 0.14; u.eL.rotation.y = u.eR.rotation.y = -0.3; }
    else { u.aL.rotation.y = s * sw * 0.85; u.aR.rotation.y = -s * sw * 0.85; u.eL.rotation.y = -(0.16 + sw * 0.9 * Math.max(0, -s) + sw * 0.3); u.eR.rotation.y = -(0.16 + sw * 0.9 * Math.max(0, s) + sw * 0.3); }
    const lean = Math.min(0.2, u.sp * 0.038) + (mv ? 0 : Math.sin(u.ph * 0.35) * 0.008); u.body.rotation.y = lean; u.body.position.x = -0.93 * Math.sin(lean); u.body.position.z = Math.abs(Math.cos(ph)) * 0.022 * mv;
    u.head.rotation.y = -lean * 0.7 + (chase ? -0.12 : 0); u.head.rotation.z = Math.sin(u.ph * 0.23) * (mv ? 0.05 : 0.22);
    u.eyes.visible = !!chase; return;
  }
  const a = Math.min(0.75, 0.16 + u.sp * 0.2) * (u.sp > 0.05 ? 1 : 0), s = Math.sin(u.ph);
  u.lL.rotation.y = s * a; u.lR.rotation.y = -s * a;
  if (chase) { u.aL.rotation.y = -1.35 + s * 0.12; u.aR.rotation.y = -1.35 - s * 0.12; } else { u.aL.rotation.y = -s * a * 0.7 - 0.12; u.aR.rotation.y = s * a * 0.7 - 0.12; }
  u.body.position.z = Math.abs(Math.cos(u.ph)) * 0.018 * (u.sp > 0.05 ? 1 : 0); u.body.rotation.x = s * 0.035 * (u.sp > 0.05 ? 1 : 0);
  if (u.eyes) u.eyes.visible = !!chase;
}
let keyMesh = null, scareG = null, scareA = null, ghost = null, bloodMesh = null, bloodMat = null;
const VS_DEC = `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const FS_DEC = `uniform sampler2D uBlood; uniform vec3 uNight; varying vec2 vUv; varying vec3 vW;` + GLSL_COMMON + GLSL_DYN + `
void main(){ vec4 t=texture2D(uBlood,vUv); if(t.a<0.03) discard; vec3 N=vec3(0.0,0.0,1.0); vec3 V=normalize(cameraPosition-vW); vec3 dl=dyn(vW,N);
  vec3 Hh=normalize(V+normalize(uLampPos-vW)); vec3 col=vec3(0.2,0.008,0.006)*(0.55+0.45*t.r)*(uNight*0.8+dl)+dl*pow(max(dot(N,Hh),0.0),50.0)*0.3;
  gl_FragColor=vec4(tone(fogged(col,length(cameraPosition-vW))), t.a*0.9); }`;
function bloodTexture() {   // 4 taches différentes dans une image
  const cv = document.createElement("canvas"); cv.width = cv.height = 512; const c = cv.getContext("2d"), r = rng(4242);
  for (let k = 0; k < 4; k++) { const ox = (k % 2) * 256 + 128, oy = Math.floor(k / 2) * 256 + 128;
    for (let i = 0; i < 26; i++) { const a = r() * TAU, d = Math.pow(r(), 1.6) * (k === 3 ? 60 : 95), rad = (i < 5 ? 26 + r() * 30 : 3 + r() * 13) * (k === 3 ? 0.7 : 1), x = ox + Math.cos(a) * d * (k === 2 ? 0.45 : 1), y = oy + Math.sin(a) * d;
      const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(0.75, "rgba(170,170,170,0.85)"); g.addColorStop(1, "rgba(120,120,120,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill(); } }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; return t;
}
function buildBlood(seed) {
  if (bloodMesh) { scene.remove(bloodMesh); bloodMesh.geometry.dispose(); bloodMesh = null; }
  const r = rng((seed ^ 0x51ed) >>> 0), pos = [], uv = [], idx = []; let n = 0;
  const quad = (x, y, L, sz, v) => { const A = W.lv[L].A, c = W.cell(x, y); if (c < 0 || !A[c]) return; const z = W.lv[L].F[c] + 0.014, a = r() * TAU, cs = Math.cos(a) * sz / 2, sn = Math.sin(a) * sz / 2, u0 = (v % 2) * 0.5, v0 = Math.floor(v / 2) * 0.5;
    pos.push(x - cs + sn, y - sn - cs, z, x + cs + sn, y + sn - cs, z, x + cs - sn, y + sn + cs, z, x - cs - sn, y - sn + cs, z); uv.push(u0, v0, u0 + 0.5, v0, u0 + 0.5, v0 + 0.5, u0, v0 + 0.5); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4; };
  /* une trace mène à la clé depuis l'escalier le plus proche */
  const k = G.key, A = W.lv[k.L].A; let from = null, bd = 1e9;
  for (const l of W.links) for (const [e, L] of [[l.a, l.la], [l.b, l.lb]]) { if (L !== k.L) continue; const d = Math.hypot(e[0] - k.x, e[1] - k.y); if (d > 10 && d < bd) { bd = d; from = e; } }
  const P = from ? W.astar(A, W.near(A, from[0], from[1], 10), W.near(A, k.x, k.y, 10), 90000) : null;
  if (P) { const pts = P.map(c => W.xy(c)); let left = 34, next = 1.2;
    for (let i = pts.length - 1; i > 0 && left > 0; i--) { const a = pts[i], b = pts[i - 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]); let d = next;
      while (d < len && left > 0) { const f = d / len; quad(a[0] + (b[0] - a[0]) * f + (r() - 0.5) * 0.5, a[1] + (b[1] - a[1]) * f + (r() - 0.5) * 0.5, k.L, 0.3 + r() * 0.45, r() < 0.5 ? 3 : 2); const stp = 1.5 + r() * 1.6; d += stp; left -= stp; }
      next = d - len; } }
  quad(k.x + 0.3, k.y - 0.2, k.L, 1.5, 0);
  for (const L of [0, 1]) for (let i = 0, m = 0; i < 400 && m < 16; i++) { const c = Math.floor(r() * W.N); if (!W.lv[L].A[c]) continue; const q = W.xy(c); quad(q[0], q[1], L, 0.5 + r() * 1.0, Math.floor(r() * 3)); m++; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  bloodMesh = new THREE.Mesh(g, bloodMat); bloodMesh.frustumCulled = false; bloodMesh.renderOrder = 3; scene.add(bloodMesh);
}
function buildProps() {
  const m = new THREE.MeshBasicMaterial({ color: 0xf0c75a }); keyMesh = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20), m), st = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.016, 0.016), m), t1 = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.04), m), t2 = t1.clone();
  ring.rotation.x = Math.PI / 2; st.position.x = 0.11; t1.position.set(0.15, 0, -0.025); t2.position.set(0.12, 0, -0.022); keyMesh.add(ring, st, t1, t2); keyMesh.scale.setScalar(1.5); keyMesh.visible = false; scene.add(keyMesh);
  scareG = makeChar(6); scareA = makeChar(7); ghost = makeChar(7);
  U.uBlood = { value: bloodTexture() }; bloodMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS_DEC, fragmentShader: FS_DEC, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

/* ───────── 5. son (WebAudio, sans fichier) ───────── */
const A = { ctx: null, master: null, amb: null, hum: null, heartT: 0, stepT: 0 };
function audioOn() {
  if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
  try { const C = window.AudioContext || window.webkitAudioContext; A.ctx = new C(); } catch (e) { return; }
  const c = A.ctx; A.master = c.createGain(); A.master.gain.value = 0.9; A.master.connect(c.destination);
  const n = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; A.noise = n;
  /* ambiance : vent sourd + bourdon grave */
  const src = c.createBufferSource(); src.buffer = n; src.loop = true; const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 240; const g = c.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(A.master); src.start();
  const o1 = c.createOscillator(), o2 = c.createOscillator(), og = c.createGain(); o1.frequency.value = 48; o2.frequency.value = 51.5; o1.type = o2.type = "sine"; og.gain.value = 0; o1.connect(og); o2.connect(og); og.connect(A.master); o1.start(); o2.start();
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 120; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  A.amb = { g, og };
  /* fredonnement de la mamie la plus proche */
  const h = c.createOscillator(), hg = c.createGain(), hf = c.createBiquadFilter(), vib = c.createOscillator(), vg = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
  h.type = "triangle"; h.frequency.value = 311; hf.type = "bandpass"; hf.frequency.value = 700; hf.Q.value = 2; hg.gain.value = 0; vib.frequency.value = 5.2; vg.gain.value = 5; vib.connect(vg); vg.connect(h.frequency);
  h.connect(hf); hf.connect(hg); if (pan) { hg.connect(pan); pan.connect(A.master); } else hg.connect(A.master); h.start(); vib.start(); A.hum = { h, hg, pan, n: 0, t: 0 };
}
function env(g, t, a, peak, dcy) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
function sNoise(freq, q, peak, dur, type) { if (!A.ctx) return; const c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = A.noise; f.type = type || "bandpass"; f.frequency.value = freq; f.Q.value = q; s.connect(f); f.connect(g); g.connect(A.master); env(g, c.currentTime, 0.005, peak, dur); s.start(c.currentTime, Math.random()); s.stop(c.currentTime + dur + 0.1); }
function sTone(freq, peak, dur, type, slide) { if (!A.ctx) return; const c = A.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(freq, c.currentTime); if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur); o.connect(g); g.connect(A.master); env(g, c.currentTime, 0.01, peak, dur); o.start(); o.stop(c.currentTime + dur + 0.1); }
const SND = {
  step(run) { sNoise(run ? 190 : 140, 1.2, run ? 0.16 : 0.07, 0.09, "lowpass"); },
  heart() { sTone(52, 0.5, 0.16, "sine", 36); setTimeout(() => sTone(46, 0.35, 0.18, "sine", 32), 150); },
  key() { [1568, 2093, 2637].forEach((f, i) => setTimeout(() => sTone(f, 0.12, 0.7, "sine"), i * 90)); },
  tinkle() { sTone(2400 + Math.random() * 900, 0.03, 0.5, "sine"); },
  door() { sNoise(900, 3, 0.3, 0.12); setTimeout(() => sNoise(300, 1, 0.25, 0.9, "lowpass"), 120); [0, 0.35, 0.7].forEach(d => setTimeout(() => sTone(880, 0.1, 0.22, "square"), d * 1000 + 300)); },
  stairs() { for (let i = 0; i < 5; i++) setTimeout(() => sNoise(120, 1, 0.14, 0.1, "lowpass"), i * 130); },
  sting() { sTone(196, 0.16, 1.1, "sawtooth", 185); sTone(277, 0.13, 1.1, "sawtooth", 262); sNoise(2500, 0.6, 0.06, 0.8); },
  scream() { sTone(520, 0.5, 1.2, "sawtooth", 1500); sTone(547, 0.4, 1.2, "square", 1380); sNoise(1800, 0.5, 0.5, 1.1); },
  stun() { sTone(300, 0.2, 0.5, "triangle", 110); },
  grab() { sNoise(500, 1, 0.2, 0.15); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => sTone(f, 0.14, 0.6, "triangle"), i * 140)); },
  whisper() { for (let i = 0; i < 4; i++) setTimeout(() => sNoise(1800 + Math.random() * 2200, 6, 0.09, 0.22), i * 170 + Math.random() * 60); },
  laugh(v) { for (let i = 0; i < 6; i++) setTimeout(() => sTone(250 - i * 22 + Math.random() * 10, 0.16 * (v || 1), 0.16, "sawtooth", 150 - i * 12), i * 150); },
  slam() { sNoise(95, 0.7, 0.4, 0.4, "lowpass"); sTone(58, 0.25, 0.35, "sine", 40); },
  alarm() { sTone(233, 0.05, 0.9, "sawtooth", 175); },
  thud(v) { sNoise(105, 1, 0.3 * v, 0.13, "lowpass"); },
  creak() { sTone(90 + Math.random() * 60, 0.05, 1.4, "sawtooth", 60 + Math.random() * 40); }
};
const HUM = [311, 277, 311, 370, 311, 277, 233, 277];

/* ───────── 6. commandes ───────── */
const K = { f: 0, b: 0, l: 0, r: 0, run: false, jx: 0, jy: 0 };
let locked = false, actQ = false;
function initInput() {
  const cv = $("gl"), map = { KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r" };   // codes = position des touches : ZQSD sur un clavier français
  addEventListener("keydown", e => { if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; if (G.mode !== "play") return;
    if (map[e.code]) { K[map[e.code]] = 1; e.preventDefault(); } if (e.code === "ShiftLeft" || e.code === "ShiftRight") K.run = true;
    if (e.repeat) return; if (e.code === "KeyF") toggleLamp(); if (e.code === "KeyR") cri(); if (e.code === "KeyC") toggleSlow(); if (e.code === "KeyE" || e.code === "Space") { actQ = true; e.preventDefault(); } });
  addEventListener("keyup", e => { if (map[e.code]) K[map[e.code]] = 0; if (e.code === "ShiftLeft" || e.code === "ShiftRight") K.run = false; });
  addEventListener("blur", () => { K.f = K.b = K.l = K.r = 0; K.run = false; });
  if (!TOUCH) {
    let drag = false;
    cv.addEventListener("mousedown", e => { if (G.mode !== "play") return; audioOn(); if (!locked) { drag = true; try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { } } else if (e.button === 0) actQ = true; });
    addEventListener("mouseup", () => { drag = false; });
    document.addEventListener("pointerlockchange", () => { locked = document.pointerLockElement === cv; $("pause").classList.toggle("on", !locked && G.mode === "play" && !G.noLock); if (locked) G.noLock = false; });
    $("pause").addEventListener("click", () => { try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { } });
    document.addEventListener("pointerlockerror", () => { G.noLock = true; $("pause").classList.remove("on"); });
    addEventListener("mousemove", e => { if (G.mode !== "play" || !(locked || drag)) return; look(e.movementX * 0.0023, e.movementY * 0.0023); });
  }
  /* tactile : pouce gauche = déplacement, pouce droit = regard */
  const st = $("stick"), nub = st.firstElementChild; let mid = null, lid = null, mo = null, lp = null, tapT = 0, tapM = 0;
  cv.addEventListener("pointerdown", e => { if (e.pointerType === "mouse" || G.mode !== "play") return; audioOn(); cv.setPointerCapture(e.pointerId);
    if (e.clientX < innerWidth * 0.45 && mid === null) { mid = e.pointerId; mo = { x: e.clientX, y: e.clientY }; st.style.display = "block"; st.style.left = (mo.x - 60) + "px"; st.style.top = (mo.y - 60) + "px"; nub.style.transform = ""; }
    else if (lid === null) { lid = e.pointerId; lp = { x: e.clientX, y: e.clientY }; tapT = performance.now(); tapM = 0; } });
  cv.addEventListener("pointermove", e => { if (e.pointerId === mid) { let dx = e.clientX - mo.x, dy = e.clientY - mo.y; const l = Math.hypot(dx, dy), m = 52; if (l > m) { dx *= m / l; dy *= m / l; } nub.style.transform = "translate(" + dx + "px," + dy + "px)"; K.jx = dx / m; K.jy = -dy / m; }
    else if (e.pointerId === lid) { const dx = e.clientX - lp.x, dy = e.clientY - lp.y; tapM += Math.abs(dx) + Math.abs(dy); lp = { x: e.clientX, y: e.clientY }; look(dx * 0.0052, dy * 0.0052); } });
  const up = e => { if (e.pointerId === mid) { mid = null; K.jx = K.jy = 0; st.style.display = "none"; } else if (e.pointerId === lid) { lid = null; if (tapM < 10 && performance.now() - tapT < 280 && me() && me().st !== "alive") actQ = true; } };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  const hold = (id, dn, upf) => { const b = $(id); b.addEventListener("pointerdown", e => { e.preventDefault(); audioOn(); dn(); }); if (upf) { b.addEventListener("pointerup", upf); b.addEventListener("pointercancel", upf); b.addEventListener("pointerleave", upf); } };
  hold("tRun", () => { K.run = true; $("tRun").classList.add("on"); }, () => { K.run = false; $("tRun").classList.remove("on"); });
  hold("tAct", () => { actQ = true; }); hold("tLamp", toggleLamp); hold("tSlow", toggleSlow);
}
function look(dx, dy) { const p = G.p; if (!p) return; p.yaw -= dx; p.pitch = clamp(p.pitch - dy, -1.3, 1.3); }
function cri() { if (G.mode === "play" && G.role === "m") request(["cri"]); }
function toggleLamp() { const p = G.p; if (!p || me().st !== "alive") return; if (G.role === "m") return cri();
  if (!p.lamp && p.bat < 0.06) { toast("Batterie vide<small>La lampe se recharge quand elle est éteinte.</small>", 2200); return; } p.lamp = !p.lamp; sNoise(3000, 4, 0.08, 0.03); $("tLamp").classList.toggle("on", p.lamp); }
function toggleSlow() { const p = G.p; if (!p) return; p.slow = !p.slow; $("tSlow").classList.toggle("on", p.slow); }

/* ───────── 7. joueur ───────── */
const G = { mode: "load", players: new Map(), actors: [], me: 0, host: true, solo: true, off: 0, role: "s", p: null, key: null, exitOpen: false, t0: 0, dur: 480, opts: { gran: 3, res: 26, dur: 480 } };
const now = () => performance.now() / 1000 + G.off;
const me = () => G.players.get(G.me);
const SAS = [-42.4, 45.9, -39.55, 48.9];
const inSas = (x, y) => x > SAS[0] && x < SAS[2] && y > SAS[1] && y < SAS[3];
function allowed(x, y, z) { const c = W.cell(x, y); if (c < 0) return false; if (!W.lv[W.level(z + 0.4)].B[c]) return false; if (G.role === "m" && inSas(x, y)) return false; return true; }
function tryMove(p, dx, dy) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.07)); dx /= n; dy /= n; const free = W.blocked(p.x, p.y, p.z) || !allowed(p.x, p.y, p.z);
  for (let i = 0; i < n; i++) {
    if (free || (!W.blocked(p.x + dx, p.y, p.z) && allowed(p.x + dx, p.y, p.z))) p.x += dx;
    if (free || (!W.blocked(p.x, p.y + dy, p.z) && allowed(p.x, p.y + dy, p.z))) p.y += dy;
    if (p.ground) { const g = W.ground(p.x, p.y, p.z); if (g > p.z) p.z = g; }
  }
}
function physics(dt) {
  const p = G.p, P = me(), t = now(), can = P.st === "alive" && t >= G.t0 && !G.fadeT && !(G.role === "m" && (t < G.t0 + G.mWait || t < (G.stunT || 0)));
  let fx = K.r - K.l + K.jx, fy = K.f - K.b + K.jy; const mag = Math.min(1, Math.hypot(fx, fy));
  if (!can) fx = fy = 0;
  const wantRun = K.run && mag > 0.3 && p.stam > 0.02 && !p.tired;
  const slow = p.slow || (TOUCH && mag < 0.55 && !K.run);
  let spd = G.role === "m" ? (wantRun ? SPD.mRun : SPD.mWalk) : (wantRun ? SPD.run : slow ? SPD.slow : SPD.walk);
  p.run = wantRun && mag > 0; p.slowNow = slow && !wantRun;
  if (p.run) { p.stam = Math.max(0, p.stam - dt / (G.role === "m" ? 4.5 : 5.5)); if (p.stam <= 0) p.tired = true; } else { p.stam = Math.min(1, p.stam + dt / 9); if (p.stam > 0.3) p.tired = false; }
  let tx = 0, ty = 0;
  if (mag > 0.05) { const l = Math.hypot(fx, fy), cs = Math.cos(p.yaw), sn = Math.sin(p.yaw); fx /= l; fy /= l; tx = (cs * fy + sn * fx) * spd; ty = (sn * fy - cs * fx) * spd; }
  const k = Math.min(1, 12 * dt); p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k; if (!tx && Math.abs(p.vx) < 0.01) p.vx = 0; if (!ty && Math.abs(p.vy) < 0.01) p.vy = 0;
  if (p.vx || p.vy) tryMove(p, p.vx * dt, p.vy * dt);
  p.vz -= 20 * dt; const nz = p.z + p.vz * dt, g = W.ground(p.x, p.y, p.z, p.ground ? W.STEP : 0.05);
  if (nz <= g || (p.ground && p.z - g <= W.STEP + 0.02)) { p.z = g; p.vz = 0; p.ground = true; } else { p.z = nz; p.ground = false; }
  const sp = Math.hypot(p.vx, p.vy); p.moving = sp > 0.3;
  if (p.moving && p.ground) { p.bob += dt * (3 + sp * 2.2); A.stepT -= dt * sp; if (A.stepT <= 0) { A.stepT = p.run ? 1.9 : 1.5; if (!p.slowNow) SND.step(p.run); } }
  const tz = p.z + EYE; if (p.camZ == null || Math.abs(tz - p.camZ) > 0.9) p.camZ = tz; else p.camZ += (tz - p.camZ) * Math.min(1, dt * 14);
}
function placeCam(dt) {
  const P = me(), p = G.p; let x, y, z, yaw, pitch;
  if (G.scare) { const s = G.scare, k = Math.min(1, (performance.now() - s.t0) / 180); yaw = p.yaw + angDiff(s.yaw, p.yaw) * k; pitch = p.pitch * (1 - k); x = p.x; y = p.y; z = p.camZ; p.yaw = yaw; p.pitch = pitch;
    const sh = (Math.random() - 0.5) * 0.05, scareG = s.m; scareG.visible = true; scareG.position.set(x + Math.cos(s.yaw) * (1.7 - 0.72 * k), y + Math.sin(s.yaw) * (1.7 - 0.72 * k), p.z + 0.06 + sh); scareG.rotation.z = s.yaw + Math.PI; animChar(scareG, dt, 3, true); }
  else if (P && P.st !== "alive" && G.spec != null && G.players.get(G.spec)) { const q = G.players.get(G.spec); x = q.sx; y = q.sy; z = q.sz + EYE; yaw = q.syaw; pitch = q.pitch || 0; }
  else { const b = p.moving && p.ground ? Math.sin(p.bob) * (p.run ? 0.045 : 0.025) : 0; x = p.x; y = p.y; z = p.camZ + b; yaw = p.yaw; pitch = p.pitch;
    const sk = Math.max(0, (G.danger || 0) - 0.5) * 0.03 + (performance.now() < (G.shakeT || 0) ? 0.035 : 0); if (sk) { yaw += (Math.random() - 0.5) * sk; pitch += (Math.random() - 0.5) * sk; } }
  camera.position.set(x, y, z); const cp = Math.cos(pitch); camera.lookAt(x + Math.cos(yaw) * cp, y + Math.sin(yaw) * cp, z + Math.sin(pitch)); camera.updateMatrixWorld();
}

/* ───────── 8. PNJ : résidents et mamies (calculés par l'hôte, rejoués par tous) ───────── */
function setPath(a, pts, sp, t0, st) { a.p = pts; a.sp = sp; a.t0 = t0; a.st = st; const cum = [0]; for (let i = 2; i < pts.length; i += 2) cum.push(cum[cum.length - 1] + Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1])); a.cum = cum; a.len = cum[cum.length - 1]; }
function actorAt(a, t) {
  const s = clamp((t - a.t0) * a.sp, 0, a.len), c = a.cum; let i = a.seg || 0; if (i >= c.length - 1 || c[i] > s) i = 0; while (i < c.length - 2 && c[i + 1] < s) i++; a.seg = i;
  if (c.length < 2) { a.x = a.p[0]; a.y = a.p[1]; a.mv = false; return; }
  const f = c[i + 1] > c[i] ? (s - c[i]) / (c[i + 1] - c[i]) : 0, x0 = a.p[i * 2], y0 = a.p[i * 2 + 1], x1 = a.p[i * 2 + 2], y1 = a.p[i * 2 + 3];
  a.x = x0 + (x1 - x0) * f; a.y = y0 + (y1 - y0) * f; a.mv = s < a.len - 0.01 && t >= a.t0; if (a.mv) a.dir = Math.atan2(y1 - y0, x1 - x0);
}
const H = { masks: null, cells: null, tick: 0, r: Math.random };
function hostMasks() {
  if (H.masks) return; H.masks = [0, 1].map(L => { const M = W.lv[L].A.slice(); if (L === 0) for (let c = 0; c < W.N; c++) if (M[c]) { const p = W.xy(c); if (inSas(p[0], p[1])) M[c] = 0; } return M; });
  H.cells = H.masks.map(M => { const o = []; for (let c = 0; c < W.N; c++) if (M[c]) o.push(c); return o; });
}
function pathTo(a, tx, ty, sp, st, t) {
  const M = H.masks[a.L], s = W.near(M, a.x, a.y, 12), e = W.near(M, tx, ty, 12); if (s < 0 || e < 0) return false;
  const P = W.astar(M, s, e, 60000); if (!P) return false; const pts = [Math.round(a.x * 100) / 100, Math.round(a.y * 100) / 100];
  for (let i = 1; i < P.length; i++) { const q = W.xy(P[i]); pts.push(Math.round(q[0] * 100) / 100, Math.round(q[1] * 100) / 100); }
  setPath(a, pts, sp, t, st); emit(["a", a.id, st, sp, Math.round(t * 1000) / 1000, pts]); return true;
}
function stopAt(a, t, st) { const pts = [Math.round(a.x * 100) / 100, Math.round(a.y * 100) / 100]; setPath(a, pts, 1, t, st); emit(["a", a.id, st, 1, t, pts]); }
function hostActors(t) {
  for (const a of G.actors) {
    actorAt(a, t); const done = (t - a.t0) * a.sp >= a.len;
    if (a.kind === "r") {
      if (t < (a.hold || 0)) continue;
      if (done && !a.wait) a.wait = t + 2 + H.r() * 10;
      if (done && t >= a.wait) { const C = H.cells[a.L], q = W.xy(C[Math.floor(H.r() * C.length)]); if (Math.hypot(q[0] - a.x, q[1] - a.y) < 60 && pathTo(a, q[0], q[1], a.base, 0, t)) a.wait = 0; else a.wait = t + 0.4; }
      continue;
    }
    /* mamie : patrouille, poursuite, recherche */
    if (t < G.t0 + 12) continue;
    let best = null, bd = 1e9;
    for (const P of G.players.values()) { if (P.role !== "s" || P.st !== "alive" || W.level(P.z + 0.4) !== a.L) continue; const d = Math.hypot(P.x - a.x, P.y - a.y);
      if (d < 0.85) { caught(P.id, -1 - a.id, a); continue; }
      const f = P.f || 0, loud = (f & 2) || (f & 4), quiet = (f & 8) || !(f & 1);
      const seen = d < 2.0 || (d < 13 && loud && W.los(a.x, a.y, P.z + 1.3, P.x, P.y, P.z + 1.3)) || (d < 5.5 && !quiet && W.los(a.x, a.y, P.z + 1.3, P.x, P.y, P.z + 1.3)) || (a.tg === P.id && d < 9 && W.los(a.x, a.y, P.z + 1.3, P.x, P.y, P.z + 1.3));
      if (seen && d < bd) { bd = d; best = P; } }
    if (best) { const was = a.st === 1; if (!was) emit(["fx", "sting", a.id]); a.tg = best.id; a.seenT = t; a.lx = best.x; a.ly = best.y;
      if (!was || t >= (a.rp || 0)) { a.rp = t + 0.4; if (!pathTo(a, best.x, best.y, G.final ? 3.75 : 3.35, 1, t)) { a.rp = t + 0.2; if (!was) stopAt(a, t, 1); } } }
    else if (a.st === 1) { if (t - a.seenT > 3.5 || done) { a.tg = null; if (!pathTo(a, a.lx, a.ly, 2.2, 2, t)) stopAt(a, t, 0); a.wait = 0; } }
    else if (done) { if (!a.wait) a.wait = t + (a.st === 2 ? 2.5 : 0.5 + H.r() * 3); if (t >= a.wait) { const C = H.cells[a.L]; let q = null, qd = -1; for (let i = 0; i < 5; i++) { const c = W.xy(C[Math.floor(H.r() * C.length)]), d = Math.hypot(c[0] - a.x, c[1] - a.y); if (d > qd && d < 70) { qd = d; q = c; } } if (q && pathTo(a, q[0], q[1], 1.05, 0, t)) a.wait = 0; else a.wait = t + 0.4; } }
  }
}

/* ───────── 9. réseau (PeerJS : un hôte, les autres s'y connectent) ───────── */
const NET = { peer: null, conns: new Map(), conn: null, code: "", nid: 1 }, PFX = "allanbim-nuit-ehpad-";
const peerOpts = () => Object.assign({ debug: 0 }, window.JEU_PEER || {});
async function needPeer() { if (!window.Peer) await script(FILES.peer); }
function emit(m) { for (const c of NET.conns.values()) if (c.open) try { c.send(m); } catch (e) { } onMsg(m); }
function request(m) { if (G.host) hostMsg(G.me, m); else if (NET.conn && NET.conn.open) try { NET.conn.send(m); } catch (e) { } }
function netClose() { try { if (NET.peer) NET.peer.destroy(); } catch (e) { } NET.peer = null; NET.conn = null; NET.conns.clear(); }
function lobbyState() { return ["lob", [...G.players.values()].map(p => [p.id, p.name]), G.opts]; }
async function hostCreate(name) {
  await needPeer(); netClose(); G.host = true; G.solo = false; G.me = 0; G.off = 0; G.players.clear(); G.players.set(0, newPlayer(0, name));
  return new Promise((res, rej) => { let tries = 0;
    const go = () => { const code = Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join(""); const peer = new window.Peer(PFX + code, peerOpts()); NET.peer = peer;
      peer.on("open", () => { NET.code = code; res(code); });
      peer.on("error", e => { if (e.type === "unavailable-id" && tries++ < 5) { peer.destroy(); go(); } else if (!NET.code) rej(new Error("Impossible de créer la partie : pas de connexion au service de mise en relation. Le mode à plusieurs demande internet et ne marche pas dans un aperçu ; le mode solo marche partout.")); });
      peer.on("connection", c => { let id = null;
        c.on("data", m => { if (!Array.isArray(m)) return;
          if (m[0] === "hello") { if (G.mode !== "lobby" || G.players.size >= 8) { try { c.send(["no", G.mode !== "lobby" ? "La partie a déjà commencé." : "La partie est complète."]); } catch (e) { } return; } id = NET.nid++; NET.conns.set(id, c); G.players.set(id, newPlayer(id, String(m[1] || "Joueur").slice(0, 14))); c.send(["you", id]); emit(lobbyState()); }
          else if (id != null) hostMsg(id, m); });
        c.on("close", () => { if (id == null) return; NET.conns.delete(id); const P = G.players.get(id); if (G.mode === "lobby") { G.players.delete(id); emit(lobbyState()); } else if (P && P.st === "alive") { P.gone = true; if (P.role === "s") caught(id, 0, null, true); else emit(["feed", "Le Méchant a quitté la partie."]); } }); });
    }; go(); });
}
async function clientJoin(name, code) {
  await needPeer(); netClose(); G.host = false; G.solo = false; G.players.clear();
  return new Promise((res, rej) => { const peer = new window.Peer(undefined, peerOpts()); NET.peer = peer; let ok = false; const to = setTimeout(() => { if (!ok) rej(new Error("Pas de réponse. Vérifie le code.")); }, 14000);
    peer.on("error", e => { if (!ok) { clearTimeout(to); rej(new Error(e.type === "peer-unavailable" ? "Aucune partie avec ce code." : "Connexion impossible. Le mode à plusieurs demande internet et ne marche pas dans un aperçu.")); } });
    peer.on("open", () => { const c = peer.connect(PFX + code, { reliable: true, serialization: "json" }); NET.conn = c; NET.code = code;
      c.on("open", () => { c.send(["hello", name]); });
      c.on("data", m => { if (!Array.isArray(m)) return; if (m[0] === "you") { G.me = m[1]; ok = true; clearTimeout(to); res(); syncClock(); } else if (m[0] === "no") { clearTimeout(to); rej(new Error(m[1])); } else onMsg(m); });
      c.on("close", () => { if (G.mode !== "menu") { toMenu("La connexion avec l'hôte est coupée."); } }); }); });
}
function syncClock() { let n = 0, best = 1e9; const one = () => { if (!NET.conn || !NET.conn.open) return; NET.conn.send(["pi", performance.now()]); if (++n < 5) setTimeout(one, 350); }; NET.onPong = (t0, th) => { const rtt = performance.now() - t0; if (rtt < best) { best = rtt; G.off = th + rtt / 2000 - performance.now() / 1000; } }; one(); }
/* messages reçus par l'hôte */
function hostMsg(id, m) {
  const P = G.players.get(id); if (!P) return; const t = now();
  switch (m[0]) {
    case "pi": { const c = NET.conns.get(id); if (c) c.send(["po", m[1], now()]); break; }
    case "s": P.x = m[1]; P.y = m[2]; P.z = m[3]; P.yaw = m[4]; P.pitch = m[5]; P.f = m[6]; break;
    case "esc": if (G.mode === "play" && P.role === "s" && P.st === "alive" && G.exitOpen) emit(["out", id, "out", null, null, null]); break;
    case "take": if (G.mode === "play" && P.role === "s" && P.st === "alive" && G.key && G.key.holder < 0 && Math.hypot(P.x - G.key.x, P.y - G.key.y) < 2 && Math.abs(P.z - G.key.z) < 1.5) emit(["key", id]); break;
    case "open": if (G.mode === "play" && !G.exitOpen && G.key && G.key.holder === id && Math.hypot(P.x - W.exit.x, P.y - W.exit.y) < 3.2) emit(["exit"]); break;
    case "cri": if (G.mode === "play" && P.role === "m" && t >= G.t0 + G.mWait && t >= (G.stunT || 0) && t >= (P.criT || 0)) { P.criT = t + 25; emit(["cri", P.x, P.y, P.z, t]); } break;
    case "grab": { if (G.mode !== "play" || P.role !== "m" || t < (P.grabT || 0) || t < (G.stunT || 0) || t < G.t0 + G.mWait) break; P.grabT = t + 1.2; let best = null, bd = 1.75, kind = 0;
      const test = (x, y, z, o, k) => { const d = Math.hypot(x - P.x, y - P.y); if (d < bd && Math.abs(z - P.z) < 1.2 && Math.abs(angDiff(Math.atan2(y - P.y, x - P.x), P.yaw)) < 1.0 && W.los(P.x, P.y, P.z + 1.2, x, y, z + 1.2)) { bd = d; best = o; kind = k; } };
      for (const Q of G.players.values()) if (Q.role === "s" && Q.st === "alive") test(Q.x, Q.y, Q.z, Q, 1);
      for (const a of G.actors) if (a.kind === "r") test(a.x, a.y, W.LV_Z[a.L], a, 2);
      if (kind === 1) caught(best.id, id, P); else if (kind === 2) { best.hold = t + 4; best.wait = 0; stopAt(best, t, 0); emit(["stun", t + 6]); } else emit(["fx", "miss", id]); break; }
  }
}
function caught(id, by, src, left) {
  const P = G.players.get(id); if (!P || P.st !== "alive") return; const drop = G.key && G.key.holder === id ? [P.x, P.y, W.ground(P.x, P.y, P.z + 0.3)] : null;
  emit(["out", id, left ? "left" : "caught", by, src ? [src.x, src.y] : null, drop]);
}

/* ───────── 10. partie ───────── */
function newPlayer(id, name) { return { id, name: name || "Joueur", role: "s", st: "alive", x: 0, y: 0, z: 0, yaw: 0, pitch: 0, f: 0, mesh: null, sx: 0, sy: 0, sz: 0, syaw: 0 }; }
function roomHint(x, y, L) { const ns = y > 58 ? "aile nord" : y < 48 ? "aile sud" : "partie centrale", ew = x < -37 ? "côté ouest" : "côté est"; let nm = "", bd = 6; for (const r of (W.head.rooms || [])) { if ((r[2] === "N00") !== (L === 0)) continue; const d = Math.hypot(r[3] - x, r[4] - y); if (d < bd) { bd = d; nm = r[0]; } } return (L === 0 ? "au rez-de-chaussée" : "à l'étage") + ", " + ns + " " + ew + (nm ? " (" + nm + ")" : ""); }
function hostStart() {
  hostMasks(); const seed = Math.floor(Math.random() * 1e9), r = rng(seed); H.r = r; const ids = [...G.players.keys()], t = now();
  const villain = ids.length >= 2 ? ids[Math.floor(r() * ids.length)] : -1;
  /* la clé : dans une pièce, loin de la sortie */
  const ex = W.near(H.masks[0], W.exit.x + 3.5, W.exit.y, 16), DX = W.dist(H.masks[0], ex), cand = [];
  for (const rm of (W.head.rooms || [])) { const L = rm[2] === "N00" ? 0 : rm[2] === "N01" ? 1 : -1; if (L < 0 || !/chambre|salle|bur|office|détente|salon|tisanerie|coiffure|rééducation|convivialité|animation|famille|atelier|soins|transmissions/i.test(rm[0])) continue;
    const c = W.near(H.masks[L], rm[3], rm[4], 6); if (c < 0) continue; if (L === 0 && DX[c] < 150) continue; const p = W.xy(c); cand.push([p[0], p[1], W.lv[L].F[c], L]); }
  const k = cand.length ? cand[Math.floor(r() * cand.length)] : [W.exit.x + 20, W.exit.y, 0, 0];
  /* PNJ */
  const acts = [], far = (L, pts, min) => { const C = H.cells[L]; for (let i = 0; i < 60; i++) { const p = W.xy(C[Math.floor(r() * C.length)]); if (pts.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > min)) return p; } return W.xy(C[Math.floor(r() * C.length)]); };
  const stairs = L => W.links.filter(l => l.la === L || l.lb === L).map(l => l.la === L ? l.a : l.b);
  for (let i = 0; i < G.opts.res; i++) { const L = i % 2, p = far(L, [], 0); acts.push([i, "r", L, Math.floor(r() * 6), p[0], p[1], 0.65 + r() * 0.55]); }
  const gp = [[], []]; for (let i = 0; i < G.opts.gran; i++) { const L = (i + 1) % 2, p = far(L, stairs(L).concat(gp[L]), 22); gp[L].push(p); acts.push([100 + i, "g", L, villain < 0 && i === 0 ? 7 : 6, p[0], p[1], 1.05]); }
  /* départs : résidents sur la toiture, le Méchant dans le hall */
  const sp = {}, sv = ids.filter(i => i !== villain); sv.forEach((id, i) => { const a = i / Math.max(1, sv.length) * TAU, c = W.near(W.lv[W.spawn[3]].A, W.spawn[0] + Math.cos(a) * 1.4, W.spawn[1] + Math.sin(a) * 1.4, 10), p = W.xy(c); sp[id] = [p[0], p[1], W.lv[W.spawn[3]].F[c], r() * TAU]; });
  if (villain >= 0) { const p = far(0, stairs(0).concat([[W.exit.x, W.exit.y]]), 20), c = W.near(H.masks[0], p[0], p[1], 8); sp[villain] = [p[0], p[1], W.lv[0].F[c], r() * TAU]; }
  emit(["start", { seed, villain, key: [k[0], k[1], k[2], k[3]], acts, sp, t0: t + 4, dur: G.opts.dur, names: [...G.players.values()].map(p => [p.id, p.name]) }]);
}
function startGame(S) {
  for (const a of G.actors) scene.remove(a.mesh); for (const P of G.players.values()) if (P.mesh) { scene.remove(P.mesh); P.mesh = null; }
  if (!G.host) { G.players.clear(); S.names.forEach(n => G.players.set(n[0], newPlayer(n[0], n[1]))); }
  G.actors = S.acts.map(a => { const o = { id: a[0], kind: a[1], L: a[2], skin: a[3], x: a[4], y: a[5], base: a[6], st: 0, dir: Math.random() * TAU, mesh: makeChar(a[3]), wait: S.t0 + Math.random() * 9, vyaw: 0 }; setPath(o, [a[4], a[5]], 1, S.t0, 0); if (o.kind === "r") o.mesh.scale.setScalar(0.94 + (a[0] % 5) * 0.025); return o; });
  for (const P of G.players.values()) { P.role = P.id === S.villain ? "m" : "s"; P.st = "alive"; P.gone = false; P.by = null; const s = S.sp[P.id]; P.x = P.sx = s[0]; P.y = P.sy = s[1]; P.z = P.sz = s[2]; P.yaw = P.syaw = s[3]; P.f = 0; P.grabT = 0; if (P.id !== G.me) P.mesh = makeChar(P.role === "m" ? 7 : P.id % 6); }
  const M = me(), s = S.sp[G.me]; G.role = M.role; EYE = G.role === "m" ? 1.74 : 1.5; G.p = { x: s[0], y: s[1], z: s[2], vx: 0, vy: 0, vz: 0, yaw: s[3], pitch: 0, ground: true, stam: 1, tired: false, lamp: G.role === "s", slow: false, bob: 0, camZ: null, moving: false, bat: 1 };
  G.key = { x: S.key[0], y: S.key[1], z: S.key[2], L: S.key[3], holder: -1, hint: roomHint(S.key[0], S.key[1], S.key[3]) }; G.exitOpen = false; G.t0 = S.t0; G.dur = S.dur; G.mWait = 18; G.stunT = 0; G.scare = null; G.spec = null; G.ended = false; G.fadeT = 0; G.linkCd = 0; G.villain = S.villain;
  exitDoor.children.forEach(h => { h.position.y = 0; }); W.setDoor(W.exit, false); W.lv[0].B = W.lv[0].B0 ? W.lv[0].B0.slice() : W.lv[0].B; if (!W.lv[0].B0) W.lv[0].B0 = W.lv[0].B.slice();
  keyMesh.visible = true; scareG.visible = scareA.visible = false; $("tLamp").classList.toggle("on", G.p.lamp); $("tSlow").classList.remove("on"); $("keyChip").classList.remove("on"); $("feed").innerHTML = "";
  ["sMenu", "sLobby", "sEnd", "sLoad"].forEach(i => $(i).hidden = true); document.body.classList.add("play"); G.mode = "play"; $("fade").style.opacity = 1; setTimeout(() => { $("fade").style.opacity = 0; }, 500);
  G.adapt = 1; G.openT = 0; G.escT = 0; G.lampOutT = 0; G.shakeT = 0; G.final = false; G.criT = 0; G.danger = 0; G.ghostOn = false; G.ghostT = S.t0 + 38 + Math.random() * 30; ghost.visible = false; buildBlood(S.seed);
  $("tAct").textContent = G.role === "m" ? "Attraper" : "Action"; $("tLamp").textContent = G.role === "m" ? "Cri" : "Lampe"; $("tSlow").style.display = G.role === "m" ? "none" : "";
  toast(G.role === "m" ? "Tu es <span style='color:#e0453a'>LE MÉCHANT</span><small>Attrape les résidents avant qu'ils sortent. Attention : les vrais résidents te sonnent.</small>" : (S.villain >= 0 ? "Tu es un <span style='color:#49c98a'>RÉSIDENT</span><small>Un joueur est le Méchant. Fonds-toi parmi les résidents, trouve la clé, sors par le hall.</small>" : "Tu es un <span style='color:#49c98a'>RÉSIDENT</span><small>Descends de la toiture, trouve la clé, sors par le hall. Le Méchant et les mamies rôdent…</small>"), 6500);
  if (A.amb) { A.amb.g.gain.setTargetAtTime(0.5, A.ctx.currentTime, 2); A.amb.og.gain.setTargetAtTime(0.16, A.ctx.currentTime, 3); }
  if (!TOUCH) { try { const r = $("gl").requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { } }
}
/* messages reçus par tout le monde (l'hôte se les envoie aussi) */
function onMsg(m) {
  switch (m[0]) {
    case "lob": if (!G.host) { G.players.clear(); m[1].forEach(p => G.players.set(p[0], newPlayer(p[0], p[1]))); G.opts = m[2]; } if (G.mode === "lobby" || G.mode === "end") showLobby(); break;
    case "po": if (NET.onPong) NET.onPong(m[1], m[2]); break;
    case "start": startGame(m[1]); break;
    case "S": for (const s of m[1]) { if (s[0] === G.me) continue; const P = G.players.get(s[0]); if (P) { P.x = s[1]; P.y = s[2]; P.z = s[3]; P.yaw = s[4]; P.pitch = s[5]; P.f = s[6]; } } break;
    case "a": { const a = G.actors.find(x => x.id === m[1]); if (a && !G.host) setPath(a, m[5], m[3], m[4], m[2]); break; }
    case "key": G.key.holder = m[1]; keyMesh.visible = false; if (m[1] === G.me) { SND.key(); $("keyChip").classList.add("on"); toast("Tu as la clé !<small>Va ouvrir la porte du hall, au rez-de-chaussée.</small>", 4000); } else if (G.role === "s") { feed("🗝 " + esc(G.players.get(m[1]).name) + " a la clé"); } break;
    case "exit": G.exitOpen = true; Monde.openExit(W); G.doorT = performance.now(); SND.door(); toast(G.role === "m" ? "La sortie est ouverte !<small>Ils s'échappent…</small>" : "La porte est ouverte !<small>Sors vite.</small>", 3500); break;
    case "stun": G.stunT = m[1]; if (G.role === "m") { SND.stun(); toast("C'était un vrai résident…<small>Tu es sonné quelques secondes.</small>", 3000); } else feed("Le Méchant s'est trompé de résident"); break;
    case "cri": { G.criT = m[4] + 25; if (G.role === "m") { SND.laugh(1); break; } const p = G.p, d = Math.hypot(m[1] - p.x, m[2] - p.y) + Math.abs(m[3] - p.z) * 3;
      if (d < 40) SND.laugh(clamp(1.2 - d / 34, 0.15, 1)); if (d < 19 && me().st === "alive") { G.lampOutT = now() + 4.5; G.shakeT = performance.now() + 900; toast("Ta lampe s'éteint…", 1600); } break; }
    case "fx": if (m[1] === "sting") { const a = G.actors.find(x => x.id === m[2]); if (a && G.p && Math.hypot(a.x - G.p.x, a.y - G.p.y) < 16 && W.level(G.p.z + 0.4) === a.L) { SND.sting(); if (a.skin === 7) SND.laugh(0.7); G.lampOutT = Math.max(G.lampOutT || 0, now() + 0.9); G.shakeT = performance.now() + 500; } } else if (m[1] === "miss" && m[2] === G.me) SND.grab(); break;
    case "feed": feed(esc(m[1])); break;
    case "out": { const P = G.players.get(m[1]); if (!P) break; P.st = m[2] === "out" ? "out" : "caught"; P.by = m[3]; if (P.mesh) P.mesh.visible = false;
      if (m[5] && G.key.holder === m[1]) { G.key.holder = -1; G.key.x = m[5][0]; G.key.y = m[5][1]; G.key.z = m[5][2]; G.key.L = W.level(m[5][2] + 0.4); G.key.hint = roomHint(G.key.x, G.key.y, G.key.L); keyMesh.visible = true; $("keyChip").classList.remove("on"); if (G.role === "s") feed("🗝 La clé est tombée"); }
      if (m[1] === G.me) { if (m[2] === "caught") { const ac = m[3] < 0 ? G.actors.find(x => x.id === -1 - m[3]) : null; G.scare = { t0: performance.now(), yaw: m[4] ? Math.atan2(m[4][1] - G.p.y, m[4][0] - G.p.x) : G.p.yaw, m: m[3] >= 0 || (ac && ac.skin === 7) ? scareA : scareG }; SND.scream(); $("flash").style.opacity = 0.5; }
        else if (m[2] === "out") { SND.win(); toast("Tu es dehors !<small>Tu as survécu à la nuit.</small>", 4000); pickSpec(); } }
      else feed(m[2] === "out" ? "🚪 " + esc(P.name) + " s'est échappé" : m[2] === "left" ? esc(P.name) + " a quitté la partie" : "💀 " + esc(P.name) + " a été attrapé");
      if (G.host) checkEnd(); break; }
    case "end": endGame(m[1]); break;
  }
}
function checkEnd(force) {
  if (G.ended) return; const sv = [...G.players.values()].filter(p => p.role === "s"); if (!force && sv.some(p => p.st === "alive")) return; G.ended = true;
  setTimeout(() => emit(["end", { res: [...G.players.values()].map(p => [p.id, p.name, p.role, p.st === "alive" ? "time" : p.st, p.by]), time: force ? 1 : 0 }]), 2300);
}
function endGame(R) {
  G.mode = "end"; G.scare = null; scareG.visible = scareA.visible = false; document.body.classList.remove("play"); $("pause").classList.remove("on"); if (document.pointerLockElement) document.exitPointerLock(); $("flash").style.opacity = 0; $("pulse").style.opacity = 0;
  if (A.amb) { A.amb.g.gain.setTargetAtTime(0.12, A.ctx.currentTime, 1); A.amb.og.gain.setTargetAtTime(0.04, A.ctx.currentTime, 1); A.hum.hg.gain.setTargetAtTime(0, A.ctx.currentTime, 0.2); }
  const mine = R.res.find(r => r[0] === G.me), out = R.res.filter(r => r[2] === "s" && r[3] === "out").length, nS = R.res.filter(r => r[2] === "s").length;
  const win = mine[2] === "s" ? mine[3] === "out" : out === 0;
  $("endT").innerHTML = win ? "<em style='color:#49c98a;text-shadow:0 0 28px rgba(73,201,138,.4)'>Gagné</em>" : "<em>Perdu</em>";
  $("endS").textContent = mine[2] === "s" ? (mine[3] === "out" ? "Tu es sorti de l'EHPAD." : mine[3] === "time" ? "Le jour ne s'est jamais levé pour toi : temps écoulé." : mine[4] >= 0 ? "Le Méchant t'a attrapé." : "Une mamie t'a attrapé.") : (out === 0 ? "Personne ne t'a échappé." : out + " résident" + (out > 1 ? "s" : "") + " sur " + nS + (out > 1 ? " t'ont échappé." : " t'a échappé."));
  $("endRes").innerHTML = R.res.map(r => "<div><span>" + esc(r[1]) + (r[2] === "m" ? " · <b style='color:#e0453a'>le Méchant</b>" : "") + "</span><span class='" + (r[2] === "m" ? (out === 0 ? "w" : "l") : r[3] === "out" ? "w" : "l") + "'>" + (r[2] === "m" ? (nS - out) + " attrapé" + (nS - out > 1 ? "s" : "") : r[3] === "out" ? "Échappé" : r[3] === "time" ? "Temps écoulé" : r[3] === "left" ? "Parti" : "Attrapé") + "</span></div>").join("");
  $("bAgain").hidden = !G.host; $("endMsg").textContent = G.host ? "" : "L'hôte peut relancer une partie."; $("endMsg").style.color = "var(--muted)"; $("sEnd").hidden = false;
}
function pickSpec() { const P = me(); if (!P || P.st === "alive") return; const al = [...G.players.values()].filter(p => p.st === "alive" && p.id !== G.me); if (!al.length) { G.spec = null; return; } const i = al.findIndex(p => p.id === G.spec); G.spec = al[(i + 1) % al.length].id; toast("Tu regardes " + esc(G.players.get(G.spec).name) + "<small>" + (TOUCH ? "Touche l'écran" : "Clic") + " pour changer de joueur</small>", 2500); }
let toastT = 0; function toast(h, ms) { const t = $("toast"); t.innerHTML = h; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms || 2500); }
function feed(h) { const f = $("feed"), d = document.createElement("div"); d.innerHTML = h; f.appendChild(d); while (f.children.length > 4) f.firstChild.remove(); setTimeout(() => d.remove(), 6000); }
function showLobby() {
  G.mode = "lobby"; document.body.classList.remove("play"); ["sMenu", "sEnd", "sLoad"].forEach(i => $(i).hidden = true); $("sLobby").hidden = false; $("lobCode").textContent = NET.code;
  $("lobList").innerHTML = [...G.players.values()].map(p => "<div class='pl'><i></i><span>" + esc(p.name) + "</span><small>" + (p.id === 0 ? "hôte" : "") + (p.id === G.me ? " · toi" : "") + "</small></div>").join("");
  $("lobOpts").style.display = G.host ? "" : "none"; $("bStart").hidden = !G.host; $("lobMsg").style.color = "var(--muted)";
  $("lobMsg").textContent = G.host ? (G.players.size < 2 ? "En attente d'autres joueurs… (seul, il n'y aura pas de Méchant joueur)" : G.players.size + " joueurs : l'un de vous sera le Méchant, tiré au sort.") : "En attente du lancement par l'hôte…";
}
function toMenu(msg) { netClose(); G.mode = "menu"; for (const P of G.players.values()) if (P.mesh) scene.remove(P.mesh); G.players.clear(); document.body.classList.remove("play"); if (document.pointerLockElement) document.exitPointerLock(); $("pause").classList.remove("on"); ["sLobby", "sEnd", "sLoad"].forEach(i => $(i).hidden = true); $("sMenu").hidden = false; $("menuMsg").textContent = msg || ""; $("flash").style.opacity = 0; $("pulse").style.opacity = 0;
  for (const a of G.actors) scene.remove(a.mesh); G.actors = []; if (keyMesh) keyMesh.visible = false; if (ghost) ghost.visible = false; if (bloodMesh) bloodMesh.visible = false; if (scareG) { scareG.visible = scareA.visible = false; } G.scare = null; if (A.amb) { A.amb.g.gain.setTargetAtTime(0.12, A.ctx.currentTime, 1); A.amb.og.gain.setTargetAtTime(0.03, A.ctx.currentTime, 1); A.hum.hg.gain.setTargetAtTime(0, A.ctx.currentTime, 0.2); } }
function initUI() {
  const nm = $("name"); try { nm.value = localStorage.getItem("jeu-ehpad-nom") || ""; } catch (e) { }
  const name = () => { const v = nm.value.trim() || "Joueur"; try { localStorage.setItem("jeu-ehpad-nom", v); } catch (e) { } return v; };
  const busy = (b, on) => { ["bSolo", "bHost", "bJoin"].forEach(i => $(i).disabled = on); };
  $("bSolo").onclick = () => { audioOn(); netClose(); G.host = true; G.solo = true; G.me = 0; G.off = 0; G.players.clear(); G.players.set(0, newPlayer(0, name())); G.opts = { gran: 3, res: 26, dur: 480 }; hostStart(); };
  $("bHost").onclick = async () => { audioOn(); busy(1, true); $("menuMsg").textContent = "Création de la partie…"; try { await hostCreate(name()); G.opts = { gran: +$("oGran").value, res: +$("oRes").value, dur: +$("oDur").value }; $("menuMsg").textContent = ""; showLobby(); } catch (e) { $("menuMsg").textContent = e.message; netClose(); } busy(1, false); };
  $("bJoin").onclick = async () => { audioOn(); const code = $("code").value.trim().toUpperCase(); if (code.length !== 4) { $("menuMsg").textContent = "Tape le code de 4 lettres donné par l'hôte."; return; } busy(1, true); $("menuMsg").textContent = "Connexion…"; try { await clientJoin(name(), code); $("menuMsg").textContent = ""; G.mode = "lobby"; showLobby(); } catch (e) { $("menuMsg").textContent = e.message; netClose(); } busy(1, false); };
  ["oGran", "oRes", "oDur"].forEach(i => $(i).onchange = () => { G.opts = { gran: +$("oGran").value, res: +$("oRes").value, dur: +$("oDur").value }; emit(lobbyState()); });
  $("bStart").onclick = () => { audioOn(); hostStart(); };
  $("bLeave").onclick = () => toMenu(""); $("bMenu").onclick = () => toMenu(""); $("quit").onclick = () => toMenu("");
  $("bAgain").onclick = () => { audioOn(); if (G.solo) hostStart(); else { G.mode = "lobby"; emit(lobbyState()); } };
  $("bCopy").onclick = () => { const u = location.href.split("#")[0] + "#" + NET.code; const done = () => { $("bCopy").textContent = "Lien copié"; setTimeout(() => $("bCopy").textContent = "Copier le lien", 1600); }; try { navigator.clipboard.writeText(u).then(done, () => { $("lobMsg").textContent = u; }); } catch (e) { $("lobMsg").textContent = u; } };
  const h = (location.hash || "").slice(1).toUpperCase(); if (/^[A-Z]{4}$/.test(h)) $("code").value = h;
  /* grain d'image */
  const cv = document.createElement("canvas"); cv.width = cv.height = 160; const c = cv.getContext("2d"), im = c.createImageData(160, 160); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); $("grain").style.backgroundImage = "url(" + cv.toDataURL() + ")";
}

/* ───────── 11. boucle ───────── */
const RED = [0.6, 0.04, 0.03]; let alarmT = 0;
/* apparition : une silhouette du Méchant au bout du couloir, qui disparaît quand on approche (ce n'est pas le vrai) */
function apparition(dt, t, danger, L) {
  const P = me(), p = G.p; if (G.mode !== "play" || G.role !== "s" || !P || P.st !== "alive") { ghost.visible = false; G.ghostOn = false; return; }
  if (G.ghostOn) { const d = Math.hypot(ghost.position.x - p.x, ghost.position.y - p.y);
    if (d < 5.5 || t > G.ghostEnd) { ghost.visible = false; G.ghostOn = false; G.lampOutT = Math.max(G.lampOutT || 0, t + 0.4); G.ghostT = t + 40 + Math.random() * 45; }
    else { ghost.rotation.z = Math.atan2(p.y - ghost.position.y, p.x - ghost.position.x); animChar(ghost, dt, 0, false); ghost.userData.eyes.visible = true; } return; }
  if (t < G.ghostT || L > 1 || danger > 0.15 || t < G.t0 + 25) return;
  const a = p.yaw + (Math.random() - 0.5) * 0.8, d = 9 + Math.random() * 8, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d, c = W.cell(x, y), z = W.LV_Z[L];
  if (c >= 0 && W.lv[L].A[c] && !W.blocked(x, y, z, 0.3) && W.los(p.x, p.y, z + 1.4, x, y, z + 1.4)) { ghost.position.set(x, y, W.lv[L].F[c]); ghost.visible = true; G.ghostOn = true; G.ghostEnd = t + 2.6; SND.whisper(); G.shakeT = performance.now() + 250; }
  else G.ghostT = t + 2;
}
let frameN = 0, lastT = 0, sendT = 0, tickT = 0, hudT = 0, lampDir = null, tmpV = null, tinkT = 0, creakT = 20;
function useLink(p, d) {
  G.fadeT = performance.now(); $("fade").style.opacity = 1; SND.stairs();
  setTimeout(() => { let tx = d[0], ty = d[1]; for (let a = 0; a < TAU; a += 0.6) { const x = d[0] + Math.cos(a + p.yaw) * 0.9, y = d[1] + Math.sin(a + p.yaw) * 0.9; if (!W.blocked(x, y, d[2]) && allowed(x, y, d[2])) { tx = x; ty = y; break; } }
    p.x = tx; p.y = ty; p.z = d[2]; p.vx = p.vy = p.vz = 0; p.camZ = null; G.linkCd = now() + 1.2; $("fade").style.opacity = 0; G.fadeT = 0; }, 520);
}
function interactions(t) {
  const p = G.p, P = me(), KEYN = TOUCH ? "Action" : "E"; let pr = "";
  if (P.st !== "alive") { if (actQ) pickSpec(); actQ = false; $("prompt").classList.remove("on"); return; }
  const L = W.level(p.z + 0.4), awake = G.role !== "m" || (t >= G.t0 + G.mWait && t >= G.stunT);
  /* escaliers (le Méchant ne monte pas sur la toiture) */
  let link = null, up = false;
  if (awake && !G.fadeT && t > G.linkCd && t >= G.t0) for (const l of W.links) for (const [s, d, u] of [[l.a, l.b, true], [l.b, l.a, false]]) {
    if (Math.hypot(p.x - s[0], p.y - s[1]) < 1.35 && Math.abs(p.z - s[2]) < 0.8 && !(G.role === "m" && (d[2] > 6.5 || s[2] > 6.5))) { link = d; up = u; } }
  if (link) { pr = KEYN + " — " + (up ? "Monter" : "Descendre") + " par l'escalier"; if (actQ) { useLink(p, link); actQ = false; } }
  if (G.role === "m") { if (actQ && awake) request(["grab"]); if (t < G.t0 + G.mWait) pr = "Tu te réveilles dans " + Math.ceil(G.t0 + G.mWait - t) + " s…"; else if (t < G.stunT) pr = "Sonné… " + Math.ceil(G.stunT - t) + " s"; }
  else {
    const k = G.key;
    if (k.holder < 0 && Math.hypot(p.x - k.x, p.y - k.y) < 1.6 && Math.abs(p.z - k.z) < 1.5) { pr = KEYN + " — Prendre la clé"; if (actQ) request(["take"]); }
    if (!G.exitOpen) { if (L === 0 && Math.hypot(p.x - W.exit.x, p.y - W.exit.y) < 2.8) { if (k.holder === G.me) { if (t > (G.openT || 0)) { G.openT = t + 0.4; request(["open"]); } } else pr = "Porte fermée à clé"; } }
    else { const z = W.conf.win; if (z && p.x > z[0] && p.x < z[2] && p.y > z[1] && p.y < z[3] && t > (G.escT || 0)) { G.escT = t + 0.5; request(["esc"]); } }
  }
  actQ = false; const el = $("prompt"); el.textContent = pr; el.classList.toggle("on", !!pr);
}
function hud(t) {
  { const p = G.p, b = $("bat"), left = G.t0 + G.dur - t;
    if (G.role === "m") { const w = Math.ceil((G.criT || 0) - t); b.textContent = w > 0 ? "😈 Cri : " + w + " s" : "😈 Cri prêt (" + (TOUCH ? "bouton Cri" : "R") + ")"; b.style.color = w > 0 ? "" : "#e0453a"; }
    else { b.textContent = "🔦 " + Math.round(p.bat * 100) + " %"; b.style.color = p.bat < 0.2 ? "#e0453a" : ""; }
    $("grain").style.opacity = 0.07 + (G.danger || 0) * 0.22 + (t < (G.lampOutT || 0) ? 0.1 : 0);
    if (!G.final && t >= G.t0 && left < 90 && left > 0) { G.final = true; toast("Plus qu'une minute trente…<small>" + (G.role === "m" ? "Les mamies accélèrent." : "Les lumières passent au rouge. Elles accélèrent.") + "</small>", 3800); } }
  const P = me(), p = G.p, left = Math.max(0, G.t0 + G.dur - t), k = G.key; $("timer").textContent = t < G.t0 ? "Prêt…" : Math.floor(left / 60) + ":" + String(Math.floor(left % 60)).padStart(2, "0");
  const sv = [...G.players.values()].filter(q => q.role === "s"); $("alive").textContent = "👤 " + sv.filter(q => q.st === "alive").length + "/" + sv.length; $("alive").style.display = sv.length > 1 || G.role === "m" ? "" : "none";
  $("lvl").textContent = W.LV_NAME[W.level((P.st === "alive" ? p.z : camera.position.z - EYE) + 0.4)]; $("stam").firstElementChild.style.width = Math.round(p.stam * 100) + "%"; $("stam").firstElementChild.style.background = p.tired ? "#b3261e" : "#d8d4c8";
  let o;
  if (P.st === "caught") o = "Tu as été attrapé. Tu regardes les autres."; else if (P.st === "out") o = "Tu es dehors. Tu regardes les autres.";
  else if (G.role === "m") o = "Attrape les résidents joueurs (" + (TOUCH ? "bouton Attraper" : "clic") + "). Ceux qui courent ou qui ont une lampe ne sont pas de vrais résidents.";
  else if (G.exitOpen) o = "La porte du hall est ouverte : sors par le rez-de-chaussée !";
  else if (k.holder === G.me) o = "Tu as la clé. Va à la porte du hall, au rez-de-chaussée (panneau SORTIE).";
  else if (k.holder >= 0) o = esc(G.players.get(k.holder).name) + " a la clé. Rejoins le hall, au rez-de-chaussée.";
  else o = (W.level(p.z + 0.4) === 2 ? "Trouve l'accès pour descendre (panneau vert). " : "") + "La clé est " + k.hint + ".";
  $("objS").innerHTML = o; $("objT").textContent = G.role === "m" ? "Le Méchant" : "Objectif";
}
function frame(tm) {
  requestAnimationFrame(frame); const dt = Math.min(0.05, (tm - lastT) / 1000 || 0.016); lastT = tm; const t = now();
  if (G.mode === "play" || G.mode === "end") {
    const p = G.p, P = me();
    if (G.mode === "play") {
      physics(dt); P.x = p.x; P.y = p.y; P.z = p.z; P.yaw = p.yaw; P.pitch = p.pitch; P.f = (p.moving ? 1 : 0) | (p.run ? 2 : 0) | (p.lamp ? 4 : 0) | (p.slowNow ? 8 : 0);
      interactions(t);
      if (tm - sendT > 80) { sendT = tm; if (!G.host) request(["s", +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(3), +p.pitch.toFixed(2), P.f]); }
      if (G.host && tm - tickT > 100) { tickT = tm; hostActors(t);
        if (!G.solo) emit(["S", [...G.players.values()].filter(q => q.st === "alive").map(q => [q.id, +q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2), +q.yaw.toFixed(3), +(q.pitch || 0).toFixed(2), q.f])]);
        if (!G.ended && t > G.t0 + G.dur) checkEnd(true); }
      if (G.scare && performance.now() - G.scare.t0 > 1700) { G.scare = null; scareG.visible = scareA.visible = false; $("flash").style.opacity = 0; pickSpec(); }
      if (G.scare) $("flash").style.opacity = Math.random() < 0.3 ? 0.42 : 0.1;
      if (tm - hudT > 200) { hudT = tm; hud(t); }
    }
    placeCam(dt);
    /* PNJ */
    let nearG = null, ng = 1e9, danger = 0; const myL = W.level(camera.position.z - EYE + 0.4);
    for (const a of G.actors) { if (!G.host || G.mode !== "play") actorAt(a, t); const m = a.mesh, z = W.LV_Z[a.L], d = Math.hypot(a.x - camera.position.x, a.y - camera.position.y);
      m.visible = d < 55 && Math.abs(z - (camera.position.z - EYE)) < 5; a.vyaw += angDiff(a.dir, a.vyaw) * Math.min(1, dt * 6);
      if (m.visible) { m.position.set(a.x, a.y, W.ground(a.x, a.y, z + 0.3)); m.rotation.z = a.vyaw; animChar(m, dt, a.mv ? a.sp : 0, a.kind === "g" && a.st === 1); }
      if (a.kind === "g" && a.L === myL && d < ng) { ng = d; nearG = a; } }
    /* autres joueurs */
    for (const Q of G.players.values()) { if (Q.id === G.me || !Q.mesh) continue; const k = Math.min(1, dt * 12), sp = Math.hypot(Q.x - Q.sx, Q.y - Q.sy) / Math.max(dt, 0.001) * k;
      Q.sx += (Q.x - Q.sx) * k; Q.sy += (Q.y - Q.sy) * k; Q.sz += (Q.z - Q.sz) * k; Q.syaw += angDiff(Q.yaw, Q.syaw) * k; Q.mesh.visible = Q.st === "alive" && !(G.spec === Q.id && P.st !== "alive");
      if (Q.mesh.visible) { Q.mesh.position.set(Q.sx, Q.sy, Q.sz); Q.mesh.rotation.z = Q.syaw; animChar(Q.mesh, dt, Math.min(5, sp), Q.role === "m" && (Q.f & 2)); }
      if (Q.role === "m" && Q.st === "alive" && G.role === "s" && W.level(Q.z + 0.4) === myL) { const d = Math.hypot(Q.x - camera.position.x, Q.y - camera.position.y); if (d < ng) { ng = d; nearG = Q; } } }
    danger = G.mode === "play" && G.role === "s" && P.st === "alive" && nearG ? clamp(1 - ng / 16, 0, 1) : 0; G.danger = danger;
    for (const Q of G.players.values()) { if (Q.role !== "m" || Q.id === G.me || !Q.mesh || !Q.mesh.visible || !A.ctx) continue; const d = Math.hypot(Q.sx - camera.position.x, Q.sy - camera.position.y), sp2 = Q.mesh.userData.sp; if (d < 17 && sp2 > 0.5) { Q.stT = (Q.stT || 0) - dt * sp2; if (Q.stT <= 0) { Q.stT = 1.7; SND.thud(clamp(1 - d / 17, 0, 1)); } } }
    apparition(dt, t, danger, myL);
    /* clé, porte */
    if (keyMesh.visible) { const k = G.key; keyMesh.position.set(k.x, k.y, k.z + 0.9 + Math.sin(tm / 600) * 0.05); keyMesh.rotation.z = tm / 900; keyMesh.rotation.y = 0.5; }
    if (G.exitOpen) { const o = Math.min(1, (performance.now() - G.doorT) / 1600); exitDoor.children.forEach(h => { h.position.y = o * 2.75; }); }
    /* lampe */
    const fw = tmpV.set(0, 0, -1).applyQuaternion(camera.quaternion); lampDir.lerp(fw, Math.min(1, dt * 11)).normalize(); U.uLampDir.value.copy(lampDir);
    U.uLampPos.value.copy(camera.position).addScaledVector(fw, 0.05); U.uLampPos.value.z -= 0.14;
    const on = G.mode === "play" && ((P.st === "alive" && p.lamp && G.role === "s") || !!G.scare); let fl = 0.93 + 0.07 * Math.sin(tm / 53) * Math.sin(tm / 17) - (Math.sin(tm / 2900) > 0.992 ? 0.6 : 0);
    /* batterie : elle se vide lampe allumée, se recharge éteinte ; la lampe grésille quand le danger approche */
    if (G.mode === "play" && P.st === "alive" && G.role === "s") { if (p.lamp) { p.bat = Math.max(0, p.bat - dt / 170); if (p.bat <= 0) { p.lamp = false; $("tLamp").classList.remove("on"); toast("Plus de batterie…<small>La lampe se recharge quand elle est éteinte.</small>", 3200); } } else p.bat = Math.min(1, p.bat + dt / 75); }
    if (danger > 0.3 && Math.sin(tm / 61) * Math.sin(tm / 23 + 2.0) > 0.78 - danger * 0.45) fl *= 0.12;
    const cut2 = t < (G.lampOutT || 0) && !G.scare; fl *= 0.4 + 0.6 * Math.min(1, p.bat * 5);
    U.uLampP.value.set(on && !cut2 ? 2.6 * fl : 0, 0.955, 0.84, 30);
    /* les yeux s'habituent au noir quand la lampe est éteinte */
    G.adapt += ((on ? 1 : 2.6) - G.adapt) * Math.min(1, dt * (on ? 3 : 0.5)); const nb = G.role === "m" ? 5.5 : G.adapt; U.uNight.value.set(0.05 * nb * (G.role === "m" ? 1.25 : 1), 0.062 * nb * (G.role === "m" ? 0.6 : 1), 0.095 * nb * (G.role === "m" ? 0.55 : 1));
    let si = 0; for (const Q of G.players.values()) { if (si >= 3) break; if (Q.id === G.me || Q.st !== "alive" || !(Q.f & 4) || Q.role !== "s") continue; const cp = Math.cos(Q.pitch || 0), dx = Math.cos(Q.syaw) * cp, dy = Math.sin(Q.syaw) * cp, dz = Math.sin(Q.pitch || 0);
      U.uSpPos.value[si].set(Q.sx + dx * 0.3, Q.sy + dy * 0.3, Q.sz + 1.25, 2.4); U.uSpDir.value[si].set(dx, dy, dz, Math.min(28, W.ray(Q.sx, Q.sy, Q.sz + 1.3, dx, dy, dz, 28) + 0.6)); si++; }
    for (; si < 3; si++) U.uSpPos.value[si].w = 0;
    /* petites lumières : les 8 plus proches */
    const cand = []; const cp = camera.position;
    for (const l of LIGHTS) { const d = Math.hypot(l.x - cp.x, l.y - cp.y) + Math.abs(l.z - cp.z) * 3; if (d < 40) cand.push([d, l.x, l.y, l.z, l.r, G.final ? RED : l.col, G.final ? 0.35 + 0.65 * Math.abs(Math.sin(tm / 420)) : l.fl ? (Math.sin(tm / 90 * (1 + l.fl * 0.13)) * Math.sin(tm / 37 + l.fl) > 0.1 ? 1 : 0.12) : 1]); }
    if (keyMesh.visible) cand.push([Math.hypot(G.key.x - cp.x, G.key.y - cp.y) * 0.5, G.key.x, G.key.y, G.key.z + 0.9, 4.2, [0.75, 0.55, 0.14], 0.8 + 0.2 * Math.sin(tm / 300)]);
    for (const a of G.actors) if (a.kind === "g" && a.st === 1 && a.mesh.visible) cand.push([0.1, a.x, a.y, W.LV_Z[a.L] + 1.4, 3.2, [0.7, 0.05, 0.03], 1]);
    cand.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < 8; i++) { const c = cand[i]; if (c) { U.uPtPos.value[i].set(c[1], c[2], c[3], c[4]); U.uPtCol.value[i].set(c[5][0] * c[6], c[5][1] * c[6], c[5][2] * c[6]); } else U.uPtPos.value[i].w = 0; }
    for (const s of signs) s.material.opacity = clamp(1.25 - s.position.distanceTo(cp) / 46, 0, 1);
    /* peur : battements de cœur et fredonnement quand une mamie est proche */
    if (A.ctx && G.mode === "play") { const danger = G.role === "s" && P.st === "alive" && nearG ? clamp(1 - ng / 16, 0, 1) : 0; A.heartT -= dt; if (danger > 0.05 && A.heartT <= 0) { SND.heart(); A.heartT = 1.15 - danger * 0.7; }
      $("pulse").style.opacity = danger > 0.05 ? danger * 0.55 * (0.6 + 0.4 * Math.sin(tm / (220 - danger * 110))) : 0;
      const hm = A.hum; hm.t -= dt; if (hm.t <= 0) { hm.t = 0.62; hm.n = (hm.n + 1) % HUM.length; hm.h.frequency.setTargetAtTime(HUM[hm.n] * (nearG && nearG.st === 1 ? 0.5 : 1), A.ctx.currentTime, 0.05); }
      hm.hg.gain.setTargetAtTime(G.role === "s" && nearG ? clamp(1 - ng / 22, 0, 1) * 0.11 : 0, A.ctx.currentTime, 0.2);
      if (hm.pan && nearG) { const ax = (nearG.sx !== undefined ? nearG.sx : nearG.x) - cp.x, ay = (nearG.sy !== undefined ? nearG.sy : nearG.y) - cp.y; hm.pan.pan.setTargetAtTime(clamp(-Math.sin(angDiff(Math.atan2(ay, ax), p.yaw)), -1, 1) * 0.8, A.ctx.currentTime, 0.1); }
      if (keyMesh.visible && G.role === "s") { tinkT -= dt; const kd = Math.hypot(G.key.x - cp.x, G.key.y - cp.y); if (kd < 14 && Math.abs(G.key.z - (cp.z - EYE)) < 2 && tinkT <= 0) { SND.tinkle(); tinkT = 0.5 + kd * 0.12; } }
      creakT -= dt; if (creakT <= 0) { creakT = 12 + Math.random() * 25; const q = Math.random(); if (q < 0.5) SND.creak(); else if (q < 0.8) SND.slam(); else SND.whisper(); }
      if (G.final) { alarmT -= dt; if (alarmT <= 0) { alarmT = 1.9; SND.alarm(); } } }
  } else { /* menu : caméra qui tourne lentement au-dessus du bâtiment */
    const a = tm / 26000; camera.position.set(-38 + Math.cos(a) * 62, 48 + Math.sin(a) * 62, 26); camera.lookAt(-38, 48, 2); camera.updateMatrixWorld(); U.uLampP.value.x = 0; for (let i = 0; i < 8; i++) U.uPtPos.value[i].w = 0; for (let i = 0; i < 3; i++) U.uSpPos.value[i].w = 0; U.uNight.value.set(0.34, 0.42, 0.62);
  }
  U.uFog.value.w = G.mode === "play" || G.mode === "end" ? (camera.position.z > 8 ? 0.02 : 0.05) : 0.006;
  pmat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pmat);
  /* on n'affiche que ce qui peut se voir : dedans, le brouillard cache tout au-delà de ~55 m et les autres niveaux au-delà de ~24 m */
  const inGame = G.mode === "play" || G.mode === "end", cz = camera.position.z, roof = cz > 8, far = !inGame ? 400 : roof ? 120 : TOUCH ? 46 : 58, band = cz < 3.2 ? 0 : cz < 6.9 ? 1 : 2;
  for (const c of chunks) { if (c.always) continue; sph.center.copy(c.c); sph.radius = c.r; const d = c.c.distanceTo(camera.position) - c.r; c.mesh.visible = d < far && (!inGame || roof || c.band === band || d < 24) && frustum.intersectsSphere(sph); }
  /* au menu, 20 images par seconde suffisent (tout le bâtiment est affiché) */
  if (window.JEU_SANS_RENDU || (!inGame && (frameN++ % 3))) return;
  renderer.render(scene, camera);
}

async function main() {
  try {
    if (!THREE) throw new Error("Le fichier three.min.js manque dans le dossier de la maquette.");
    if (!window.Monde) throw new Error("Le fichier jeu/monde.js manque.");
    initGL(); initUI();
    await script(FILES.data); D = window.MAQ_DATA; window.MAQ_DATA = null; if (!D) throw new Error("Données illisibles : " + FILES.data);
    const I = D.img; ltotal = 8 + I.tex.length + I.spr.length; step("Lecture de la géométrie…");
    await script(FILES.model); const b64 = window.MAQ_MODEL; window.MAQ_MODEL = null; if (!b64) throw new Error("Géométrie illisible : " + FILES.model);
    const bin = await gunzip(b64); step("Lecture de l'éclairage…");
    await script(FILES.images);
    const [lm, gl, sky, tex, spr] = await Promise.all([loadImg(I.lm), loadImg(I.gl), loadImg(I.sky), Promise.all(I.tex.map(loadImg)), Promise.all(I.spr.map(loadImg))]);
    step("Préparation des collisions…"); await script(FILES.monde); W = Monde.unpack(await gunzip(window.JEU_MONDE)); window.JEU_MONDE = null; Monde.arena(W);
    step("Préparation de la scène…"); await new Promise(r => setTimeout(r, 30));
    const vb = D.vcount * 6, a0 = vb + (4 - vb % 4) % 4, POS = new Uint16Array(bin, 0, D.vcount * 3), AUX8 = new Uint8Array(bin, a0, D.vcount * 4), AUX16 = new Uint16Array(bin, a0, D.vcount * 2), IDX = new Uint32Array(bin, a0 + D.vcount * 4, D.icount);
    const Gd = D.ground, V4 = () => new THREE.Vector4(0, 0, 0, 0);
    Object.assign(U, { uTex: { value: texArray(tex, TOUCH ? 256 : 512, false) }, uSpr: { value: texArray(spr, TOUCH ? 256 : 512, true) }, uLM: { value: tex2D(lm, {}) }, uGL: { value: tex2D(gl, {}) }, uSky: { value: tex2D(sky, { mips: true, repeatS: true }) },
      uGround: { value: new THREE.Vector4(Gd[0], Gd[2], 1 / (Gd[1] - Gd[0]), 1 / (Gd[3] - Gd[2])) }, uSkyU0: { value: D.sky.u0 }, uSkyS: { value: D.sky.s }, uExposure: { value: 1.25 }, uEnv: { value: 0.05 }, uSkyGain: { value: 0.05 }, uRel: { value: 0.012 }, uLed: { value: 0.035 },
      uNight: { value: new THREE.Vector3(0.05, 0.062, 0.095) }, uFog: { value: new THREE.Vector4(0.004, 0.006, 0.011, 0.05) },
      uLampPos: { value: new THREE.Vector3() }, uLampDir: { value: new THREE.Vector3(1, 0, 0) }, uLampP: { value: new THREE.Vector4(0, 0.955, 0.84, 30) },
      uSpPos: { value: [V4(), V4(), V4()] }, uSpDir: { value: [V4(), V4(), V4()] }, uPtPos: { value: Array.from({ length: 8 }, V4) }, uPtCol: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) } });
    lampDir = new THREE.Vector3(1, 0, 0); tmpV = new THREE.Vector3();
    buildWorld(POS, AUX8, AUX16, IDX); buildDecor(); buildSkins(); buildProps(); initInput();
    step(); $("sLoad").hidden = true; $("sMenu").hidden = false; G.mode = "menu";
    window.__jeu = { G, W, U, NET, H, K, camera, renderer, scene, chunks, LIGHTS, hostStart, request, emit, now, SND, A, physics, interactions, hostActors };
    requestAnimationFrame(frame);
  } catch (err) { $("loadmsg").textContent = err.message || String(err); $("loadmsg").style.color = "#e0453a"; $("bar").style.display = "none"; console.error(err); }
}
main();
})();
