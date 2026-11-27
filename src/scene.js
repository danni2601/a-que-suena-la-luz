import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {anchors,makeTree,random} from './tree.js';
import {makeBird} from './birds.js';

export function createScene(host, state, markers, onTurn) {
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  renderer.setClearColor(0,0);
  host.append(renderer.domElement);
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(39,1,.08,80);
  const controls=new OrbitControls(camera,renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Árbol interactivo 3D. Flechas para girar y signos más y menos para acercar o alejar.');
  renderer.domElement.tabIndex=0;
  controls.enableDamping=true;
  controls.rotateSpeed=.84;
  controls.minDistance=.8; controls.maxDistance=28;
  controls.autoRotateSpeed=.29;
  const tree=makeTree();
  scene.add(tree.group);
  tree.dots.material.uniforms.pixel.value=renderer.getPixelRatio();
  const prototype=makeBird(), rng=random(63), birds=[];
  const homes=anchors.map(p=>p.clone());
  const front=new T.Vector3(0,0,1), goal=new T.Vector3(), offset=new T.Vector3(), point=new T.Vector3();
  const small=()=>host.clientWidth<730;
  const homeTarget=()=>new T.Vector3(0,.48,0);
  const homeCamera=()=>new T.Vector3(small()?.9:1.8,1.45,small()?23.5:host.clientWidth/host.clientHeight<1.25?18.3:17.7);
  camera.position.copy(homeCamera()); controls.target.copy(homeTarget()); controls.update();
  let flight=null, idleUntil=0, manualUntil=0, dragging=false, gesture=null;
  let rotation=0, lastTheta=controls.getAzimuthalAngle(), displayedProgress=0, pulse=0;
  const fullTurn=2*Math.PI;
  function clearTurn(){
    rotation=0;
    displayedProgress=0;
    onTurn(0,false);
  }
  function nudgeOrbit(horizontal,vertical){
    if(Math.hypot(horizontal,vertical)<.003)return;
    flight=null;
    stopGesture();
    const now=performance.now();
    manualUntil=now+640;
    idleUntil=now+4100;
    controls.autoRotate=false;
    controls.rotateLeft(horizontal);
    controls.rotateUp(vertical);
  }
  const gestureSpherical=new T.Spherical();
  function stopGesture(){
    if(!gesture)return;
    gesture=null;
    clearTurn();
    idleUntil=performance.now()+10000;
  }
  function holdOrbit(){
    stopGesture();
    idleUntil=Infinity;
  }
  function startGesture(){
    if(gesture)return false;
    holdOrbit();
    flight=null;
    manualUntil=0;
    clearTurn();
    gestureSpherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
    gesture={initial:gestureSpherical.theta,progress:0};
    return true;
  }
  function move(position,target) {
    stopGesture();
    flight={from:camera.position.clone(),targetFrom:controls.target.clone(),position,target,start:performance.now()};
    idleUntil=performance.now()+4800;
  }
  function reset(){ move(homeCamera(),homeTarget()); }
  function focus(branch,country){
    if(branch<0){
      move(homeCamera(),homeTarget());
      return;
    }
    const spot=homes[branch].clone();
    if(country>=0) spot.add(new T.Vector3(country===0?-.43:.32,.38,country===0?.27:-.34));
    const side=spot.clone().setY(0).normalize();
    const target=spot.clone().multiplyScalar(.40); target.y+=.23;
    move(target.clone().addScaledVector(side,country<0?14:12.5).add(new T.Vector3(.55,1.0,.45)),target);
  }
  function cameraCommand(key){
    if(key==='0'){reset();return true;}
    const delta=camera.position.clone().sub(controls.target);
    const s=new T.Spherical().setFromVector3(delta);
    const operation={
      ArrowLeft:()=>s.theta-=.18,ArrowRight:()=>s.theta+=.18,
      ArrowUp:()=>s.phi-=.14,ArrowDown:()=>s.phi+=.14,
      '+':()=>s.radius*=.83,'=':()=>s.radius*=.83,'-':()=>s.radius*=1.2,
      '1':()=>{s.theta=0;s.phi=Math.PI/2;},'2':()=>{s.theta=Math.PI;s.phi=Math.PI/2;},
      '3':()=>{s.theta=-Math.PI/2;s.phi=Math.PI/2;},'4':()=>{s.theta=Math.PI/2;s.phi=Math.PI/2;},
      '5':()=>s.phi=.012,'6':()=>s.phi=Math.PI-.012
    }[key];
    if(!operation)return false;
    operation();
    s.radius=T.MathUtils.clamp(s.radius,controls.minDistance,controls.maxDistance);s.makeSafe();
    if(key==='ArrowLeft'||key==='ArrowRight'){
      nudgeOrbit(key==='ArrowLeft'?.18:-.18,0);
    }else move(offset.setFromSpherical(s).clone().add(controls.target),controls.target.clone());
    return true;
  }
  const onKeys=e=>{if(cameraCommand(e.key))e.preventDefault();};
  renderer.domElement.addEventListener('keydown',onKeys);
  controls.addEventListener('start',()=>{stopGesture();flight=null;dragging=true;idleUntil=Infinity;});
  controls.addEventListener('end',()=>{dragging=false;manualUntil=performance.now()+520;idleUntil=performance.now()+5500;});
  const resize=new ResizeObserver(()=>{
    const width=host.clientWidth, height=host.clientHeight;
    camera.fov=small()?48:39;
    camera.setViewOffset(width,height,small()?0:-width*.147,small()?height*.16:0,width,height);
    renderer.setSize(width,height);
  });
  resize.observe(host);
  for(let i=0;i<120;i++){
    const model=prototype.clone(true);
    const wings=prototype.wings.map(wing=>model.children[prototype.children.indexOf(wing)]);
    const center=homes[i%6];
    model.visible=false;
    scene.add(model);
    const phase=rng()*7;
    birds.push({model,wings,center,index:i%6,rank:Math.floor(i/6),phase,pace:.36+rng()*.33,size:.21+rng()*.12,weight:0,
      velocity:new T.Vector3(Math.sin(phase),0,Math.cos(phase)).multiplyScalar(.4)});
    model.position.copy(center).add(new T.Vector3(Math.sin(phase),rng(),Math.cos(phase)));
  }
  let raf,elapsed=0,previous=performance.now(),sampleTime=0,sampleFrames=0;
  const transitionParticles=new Float32Array(birds.length*9*3);
  const transitionGeometry=new T.BufferGeometry();
  const transitionAttribute=new T.BufferAttribute(transitionParticles,3).setUsage(T.DynamicDrawUsage);
  transitionGeometry.setAttribute('position',transitionAttribute);
  const glints=new T.Points(transitionGeometry,new T.PointsMaterial({color:'#70b2cc',size:.025,transparent:true,opacity:.67,depthWrite:false,blending:T.AdditiveBlending}));
  glints.frustumCulled=false;
  scene.add(glints);
  const arrow=new T.Vector3(), separation=new T.Vector3(), alignment=new T.Vector3(), cohesion=new T.Vector3();
  function frame(now){
    const dt=Math.min(.05,(now-previous)/1000); previous=now;
    sampleTime+=dt; sampleFrames++;
    if(sampleTime>2.5){
      const dpr=renderer.getPixelRatio();
      if(sampleFrames/sampleTime<38&&dpr>1){
        const next=Math.max(1,dpr-.2);
        renderer.setPixelRatio(next);
        tree.dots.material.uniforms.pixel.value=next;
      }
      sampleTime=0;sampleFrames=0;
    }
    const {stage,levels,motion,branch,missing,journey,elapsedYears,simulated}=state.current;
    if(motion)elapsed+=dt;
    if(flight){
      const mix=motion?Math.min(1,(now-flight.start)/950):1, ease=mix*mix*(3-2*mix);
      camera.position.lerpVectors(flight.from,flight.position,ease);
      controls.target.lerpVectors(flight.targetFrom,flight.target,ease);
      if(mix===1)flight=null;
    }
    const gesturing=Boolean(gesture);
    if(gesture){
      const {initial}=gesture;
      gesture.progress=Math.min(1,gesture.progress+dt*(state.current.speed??1)/26);
      const progress=gesture.progress;
      const eased=progress-.075*Math.sin(2*Math.PI*progress);
      gestureSpherical.setFromVector3(offset.copy(camera.position).sub(controls.target));
      gestureSpherical.theta=initial+fullTurn*eased;
      camera.position.copy(offset.setFromSpherical(gestureSpherical).add(controls.target));
      if(progress===1){
        holdOrbit();
        if(stage!==2)onTurn(0,true);
      }else{
        const percent=Math.floor(progress*100);
        if(percent!==displayedProgress){displayedProgress=percent;onTurn(percent,false);}
      }
    }
    controls.autoRotate=motion&&!flight&&!gesturing&&now>idleUntil;
    controls.update(dt);
    const angle=controls.getAzimuthalAngle();
    const delta=Math.atan2(Math.sin(angle-lastTheta),Math.cos(angle-lastTheta));
    lastTheta=angle;
    if(stage!==2&&!flight&&!gesturing&&(dragging||now<manualUntil)){
      rotation+=delta;
      const turn=Math.abs(rotation)>=fullTurn-.015;
      if(turn)rotation=0;
      const progress=Math.min(99,Math.floor(Math.abs(rotation)*100/fullTurn));
      if(turn||progress!==displayedProgress){displayedProgress=progress;onTurn(progress,turn);}
    }
    tree.dots.material.uniforms.time.value=elapsed;
    pulse=Math.max(0,pulse-dt*1.38);
    tree.dots.material.uniforms.pulse.value=motion?pulse:0;
    let glintCount=0;
    for(const b of birds){
      const territorial=levels[b.index];
      const level=stage===0?journey:simulated&&branch<0?.54*territorial+.46*journey:territorial;
      const birdsInYear=15+8*elapsedYears;
      const on=stage===0||simulated?b.rank*6+b.index<birdsInYear:!missing[b.index]&&b.rank<Math.round(level*20);
      b.weight=motion?T.MathUtils.lerp(b.weight,on?1:0,Math.min(dt*(on?2:1.2),1)):Number(on);
      b.model.visible=b.weight>.025;
      if(!b.model.visible)continue;
      const a=elapsed*b.pace+b.phase, loop=(elapsed+b.phase*2)%27;
      const resting=b.rank===0&&b.index%2===0&&loop<6;
      const radius=resting?.035:(.90+(b.rank%7)*.24)*(1.18-level*.25);
      goal.copy(b.center).add(new T.Vector3(Math.cos(a)*radius,resting?.08:.40+Math.sin(a*1.56)*.71,Math.sin(a)*radius));
      if(!on)goal.addScaledVector(b.center.clone().normalize(),2.6);
      const position=b.model.position;
      if(!motion){position.copy(goal);}
      else {
        separation.set(0,0,0); alignment.set(0,0,0); cohesion.set(0,0,0);
        let count=0;
        for(const other of birds){
          if(other===b||other.index!==b.index||!other.model.visible)continue;
          const d=position.distanceToSquared(other.model.position);
          if(d<.13)separation.addScaledVector(arrow.subVectors(position,other.model.position),.12/Math.max(d,.012));
          if(d<1.2){alignment.add(other.velocity);cohesion.add(other.model.position);count++;}
        }
        arrow.subVectors(goal,position).multiplyScalar(resting?4:2.7).add(separation);
        if(count&&!resting){
          arrow.addScaledVector(alignment.multiplyScalar(1/count).sub(b.velocity),.22);
          arrow.addScaledVector(cohesion.multiplyScalar(1/count).sub(position),.16);
        }
        b.velocity.addScaledVector(arrow,dt).multiplyScalar(Math.exp(-dt*(resting?3.5:1.6))).clampLength(0,2.15);
        position.addScaledVector(b.velocity,dt);
      }
      arrow.copy(b.velocity);
      if(arrow.lengthSq()>.007)b.model.quaternion.setFromUnitVectors(front,arrow.normalize());
      const flap=resting?1.1:(Math.sin(a*24)*.81+.17)*(loop>21?.16:1);
      b.wings[0].rotation.z=-flap; b.wings[1].rotation.z=flap;
      b.model.scale.setScalar(b.size*b.weight);
      if(b.weight<.94){
        const spread=.32*(1-b.weight);
        for(let j=0;j<9;j++){
          const wave=b.phase+j*2.41+elapsed;
          transitionParticles[glintCount++]=position.x+Math.sin(wave)*spread;
          transitionParticles[glintCount++]=position.y+Math.cos(wave*1.4)*spread*.7;
          transitionParticles[glintCount++]=position.z+Math.cos(wave)*spread;
        }
      }
    }
    transitionGeometry.setDrawRange(0,glintCount/3);
    transitionAttribute.needsUpdate=true;
    camera.updateMatrixWorld();
    for(let i=0;i<markers.length;i++){
      const marker=markers[i];
      if(!marker)continue;
      point.copy(anchors[i]).project(camera);
      marker.style.transform='translate('+((.5+point.x/2)*host.clientWidth-16)+'px,'+((.5-point.y/2)*host.clientHeight-16)+'px)';
      marker.style.visibility=point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1?'hidden':'visible';
    }
    renderer.render(scene,camera);
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  return {reset,focus,cameraCommand,startGesture,stopGesture,holdOrbit,clearTurn,sing(strength){pulse=Math.min(1,pulse*.68+strength);},camera,birds,dispose(){
    cancelAnimationFrame(raf);resize.disconnect();controls.dispose();
    const resources=new Set();
    scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});
    resources.forEach(x=>x.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  }};
}
