const root=import.meta.env.BASE_URL+'assets/hand/';

const digits=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[17,0]];

const fingerBases=[5,9,13,17];

export function handPose(hand){
  const wrist=hand[0];
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z-b.z)*.75);
  const palmLength=distance(wrist,hand[9]);
  if(palmLength<.025)return null;
  let extended=0,curled=0;
  for(const base of fingerBases){
    const knuckle=hand[base], joint=hand[base+1], tip=hand[base+3];
    const reach=distance(knuckle,tip)/Math.max(.001,distance(knuckle,joint));
    const outward=distance(wrist,tip)-distance(wrist,joint);
    if(reach>1.88&&outward>palmLength*.14)extended++;
    if(reach<1.62||outward<palmLength*.035)curled++;
  }
  if(extended>=3)return 'palm';
  if(extended<=1&&curled>=3)return 'fist';
  return null;
}

function showHand(canvas,video,hand,pose){
  if(canvas.width!==video.videoWidth)canvas.width=video.videoWidth;
  if(canvas.height!==video.videoHeight)canvas.height=video.videoHeight;
  const ctx=canvas.getContext('2d'), {width,height}=canvas;
  ctx.clearRect(0,0,width,height);
  if(!hand)return;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.lineWidth=Math.max(1.5,width*.004);
  ctx.strokeStyle=pose==='fist'?'#ffd198':'#62ffd5';
  for(const digit of digits){
    ctx.beginPath();
    digit.forEach((i,j)=>{
      const p=hand[i];
      if(j===0)ctx.moveTo(p.x*width,p.y*height);
      else ctx.lineTo(p.x*width,p.y*height);
    });
    ctx.stroke();
  }
  ctx.fillStyle='#effffb';
  for(const p of hand){
    ctx.beginPath();
    ctx.arc(p.x*width,p.y*height,Math.max(1.5,width*.005),0,2*Math.PI);
    ctx.fill();
  }
  if(!pose)return;
  const wrist=hand[0];
  const fontSize=Math.max(21,width*.073), pad=fontSize*.4;
  const label=pose==='palm'?'GIRAR':'PARAR';
  ctx.save();
  ctx.translate(width,0);
  ctx.scale(-1,1);
  ctx.font='600 '+fontSize+'px system-ui';
  const boxWidth=ctx.measureText(label).width+2*pad;
  const x=Math.min(width-boxWidth-4,Math.max(4,(1-wrist.x)*width-boxWidth/2));
  const below=wrist.y*height+fontSize*.4;
  const y=below+fontSize*1.35<=height?below:Math.max(4,wrist.y*height-fontSize*1.61);
  ctx.fillStyle='#071520e8';
  ctx.fillRect(x,y,boxWidth,fontSize*1.35);
  ctx.fillStyle=pose==='fist'?'#ffd198':'#62ffd5';
  ctx.textBaseline='middle';
  ctx.fillText(label,x+pad,y+fontSize*.69);
  ctx.restore();
}

export async function startHandTracking(video, canvas, signal, onPose, setStatus) {
  if(!navigator.mediaDevices?.getUserMedia){
    throw Error('La cámara no está disponible en esta vista. Abre el atlas en tu navegador mediante HTTPS o localhost.');
  }
  const stream=await navigator.mediaDevices.getUserMedia({
    audio:false,video:{facingMode:'user',width:{ideal:480},height:{ideal:360}}
  });
  let detector, frame=0;
  function stop(){
    cancelAnimationFrame(frame);
    stream.getTracks().forEach(track=>track.stop());
    if(video.srcObject===stream)video.srcObject=null;
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    detector?.close();
    detector=null;
  }
  signal.addEventListener('abort',stop,{once:true});
  try{
    if(signal.aborted){stop();return;}
    video.srcObject=stream;
    await video.play();
    setStatus('Cámara encendida. Cargando el detector…');
    const bundle=new URL(root+'vision_bundle.mjs',window.location.href).href;
    const {FilesetResolver,HandLandmarker}=await import(/* @vite-ignore */ bundle);
    const files=await FilesetResolver.forVisionTasks(root+'wasm');
    files.wasmLoaderPath=files.wasmLoaderPath.replace(/\.js$/,'.mjs');
    if(signal.aborted)return;
    detector=await HandLandmarker.createFromOptions(files,{
      baseOptions:{modelAssetPath:root+'hand_landmarker.task'},runningMode:'VIDEO',numHands:1,
      minHandDetectionConfidence:.40,minHandPresenceConfidence:.40,minTrackingConfidence:.43
    });
    if(signal.aborted){stop();return;}
    let applied=null,candidate=null,candidateSince=0,lastSeen=0,lastTime=-1,lastSample=0,status='';
    function report(message,detected=false){
      if(message===status)return;
      status=message;
      setStatus(message,false,detected);
    }
    function tick(now){
      try{
        if(video.readyState>=2&&now-lastSample>=32&&video.currentTime!==lastTime){
          lastTime=video.currentTime;
          lastSample=now;
          const hand=detector.detectForVideo(video,now).landmarks[0];
          const pose=hand?handPose(hand):null;
          showHand(canvas,video,hand,pose);
          if(!hand){
            if(now-lastSeen>480){applied=null;candidate=null;}
            report('Muestra la mano entera.');
          }else{
            lastSeen=now;
            if(pose!==candidate){candidate=pose;candidateSince=now;}
            if(pose&&pose!==applied&&now-candidateSince>=90){
              applied=pose;
              onPose(pose);
            }
            report(pose==='palm'?'Palma detectada · giro lateral':pose==='fist'?'Puño detectado · giro detenido':'Mano detectada',true);
          }
        }
        frame=requestAnimationFrame(tick);
      }catch{
        stop();
        if(!signal.aborted)setStatus('Se interrumpió el seguimiento. Vuelve a activar la cámara.',true);
      }
    }
    report('Muestra la mano entera.');
    frame=requestAnimationFrame(tick);
  }catch(error){
    stop();
    if(!signal.aborted)throw error;
  }
}
