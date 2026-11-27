import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import {createScene} from './scene.js';
import {loadData,groupNames,groupCodes,format,unit} from './data.js';
import {createAudio} from './audio.js';
import {startHandTracking} from './hand.js';
import './style.css';

const stages=['Percibir','Experimentar','Comprender'];
const nasa='https://doi.org/10.5067/VIIRS/VNP46A4.002';
const viewKeys=['1','2','3','4','5','6'];
const views=['Frente','Detrás','Izquierda','Derecha','Arriba','Abajo'];
const short=['N. América','S. América','Europa','Asia','África','Oceanía'];
const paths={
  brand:<><path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/><circle cx="12" cy="12" r="7"/></>,
  sound:<><path d="M3 10v4m4-8v12m5-15v18m5-14v10m4-7v4"/></>,
  orbit:<><circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="11" ry="4.5" transform="rotate(-30 12 12)"/></>,
  reset:<><path d="M4 11a8 8 0 1 1 2 7M4 5v6h6"/></>,
  motion:<><path d="M3 14c4 0 4-5 8-5s4 5 10 5M3 18c4 0 4-5 8-5s4 5 10 5"/></>,
  plus:<path d="M12 5v14M5 12h14"/>,minus:<path d="M5 12h14"/>,
  hand:<path d="M8 13V6a1.4 1.4 0 0 1 2.8 0v5-7a1.4 1.4 0 0 1 2.8 0v7-5a1.4 1.4 0 0 1 2.8 0v6-3a1.4 1.4 0 0 1 2.8 0v6a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2L4 14a1.4 1.4 0 0 1 2-2z"/>,
  globe:<><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  play:<path d="m9 5 11 7-11 7z"/>,pause:<path d="M9 5v14m6-14v14"/>
};
function Icon({name,size=18}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function IconButton({name,label,onClick,pressed}){
  return <button className="icon-button" onClick={onClick} title={label} aria-label={label} aria-pressed={pressed}><Icon name={name}/></button>;
}
function Charts({data,year,branch,iso,other,base,setYear}){
  const years=data.years, width=420,height=112;
  const series=[years.map(y=>data.value(y,branch,iso)),...(other?[years.map(y=>data.value(y,-1,other))]:[])];
  const max=Math.max(data.scaleMax,...series.flat().filter(Number.isFinite));
  const x=i=>12+i*(width-24)/Math.max(1,years.length-1), y=v=>height-13-v/max*(height-23);
  const valid=series[0].filter(Number.isFinite), selected=years.indexOf(year);
  const values=other?[data.value(year,branch,iso),data.value(year,-1,other)]:[data.value(base,branch,iso),data.value(year,branch,iso)];
  const country=data.countries.find(r=>r.iso===iso)?.name|| (branch<0?'Vista global':groupNames[branch]);
  const labels=other?[country,data.countries.find(r=>r.iso===other)?.name]:[String(base),String(year)];
  return <section className="charts">
    <h3>Evolución anual <small>{unit}</small></h3>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución de la radiancia en la serie activa">
      {[0,.25,.5,.75,1].map(v=><line key={v} x1="12" x2={width-12} y1={y(max*v)} y2={y(max*v)} stroke="#29434d"/>)}
      <line x1={x(selected)} x2={x(selected)} y1="5" y2={height-8} stroke="#8e705e" strokeDasharray="3 4"/>
      {series.map((s,k)=><g key={k} fill={k?'#e99063':'#75c5d5'} stroke={k?'#e99063':'#75c5d5'}>
        {s.map((v,i)=>v===null?null:<g key={years[i]}>{i>0&&s[i-1]!==null&&<line x1={x(i-1)} y1={y(s[i-1])} x2={x(i)} y2={y(v)} strokeWidth="1.5"/>}
          <circle cx={x(i)} cy={y(v)} r={year===years[i]?4:2} onClick={()=>setYear(years[i])}><title>{years[i]} · {format(v)}</title></circle></g>)}
      </g>)}
    </svg>
    <div className="chart-years"><span>{years[0]}</span><span>{years.at(-1)}</span></div>
    <div className="stats"><span>Mínimo <b>{format(Math.min(...valid))}</b></span><span>Máximo <b>{format(Math.max(...valid))}</b></span></div>
    <h3>{other?'Comparación de países':'Comparación de periodos'}</h3>
    {values.map((v,i)=><div className="bar-row" key={i}><span>{labels[i]}</span><div className="bar-track"><i style={{width:v===null?'0%':100*v/max+'%',background:i?'var(--orange)':'var(--cyan)'}}/></div><b>{format(v)}</b></div>)}
  </section>;
}
function App(){
  const [data,setData]=useState(null),[dataError,setDataError]=useState(''),[stage,stageSet]=useState(()=>Number(document.body.dataset.stage)||0);
  const [year,setYear]=useState(2011),[base,setBase]=useState(2011),[branch,setBranch]=useState(-1),[iso,setIso]=useState(''),[other,setOther]=useState('');
  const [motion,setMotion]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing,play]=useState(false),[speed,setSpeed]=useState(1);
  const [sound,setSound]=useState(false),[audioMenu,setAudioMenu]=useState(false),[volume,setVolume]=useState(.5),[audioError,setAudioError]=useState('');
  const [cameraMenu,setCameraMenu]=useState(false),[compare,setCompare]=useState(false);
  const [rotation,setRotation]=useState(0),[handOpen,setHandOpen]=useState(false);
  const [handStatus,setHandStatus]=useState(''),[handActive,setHandActive]=useState(false);
  const [handDetected,setHandDetected]=useState(false);
  const video=useRef(null),handOverlay=useRef(null),handRequest=useRef(null);
  const [ready,setReady]=useState(false),[webgl,setWebgl]=useState(true);
  const host=useRef(null),scene=useRef(null),markers=useRef([]),audio=useRef(null),main=useRef(null);
  const state=useRef({});
  const branchValues=groupNames.map((_,i)=>data?.value(year,i)??null);
  const levels=branchValues.map((v,i)=>{
    const l=branch===i&&iso?data?.value(year,branch,iso):v;
    return Math.min(1,(l??0)/(data?.scaleMax??7));
  });
  const elapsedYears=data?Math.max(0,data.years.indexOf(year)):0;
  const journey=elapsedYears/Math.max(1,(data?.years.length??1)-1);
  const simulated=data?.mode==='simulation';
  state.current={stage,levels,motion,branch,journey,elapsedYears,simulated,speed,years:data?.years??[],missing:branchValues.map((v,i)=>branch===i&&iso?data?.value(year,branch,iso)===null:v===null)};
  const current=data?.value(year,branch,iso)??null;
  const delta=data?.variation(year,branch,iso);
  const rows=data?.rows(year,branch,iso)||[];
  const meta=key=>rows.map(r=>r[key]).filter(Boolean).sort().at(-1)||'—';
  const regionalLoad=levels.reduce((a,b)=>a+b,0)/6;
  const visualLoad=stage===0||simulated?journey:regionalLoad;
  state.current.soundLoad=visualLoad;
  useEffect(()=>{
    let live=true;
    loadData().then(d=>{if(live){setData(d);setYear(d.years[0]);setBase(d.years[0]);}}).catch(e=>{if(live)setDataError(e.message);});
    let built;
    const handle=requestAnimationFrame(()=>{
      try{built=createScene(host.current,state,markers.current,(progress,turn)=>{
        setRotation(progress);
        if(turn){
          play(false);
          const years=state.current.years;
          setYear(y=>years[Math.min(years.length-1,years.indexOf(y)+1)]??y);
        }
      });scene.current=built;setReady(true);}
      catch(e){console.error(e);setWebgl(false);}
    });
    return ()=>{live=false;cancelAnimationFrame(handle);built?.dispose();audio.current?.close();handRequest.current?.abort();};
  },[]);
  useEffect(()=>{
    if(!playing||!data)return;
    const timer=setTimeout(()=>{
      const index=data.years.indexOf(year);
      if(index===data.years.length-1)play(false);
      else setYear(data.years[index+1]);
    },1050/speed);
    return ()=>clearTimeout(timer);
  },[playing,year,data,speed]);
  useEffect(()=>{audio.current?.mix(volume,visualLoad);},[volume,visualLoad]);
  function select(index,country='',keepView=compare){
    setBranch(index);setIso(country);
    if(!country||country===other)setOther('');
    if(!keepView){
      const set=data?.countries.filter(r=>r.continent===groupNames[index])||[];
      scene.current?.clearTurn();
      scene.current?.focus(index,set.findIndex(r=>r.iso===country));
    }
  }
  function setStage(next){
    stageSet(next);
    setCameraMenu(false);
    if(next!==1)play(false);
    if(next===2)closeHand();
    window.scrollTo(0,0);
    if(next===0){
      setBranch(-1);setIso('');setOther('');setCompare(false);
      if(data)setYearManual(data.years[0]);
      scene.current?.reset();
    }else if(next===1)scene.current?.focus(branch,-1);
    else scene.current?.reset();
    requestAnimationFrame(()=>main.current?.focus({preventScroll:true}));
  }
  function closeHand(){
    scene.current?.holdOrbit();
    handRequest.current?.abort();
    handRequest.current=null;
    setHandOpen(false);
    setHandActive(false);
    setHandStatus('');
    setHandDetected(false);
  }
  async function enableHand(){
    if(handRequest.current)return;
    setHandOpen(true);
    const request=new AbortController();
    handRequest.current=request;
    setHandActive(true);
    setHandStatus('Preparando el seguimiento…');
    try{
      await startHandTracking(video.current,handOverlay.current,request.signal,pose=>{
        if(pose==='fist')scene.current?.holdOrbit();
        else if(scene.current?.startGesture())play(false);
      },(message,error,detected)=>{
        if(request.signal.aborted)return;
        setHandStatus(message);
        setHandDetected(Boolean(detected));
        if(error){
          scene.current?.holdOrbit();
          handRequest.current=null;
          setHandActive(false);
        }
      });
    }catch(error){
      if(request.signal.aborted)return;
      handRequest.current=null;
      setHandActive(false);
      setHandStatus(!navigator.mediaDevices?.getUserMedia?error.message:error.name==='NotAllowedError'?'Permite la cámara en tu navegador y vuelve a intentarlo.':error.name==='NotFoundError'?'No se encontró una cámara conectada.':error.name==='NotReadableError'?'La cámara está ocupada o el sistema bloqueó el acceso.':'No se pudo iniciar el detector de mano. Vuelve a intentarlo.');
    }
  }
  async function toggleSound(){
    try{
      if(sound){await audio.current?.pause();setSound(false);return;}
      if(!audio.current)audio.current=createAudio(()=>scene.current,()=>state.current);
      audio.current.mix(volume,visualLoad);
      await audio.current.play();
      setSound(true);
    }catch(e){setAudioError(e.message);setAudioMenu(true);}
  }
  function togglePlay(){
    if(!playing)scene.current?.clearTurn();
    if(!playing&&year===data?.years.at(-1))setYear(data.years[0]);
    play(!playing);
  }
  function step(direction){
    if(!data)return;
    play(false);
    const index=data.years.indexOf(year);
    setYearManual(data.years[Math.min(data.years.length-1,Math.max(0,index+direction))]);
  }
  function setYearManual(y){play(false);scene.current?.clearTurn();setYear(y);}
  const countryOptions=data?.countries.filter(r=>compare||branch<0||r.continent===groupNames[branch])||[];
  return <div className={`app stage-${stage}`}>
    <div ref={host} className="scene"/>
    <div className="veil" aria-hidden="true"/>
    <header className="header">
      <button className="brand" onClick={()=>setStage(0)} aria-label="El ruido de la luz, volver al inicio"><span className="brand-mark"><Icon name="brand" size={23}/></span><span>EL RUIDO<br/>DE LA LUZ</span></button>
      <nav className="stages" aria-label="Etapas de la experiencia">{stages.map((label,i)=><button key={label} aria-current={stage===i?'step':undefined} onClick={()=>setStage(i)}><span className="nav-indicator"/>{label}</button>)}</nav>
      <div className="audio-parent">
        <button className="sound-button" aria-label="Sonido" onClick={()=>setAudioMenu(!audioMenu)} aria-expanded={audioMenu}><Icon name="sound" size={17}/><span>Sonido</span><span className={'audio-state '+(sound?'on':'')}/></button>
        {audioMenu&&<div className="popover audio-pop">
          <button className="outline" onClick={toggleSound}>{sound?'Pausar sonido':'Activar sonido'}</button>
          <label>Volumen<input aria-label="Volumen" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>{setVolume(Number(e.target.value));}}/></label>
          <label>Densidad sonora <meter min="0" max="1" value={visualLoad}/></label>
          <small>Cantos sintetizados</small>{audioError&&<small role="alert">{audioError}</small>}
        </div>}
      </div>
    </header>
    {stage===1&&anchorsVisible(markers,branch,select,webgl)}
    {!ready&&<div className="load-state" role="status">{webgl?'Construyendo la escultura…':'WebGL 2 no disponible. Puedes explorar el atlas y consultar las fuentes.'}</div>}
    {stage===0&&<main className="intro" tabIndex={-1} ref={main}>
      <div className="eyebrow"><i/> INSTALACIÓN INTERACTIVA</div>
      <h1>¿A qué suena<br/><em>la luz?</em></h1>
      <p>Existe un ruido que no siempre podemos escuchar. Crece cada noche y transforma silenciosamente el equilibrio de nuestro mundo.</p>
      <button className="primary" onClick={()=>setStage(1)}>Escucha el mundo <Icon name="sound" size={18}/></button>
    </main>}
    {stage===1&&<main className="exploration" tabIndex={-1} ref={main}>
      <div className="eyebrow"><i/> ATLAS INTERACTIVO</div>
      <h1>El ruido comienza<br/>a <em>crecer.</em></h1>
      <div className="explore-data">
        <div className="data-heading"><strong>{iso?data?.countries.find(r=>r.iso===iso)?.name:branch<0?'Vista global':groupNames[branch]}</strong><span>{year}</span></div>
        <div className="region-select">
          <label>Continente<select value={branch} onChange={e=>select(Number(e.target.value))}><option value="-1">Vista global</option>{groupNames.map((g,i)=><option key={g} value={i}>{g}</option>)}</select></label>
          <label>País<select value={iso} disabled={!data} onChange={e=>{const id=e.target.value;select(id?groupNames.indexOf(data.countries.find(r=>r.iso===id).continent):branch,id);}}><option value="">Todos los disponibles</option>{countryOptions.map(r=><option key={r.iso} value={r.iso}>{r.name}</option>)}</select></label>
        </div>
        {dataError?<p role="alert">{dataError}</p>:!data?<p role="status">Cargando datos…</p>:<>
          <div className="measure"><data value={current??''}>{format(current)}</data><span>{unit}</span></div>
          <p className="caption">{current===null?'Sin datos para esta selección':'Radiancia nocturna promedio'} {delta&&<b className={delta.percent<0?'cool':'warm'}>{delta.percent>0?'+':''}{format(delta.percent)} % vs. {delta.year}</b>}</p>
          <div className="metadata"><span className="mode">{data.mode==='simulation'?'Modo simulación':'Serie validada'}</span><span>Observación {meta('observation')} · Actualización {meta('updated')}</span>{data.mode==='simulation'?<span>Fuente de la serie · demostración sintética</span>:<span>Fuente de la serie · {meta('source')}</span>}</div>
          <div className="spectrum"><span>Baja</span><i/><span>Alta</span></div>
          <p className="caption">Densidad sonora · {Math.round(visualLoad*100)} %</p>
          <button className="text-button" onClick={()=>setCompare(!compare)} aria-expanded={compare}>{compare?'Ocultar comparación':'Comparar periodos o países'}</button>
          {compare&&<div className="comparison">
            <div className="region-select">
              <label>Año de referencia<select value={base} onChange={e=>setBase(Number(e.target.value))}>{data.years.map(y=><option key={y}>{y}</option>)}</select></label>
              <label>Segundo país<select value={other} onChange={e=>{if(e.target.value&&!iso){const first=data.countries.find(r=>r.iso!==e.target.value);select(groupNames.indexOf(first.continent),first.iso);}setOther(e.target.value);}}><option value="">Ninguno</option>{data.countries.filter(r=>r.iso!==iso).map(r=><option key={r.iso} value={r.iso}>{r.name}</option>)}</select></label>
            </div>
            <Charts {...{data,year,branch,iso,other,base}} setYear={setYearManual}/>
          </div>}
        </>}
      </div>
      <p className="unit-note"><strong>¿Qué significa {unit}?</strong> Nanovatios por centímetro cuadrado y por estereorradián. Un nanovatio es una milmillonésima de vatio. El centímetro cuadrado indica el área y el estereorradián, el ángulo sólido. Un valor mayor indica más radiancia nocturna detectada en esa dirección. {data&&<span className="unit-end">Último año de la serie ({data.years.at(-1)}) · {format(data.value(data.years.at(-1),branch,iso))} {unit}{simulated?' · simulación':''}.</span>} <a href={nasa} target="_blank" rel="noreferrer">NASA Black Marble</a></p>
      <button className="outline reveal" onClick={()=>setStage(2)}>Descubre qué está cambiando</button>
    </main>}
    {stage===2&&<main className="reading" tabIndex={-1} ref={main}>
      <div className="eyebrow"><i/> COMPRENDER</div>
      <h1>La noche que<br/>estamos <em>perdiendo.</em></h1>
      <p className="lead">Lo que acabas de escuchar es una representación de la contaminación lumínica.</p>
      <p>El árbol representa la Tierra. Sus ramas son territorios. Cada ave es una unidad simbólica de radiancia nocturna y la superposición de sus cantos traduce la saturación de la luz.</p>
      <div className="findings">
        <article><b>9,6 <sup>%</sup></b><p>Aumento anual estimado del brillo del cielo percibido a partir de observaciones de estrellas en los sitios participantes, 2011–2022.</p><a href="https://doi.org/10.1126/science.abq7781" target="_blank" rel="noreferrer">Kyba et al., 2023</a></article>
        <article><b>83 <sup>%</sup></b><p>De la población mundial vivía bajo cielos afectados por contaminación lumínica según el atlas de 2016.</p><a href="https://doi.org/10.1126/sciadv.1600377" target="_blank" rel="noreferrer">Falchi et al., 2016</a></article>
      </div>
      <h2>La oscuridad es un hábitat.</h2>
      <p>El alumbrado urbano, los anuncios y los edificios iluminados emiten luz que se dispersa en la atmósfera. Esa luz reduce la visibilidad de las estrellas y puede alterar los ciclos circadianos, las relaciones entre especies y la orientación de aves migratorias nocturnas. <a href="https://doi.org/10.1073/pnas.1708574114" target="_blank" rel="noreferrer">Van Doren et al., 2017</a>.</p>
      <p>La radiancia de VIIRS mide luz detectada desde el espacio. El brillo del cielo visto desde tierra estima el resplandor sobre el observador. La distribución geográfica y el cambio temporal pueden diferir entre ambas mediciones.</p>
      {data&&<div className="reading-data"><span className="mode">{data.mode==='simulation'?'Modo simulación':'Serie validada'} · {year}</span><Charts {...{data,year,branch,iso,other,base}} setYear={setYearManual}/></div>}
      <details><summary>Fuentes y metodología</summary><p>NASA Black Marble VNP46A4 v2 es un compuesto anual en una cuadrícula de 15 segundos de arco, de aproximadamente 500 m en el ecuador. El procedimiento documentado pondera por superficie válida y conserva los faltantes. VIIRS tiene sensibilidad espectral limitada en el azul y muestrea a una hora orbital determinada.</p><p>En modo simulación, el promedio de grupo da el mismo peso a cada país disponible y la escala común es de 0 a {data?.scaleMax??7} {unit}. La intensidad normalizada regula la cantidad de aves, la tonalidad y la frecuencia de los cantos. La sonificación es artística.</p><a href={nasa} target="_blank" rel="noreferrer">Producto VNP46A4 · NASA LAADS DAAC</a></details>
      <p className="closing">No todo lo que ilumina nos permite ver.</p>
      <button className="primary" onClick={()=>setStage(0)}>Vuelve a escuchar el mundo <Icon name="sound"/></button>
    </main>}
    {stage===1&&data&&<section className="timeline" aria-label="Línea temporal">
      <div className="transport">
        <IconButton name="reset" label="Reiniciar línea temporal" onClick={()=>setYearManual(data.years[0])}/>
        <button title="Año anterior" aria-label="Año anterior" onClick={()=>step(-1)}>‹</button>
        <IconButton name={playing?'pause':'play'} label={playing?'Pausar evolución':'Reproducir evolución'} onClick={togglePlay}/>
        <button title="Año siguiente" aria-label="Año siguiente" onClick={()=>step(1)}>›</button>
      </div>
      <div className="time-range"><output htmlFor="year">{year}</output><input id="year" aria-label="Año" aria-valuetext={String(year)} type="range" min="0" max={data.years.length-1} value={data.years.indexOf(year)} onChange={e=>setYearManual(data.years[Number(e.target.value)])}/><div><span>{data.years[0]}</span><span>{data.years.at(-1)}</span></div></div>
      <select aria-label="Velocidad de reproducción" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.5,1,2,3].map(v=><option key={v} value={v}>{v}×</option>)}</select>
    </section>}
    {stage!==2&&data&&<div className="turn-hud" aria-label="Evolución por vueltas">
      <div className="turn-year" aria-live="polite">{year}</div>
      <div className="turn-copy"><span>{year===data.years.at(-1)?'Fin del recorrido':webgl?'Una vuelta, un año':'Usa la línea temporal'}</span>
      {webgl&&<progress min="0" max="100" value={year===data.years.at(-1)?100:rotation} aria-label="Progreso de la vuelta"/>}
      {stage===0&&data.mode==='simulation'&&<small>Modo simulación · {data.years[0]}–{data.years.at(-1)}</small>}</div>
    </div>}
    {stage!==2&&<div className="sensor-launch">
      <button className="outline" onClick={handOpen?closeHand:enableHand} aria-expanded={handOpen}><Icon name="hand" size={17}/>{handOpen?'Cerrar cámara':'Activar cámara'}</button>
    </div>}
    <section className="hand-panel popover" hidden={!handOpen} aria-label="Control con la mano">
      <div className="hand-heading"><strong>Control con la mano</strong><button className="text-button" onClick={closeHand} aria-label="Cerrar y apagar cámara">Cerrar</button></div>
      <div className={'hand-preview '+(handDetected?'detected':'')} hidden={!handActive}>
        <video ref={video} className="hand-video" autoPlay playsInline muted aria-label="Vista de tu cámara"/>
        <canvas ref={handOverlay} className="hand-overlay" aria-hidden="true"/>
      </div>
      {handActive&&<>
        <p>Palma abierta para girar. Puño cerrado para parar.</p>
        <div className="hand-controls"><label>Velocidad <select aria-label="Velocidad del giro" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{(speed===.5?[.5,1,2,3]:[1,2,3]).map(v=><option key={v} value={v}>{v}×</option>)}</select></label><button className="text-button" onClick={()=>scene.current?.holdOrbit()}>Detener</button></div>
      </>}
      {!handActive&&<><p>La imagen se procesa en tu dispositivo.</p><button className="outline" onClick={enableHand}>Activar cámara</button></>}
      {handStatus&&<p role="status">{handStatus}</p>}
      {handOpen&&handStatus&& !handActive&&<a href={window.location.href} target="_blank" rel="noreferrer">Abrir en una pestaña del navegador</a>}
    </section>
    <aside className="camera" aria-label="Controles de cámara">
      {cameraMenu&&<div className="popover view-menu"><span>Perspectiva</span>{views.map((v,i)=><button key={v} onClick={()=>{scene.current?.cameraCommand(viewKeys[i]);setCameraMenu(false);}}>{v}</button>)}</div>}
      {webgl&&<><IconButton name="orbit" label="Perspectivas de cámara" onClick={()=>setCameraMenu(!cameraMenu)}/><IconButton name="plus" label="Acercar" onClick={()=>scene.current?.cameraCommand('+')}/><IconButton name="minus" label="Alejar" onClick={()=>scene.current?.cameraCommand('-')}/><IconButton name="reset" label="Restablecer cámara" onClick={()=>{scene.current?.clearTurn();scene.current?.reset();}}/></>}
      <IconButton name="motion" label="Movimiento automático" pressed={motion} onClick={()=>setMotion(!motion)}/>
    </aside>
    {stage===0&&<footer className="footer"><div className="gesture"><Icon name="orbit"/><span>Arrastra para girar <i/> Desplaza para acercarte</span></div><span className="footer-caption">Cuando la noche deja de descansar.</span><span className="angle"><Icon name="globe" size={16}/> 360°</span></footer>}
  </div>;
}
function anchorsVisible(markers,branch,select,webgl){
  if(!webgl)return null;
  return <div className="markers">{short.map((label,i)=><button ref={el=>{markers.current[i]=el;}} key={label} className={'marker '+(branch===i?'chosen':'')} onClick={()=>select(i)} aria-label={groupNames[i]}><span>{groupCodes[i]}</span><b>{label}</b></button>)}</div>;
}
createRoot(document.getElementById('root')).render(<App/>);
