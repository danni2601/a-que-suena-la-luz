export function createAudio(getScene,getData){
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)throw Error('Este navegador no ofrece audio espacial.');
  const ctx=new Context(), volume=ctx.createGain(), compressor=ctx.createDynamicsCompressor();
  volume.gain.value=.36; volume.connect(compressor).connect(ctx.destination);
  let active=false,timer;
  function chirp(){
    const scene=getScene(), {stage,soundLoad:level}=getData();
    const birds=scene?.birds.filter(b=>b.model.visible&&b.weight>.25)||[];
    if(stage!==0&&!birds.length){
      timer=setTimeout(chirp,550);
      return;
    }
    if(scene){
      const {position,quaternion}=scene.camera;
      const listener=ctx.listener, direction=scene.camera.getWorldDirection(position.clone());
      const up=scene.camera.up.clone().applyQuaternion(quaternion);
      if(listener.positionX){
        for(const [prefix,p] of [['position',position],['forward',direction],['up',up]])
          for(const axis of ['X','Y','Z'])listener[prefix+axis].value=p[axis.toLowerCase()];
      }else{
        listener.setPosition(...position);
        listener.setOrientation(...direction,...up);
      }
    }
    const now=ctx.currentTime+.018,n=1+Math.floor(level*5);
    scene?.sing(.27+level*.61);
    for(let k=0;k<n;k++){
      const p=birds[Math.floor(Math.random()*birds.length)]?.model.position;
      const pan=ctx.createPanner();
      pan.panningModel='HRTF';
      pan.refDistance=6;pan.rolloffFactor=.52;
      if(p)pan.setPosition(...p);
      pan.connect(volume);
      const length=2+Math.floor(Math.random()*3);
      for(let i=0;i<length;i++){
        const start=now+i*.086+k*.14*Math.random(), end=start+.075;
        const osc=ctx.createOscillator(), gain=ctx.createGain(), f=1420+Math.random()*1600;
        osc.frequency.setValueAtTime(f,start);
        osc.frequency.exponentialRampToValueAtTime(f*1.32,start+.025);
        osc.frequency.exponentialRampToValueAtTime(f*.84,end);
        gain.gain.setValueAtTime(.0001,start);
        gain.gain.exponentialRampToValueAtTime(.043+level*.027,start+.013);
        gain.gain.exponentialRampToValueAtTime(.0001,end);
        osc.connect(gain).connect(pan); osc.start(start);osc.stop(end+.008);
        if(i===length-1)osc.onended=()=>pan.disconnect();
      }
    }
    timer=setTimeout(()=>{if(active)chirp();},(3100-2670*level)*(1+Math.random()*.48));
  }
  return {
    async play(){await ctx.resume();if(!active){active=true;chirp();}},
    pause(){active=false;clearTimeout(timer);return ctx.suspend();},
    mix(v,level){volume.gain.setTargetAtTime(v*(.25+.65*level),ctx.currentTime,.16);},
    close(){active=false;clearTimeout(timer);return ctx.close();}
  };
}
