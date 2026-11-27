import * as T from 'three';
const color = hex => new T.MeshBasicMaterial({color:hex});
const blue=color('#227594'), cyan=color('#59bed5'), orange=color('#e66b35'), dark=color('#0a283c');
const sphere=new T.SphereGeometry(1,12,8);
function part(group,material,x,y,z,sx,sy,sz,tilt=0){
  const p=new T.Mesh(sphere,material);
  p.position.set(x,y,z); p.scale.set(sx,sy,sz); p.rotation.x=tilt; group.add(p);
  return p;
}
function threads(group, curves, hue) {
  const coords=[];
  for(const points of curves) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const samples=curve.getPoints(9);
    for(let j=1;j<samples.length;j++) coords.push(...samples[j-1],...samples[j]);
  }
  const geom=new T.BufferGeometry();
  geom.setAttribute('position',new T.Float32BufferAttribute(coords,3));
  group.add(new T.LineSegments(geom,new T.LineBasicMaterial({color:hue,transparent:true,opacity:.76})));
}
export function makeBird(){
  const bird=new T.Group(), wings=[];
  part(bird,blue,0,0,0,.24,.28,.51,-.16);
  part(bird,orange,0,-.11,.19,.217,.217,.39,.17);
  part(bird,blue,0,.18,.38,.22,.22,.24);
  for(const side of [-1,1]){
    part(bird,cyan,side*.145,.15,.46,.076,.072,.12);
    part(bird,dark,side*.172,.212,.511,.047,.043,.047);
    part(bird,cyan,side*.201,.227,.532,.015,.015,.015);
  }
  const beak=new T.Mesh(new T.ConeGeometry(.065,.24,8),dark);
  beak.position.set(0,.14,.66); beak.rotation.x=Math.PI/2; bird.add(beak);
  for(let f=-2;f<=2;f++){
    const feather=part(bird,blue,f*.064,-.007,-.56-Math.abs(f)*.024,.043,.036,.38);
    feather.rotation.y=-f*.11;
  }
  const coat=[];
  for(let i=0;i<22;i++){
    const x=(i%11-5)*.038, side=i<11?1:-1;
    coat.push([[x,.16*side,.44],[x*1.19,.259*side,.03],[x*.58,.12*side,-.44]]);
  }
  threads(bird,coat,'#56b8d6');
  threads(bird,[-1,1].flatMap(s=>[[[s*.10,-.19,-.08],[s*.13,-.37,-.18],[s*.13,-.41,-.06]],[[s*.13,-.39,-.16],[s*.18,-.42,-.04],[s*.17,-.44,.015]]]),'#bc7855');
  for(const sign of [-1,1]){
    const wing=new T.Group(), lines=[], accents=[];
    wing.position.set(sign*.15,.07,.04);
    const edge=new T.Shape();
    edge.moveTo(0,.24); edge.quadraticCurveTo(sign*.47,.38,sign*1.25,.12);
    edge.quadraticCurveTo(sign*1.12,-.29,sign*.42,-.46); edge.quadraticCurveTo(sign*.10,-.40,0,-.23);
    const mesh=new T.Mesh(new T.ShapeGeometry(edge),new T.MeshBasicMaterial({color:'#1b5e78',side:T.DoubleSide}));
    mesh.rotation.x=Math.PI/2; wing.add(mesh);
    for(let i=0;i<15;i++){
      const k=i/14, x=sign*(.44+.82*k), z=-.45+.57*k*k;
      const points=[[sign*(.11+.52*k),.012,.17-.08*k],[x*.77,.07,z+.09],[x,.006,z],[x*.82,-.04,z-.04]];
      lines.push(points);
      if(i%2===0) accents.push([points[0],[x*.78,.03,z+.045],points[2]]);
    }
    threads(wing,lines,'#79d0e6'); threads(wing,accents,'#e18a54'); bird.add(wing); wings.push(wing);
  }
  bird.wings=wings;
  return bird;
}
