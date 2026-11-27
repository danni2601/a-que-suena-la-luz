import * as T from 'three';

export function random(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const vec = (x,y,z) => new T.Vector3(x,y,z);
export const anchors = [
  [-2.56,1.88,1.05],[-2.02,.55,-2.30],[-1.29,3.48,1.62],
  [1.63,3.55,-1.30],[3.02,2.08,.74],[1.74,.03,-1.87]
].map(p=>vec(...p));

export function makeTree() {
  const rng = random(2034), tau = Math.PI*2;
  const group = new T.Group();
  const positions = [], colors = [], linePos = [], lineColors = [], rootPoints = [], rootLines = [];
  const palette = ['#441e19','#96371e','#d95b30','#ed8a49','#438f40','#285c3a','#77af46','#3d7c43'].map(x=>new T.Color(x));
  const add = (p,c,k=1,lines=false,isRoot=false) => {
    (lines?linePos:positions).push(p.x,p.y,p.z);
    (lines?lineColors:colors).push(c.r*k,c.g*k,c.b*k);
    (lines?rootLines:rootPoints).push(Number(isRoot));
  };
  function branch(points, radius, density, fibers, isRoot=false) {
    const curve = new T.CatmullRomCurve3(points);
    const steps = Math.max(12, Math.round(curve.getLength()*12));
    const frame = curve.computeFrenetFrames(steps,false);
    const centers = Array.from({length:steps+1},(_,i)=>curve.getPointAt(i/steps));
    const sample = (j, angle, thickness, phase=0) => {
      const t=j/steps, taper=Math.pow(Math.max(.025,1-t),radius>.45?.55:.84);
      const flare=radius>.45?1+.72*Math.exp(-t*18):1;
      const r=radius*flare*taper*thickness*(1+.24*Math.sin(t*17+phase)+.14*Math.sin(t*41+phase));
      return centers[j].clone().addScaledVector(frame.normals[j],r*Math.cos(angle)).addScaledVector(frame.binormals[j],r*Math.sin(angle));
    };
    for(let i=0;i<density;i++){
      const j=Math.floor(Math.pow(rng(),1.32)*steps), a=rng()*tau;
      const p=sample(j,a,.46+rng()*.78,a);
      p.addScaledVector(frame.tangents[j],(rng()-.5)*.09);
      add(p,palette[Math.floor(rng()*4)],.28+rng()*.9,false,isRoot);
    }
    for(let i=0;i<fibers;i++){
      const a=rng()*tau, thickness=.55+rng()*.6, c=palette[Math.floor(rng()*4)], k=.09+rng()*.32;
      const p = j=>sample(j,a+.24*Math.sin(j*.24+i)+.08*Math.cos(j*.84+i),thickness,a);
      for(let j=1;j<=steps;j++) if(rng()>(radius>.15?.34:.55)) {
        const fade=Math.pow(1-j/(steps+1),.36);
        add(p(j-1),c,k*fade,true,isRoot); add(p(j),c,k*.77*fade,true,isRoot);
      }
    }
    return curve;
  }
  const trunk=branch([vec(.02,-3.14,0),vec(-.14,-2.28,.06),vec(.02,-1.22,-.10),vec(-.16,-.13,-.05),vec(-.22,1.12,.06),vec(.10,2.43,-.25),vec(.34,3.18,-.32)],.49,15000,170);
  function cloud(origin, size, count) {
    const tint=4+Math.floor(rng()*4);
    const lobes=Array.from({length:5},()=>vec((rng()-.5)*size,(rng()-.5)*size*.65,(rng()-.5)*size));
    for(let i=0;i<count;i++){
      const a=rng()*tau, v=rng()*2-1, r=Math.pow(rng(),.68)*size, h=Math.sqrt(1-v*v);
      const p=origin.clone().add(lobes[i%lobes.length]).add(vec(Math.cos(a)*h*r,v*r*.57,Math.sin(a)*h*r*.73));
      const grain=Math.sin(p.x*9.4+p.z*5.7)*Math.cos(p.y*12.7-p.z*4.3);
      if(rng()>.31-grain*.30) add(p,palette[rng()<.44?6:tint],(.31+rng()*.80)*(1-.49*r/size));
    }
  }
  for(let i=0;i<anchors.length;i++){
    const tip=anchors[i], base=trunk.getPoint([.64,.48,.79,.80,.62,.43][i]);
    const mid=base.clone().lerp(tip,.56).add(vec(i%2===0?-.28:.18,-.31,.27));
    const main=branch([base,mid,mid.clone().lerp(tip,.64).add(vec(.22,.19,-.15)),tip],.21-i%3*.021,2900,30);
    for(let j=0;j<8;j++){
      const start=main.getPoint(.32+j*.084), ang=(i*.98+j*.84)+rng()*.55;
      const end=start.clone().add(vec(Math.cos(ang)*(.61+rng()*.59), (j%3===0?-.56:.36)+rng()*.78,Math.sin(ang)*(.64+rng()*.93)));
      const stem=branch([start,start.clone().lerp(end,.5).add(vec(.03,-.15,-.24)),end],.046+rng()*.048,215,11);
      for(let k=0;k<4;k++){
        const s=stem.getPoint(.45+k*.17), angle=ang+k*1.62;
        const e=s.clone().add(vec(Math.cos(angle)*(.29+rng()*.55),-.2+rng()*.70,Math.sin(angle)*(.33+rng()*.50)));
        branch([s,s.clone().lerp(e,.55).add(vec(.05,-.13,0)),e],.021,73,2);
        cloud(e,.30+rng()*.65,430+Math.floor(rng()*585));
      }
    }
  }
  for(let i=0;i<12;i++){
    const a=i/12*tau+rng()*.32, l=1.5+rng()*2.8;
    const radial = (m,y,da=0)=>vec(Math.cos(a+da)*l*m,y,Math.sin(a+da)*l*m);
    const root=branch([radial(.03,-2.77),radial(.18,-3.13,-.12),radial(.41,-3.25,.12),radial(.66,-3.40,.19),radial(1,-3.56,-.13)],.13+rng()*.15,1100,31,true);
    for(let j=0;j<3;j++){
      const start=root.getPoint(.28+j*.19);
      branch([start,radial(.57+j*.1,-3.39,.26+j*.12),radial(.86+j*.09,-3.64,.35+j*.14)],.045,250,8,true);
    }
  }
  for(let i=0;i<7700;i++){
    const a=rng()*tau,r=Math.pow(rng(),.53)*5.5;
    const x=Math.cos(a)*r,z=Math.sin(a)*r*.72;
    add(vec(x,-3.53+Math.sin(x*1.2+z*.8)*.11+rng()*.086,z),palette[rng()<.12?2:5],(.30+.34*rng())*(1-r/6));
  }
  for(let i=0;i<2200;i++) add(vec((rng()-.5)*16,(rng()-.53)*11,(rng()-.5)*13),palette[rng()>.86?2:7],.1+rng()*.32);
  const buffer=(p,c,roots)=>{
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(p,3));
    g.setAttribute('color',new T.Float32BufferAttribute(c,3));
    g.setAttribute('rootWeight',new T.Float32BufferAttribute(roots,1));
    return g;
  };
  const uniforms={time:{value:0},pixel:{value:1},pulse:{value:0}};
  const waveShader=`
    uniform float time, pixel, pulse;
    attribute float rootWeight;
    vec3 undulate(vec3 p){
      float distanceFromTrunk=length(p.xz);
      float envelope=rootWeight*smoothstep(.4,2.9,distanceFromTrunk);
      float energy=pulse*.12*envelope;
      float wave=sin(distanceFromTrunk*3.6-time*4.4+p.z*.42);
      p.x+=energy*wave*.45;
      p.y+=energy*wave;
      p.z+=energy*cos(distanceFromTrunk*2.9-time*3.7)*.37;
      return p;
    }`;
  const dots=new T.Points(buffer(positions,colors,rootPoints),new T.ShaderMaterial({
    uniforms,
    vertexShader:`
      ${waveShader}
      varying vec3 tint;
      void main(){
        vec3 p=undulate(position);
        vec4 v=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*v;
        gl_PointSize=clamp((17.5+6.*fract(sin(dot(position.xy,vec2(13.3,29.7)))*43758.5))*pixel/-v.z,1.,4.2);
        tint=color*.92;
        tint*=1.+rootWeight*pulse*.11;
      }`,
    fragmentShader:`
      varying vec3 tint;
      void main(){
        float r=length(gl_PointCoord-.5)*2.;
        if(r>1.) discard;
        gl_FragColor=vec4(tint, (1.-smoothstep(.22,1.,r))*.85);
        #include <colorspace_fragment>
      }`,
    vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending
  }));
  const strands=new T.ShaderMaterial({
    uniforms,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`
      ${waveShader}
      varying vec3 tint;
      void main(){
        vec3 p=undulate(position);
        tint=color*(.80+rootWeight*pulse*.14);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader:`
      varying vec3 tint;
      void main(){
        gl_FragColor=vec4(tint,.45);
        #include <colorspace_fragment>
      }`
  });
  group.add(new T.LineSegments(buffer(linePos,lineColors,rootLines),strands),dots);
  return {group,dots};
}
