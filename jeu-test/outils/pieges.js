// Cherche les endroits où un joueur peut entrer (marche, chute, saut) mais d'où il ne peut plus ressortir.
const fs=require('fs'),zlib=require('zlib'); const Monde=require('../jeu/monde.js');
const s=fs.readFileSync(require('path').join(__dirname,'../jeu/jeu_monde.js'),'utf8'); const b=zlib.gunzipSync(Buffer.from(s.slice(s.indexOf('"')+1,s.lastIndexOf('"')),'base64'));
const W=Monde.arena(Monde.unpack(b.buffer.slice(b.byteOffset,b.byteOffset+b.length)));
const JUMP=0.68, STEP=W.STEP, nx=W.nx, N=W.N, NF=W.NF; const out={};
for(const L of [0,1,2]){ const lv=W.lv[L], B=lv.B, A=lv.A, Z=W.LV_Z[L];
  // états : (case, hauteur de sol) où l'on peut se tenir debout
  const id=new Map(), st=[]; const key=(c,f)=>c*64+Math.round((f-Z+1)*20);
  const stand=(c,f)=>{ if(!B[c]) return -1; const k=key(c,f); let i=id.get(k); if(i!==undefined) return i; const p=W.xy(c); if(W.blocked(p[0],p[1],f)||W.ground(p[0],p[1],f)!==f){ id.set(k,-1); return -1; } i=st.length; st.push([c,f]); id.set(k,i); return i; };
  const edges=[]; const q=[]; const seen=[]; const arena=[];
  for(let c=0;c<N;c++) if(A[c]){ const i=stand(c,lv.F[c]); if(i>=0){ arena.push(i); } }
  const add=(i)=>{ if(!seen[i]){ seen[i]=1; q.push(i); } };
  arena.forEach(add);
  const nb=(c)=>{ const r=[]; const cx=c%nx; if(cx<nx-1)r.push(c+1); if(cx>0)r.push(c-1); if(c+nx<N)r.push(c+nx); if(c-nx>=0)r.push(c-nx); return r; };
  for(let h=0;h<q.length;h++){ const i=q[h], [c,f]=st[i]; const E=[];
    // marche et chute
    for(const c2 of nb(c)){ if(!B[c2]) continue; const p=W.xy(c2); if(W.blocked(p[0],p[1],f)) continue; const f2=W.ground(p[0],p[1],f); if(f2<Z-0.6) continue; const j=stand(c2,f2); if(j>=0){ E.push(j); add(j); } }
    // saut : jusqu'à 4 cases en l'air, à la hauteur du saut
    const za=f+JUMP-0.08; let fr=[c], vis=new Set([c]);
    const pc=W.xy(c); if(!W.blocked(pc[0],pc[1],za)) for(let d=0;d<4;d++){ const nf=[]; for(const a of fr) for(const c2 of nb(a)){ if(vis.has(c2)||!B[c2]) continue; const p=W.xy(c2); if(W.blocked(p[0],p[1],za)) continue; vis.add(c2); nf.push(c2); const f2=W.ground(p[0],p[1],f+JUMP,0.05); if(f2<Z-0.6) continue; const j=stand(c2,f2); if(j>=0){ E.push(j); add(j); } } fr=nf; }
    edges[i]=E; }
  // retour : peut-on revenir à la zone normale ?
  const rev=st.map(()=>[]); edges.forEach((E,i)=>E&&E.forEach(j=>rev[j].push(i)));
  const ok=new Uint8Array(st.length); const q2=[]; arena.forEach(i=>{ ok[i]=1; q2.push(i); });
  for(let h=0;h<q2.length;h++) for(const j of rev[q2[h]]) if(!ok[j]){ ok[j]=1; q2.push(j); }
  const trap=[]; for(let i=0;i<st.length;i++) if(seen[i]&&!ok[i]) trap.push(i);
  // regroupe les pièges voisins
  const tc=new Map(); trap.forEach(i=>{ const c=st[i][0]; if(!tc.has(c)) tc.set(c,[]); tc.get(c).push(st[i][1]); });
  const groups=[]; const done=new Set();
  for(const c of tc.keys()){ if(done.has(c)) continue; const g=[]; const qq=[c]; done.add(c); while(qq.length){ const a=qq.pop(); g.push(a); for(const c2 of nb(a)) if(tc.has(c2)&&!done.has(c2)){ done.add(c2); qq.push(c2); } } groups.push(g); }
  console.log('niveau',L,': états atteignables',q.length,'(zone normale',arena.length,') | cases piège',tc.size,'en',groups.length,'endroits');
  groups.sort((a,b)=>b.length-a.length).slice(0,40).forEach(g=>{ let x=0,y=0,z0=9,z1=-9; g.forEach(c=>{ const p=W.xy(c); x+=p[0]; y+=p[1]; tc.get(c).forEach(f=>{ z0=Math.min(z0,f); z1=Math.max(z1,f); }); }); console.log('   ',g.length,'cases vers x',(x/g.length).toFixed(1),'y',(y/g.length).toFixed(1),'hauteur',(z0-Z).toFixed(2),'à',(z1-Z).toFixed(2)); });
  out[L]={cells:[...tc.keys()], groups:groups.map(g=>g.length)};
}

