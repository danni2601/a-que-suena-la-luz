export const groupNames=['América del Norte','América del Sur','Europa','Asia','África','Oceanía'];
export const groupCodes=['AN','AS','EU','AI','AF','OC'];
export const unit='nW/cm²/sr';
export const names=new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
export const format=x=>x===null||!Number.isFinite(x)?'—':names.format(x);
export function prepare(dataset){
  const {records,mode,scaleMax}=dataset;
  if(!Array.isArray(records)||!records.length||!(scaleMax>0)||!['simulation','validated'].includes(mode))throw Error('Serie anual inválida');
  const data=records.filter(r=>Number.isInteger(r.year)&&r.year>=(mode==='simulation'?2011:2012)&&groupNames.includes(r.continent)&&r.unit===unit&&r.status===(mode==='simulation'?'simulated':'validated')&&
    (r.radiance===null||(Number.isFinite(r.radiance)&&r.radiance>=0)));
  if(!data.length||!data.some(r=>r.radiance!==null))throw Error('La serie no contiene registros utilizables');
  const years=[...new Set(data.filter(r=>r.radiance!==null).map(r=>r.year))].sort((a,b)=>a-b);
  const countries=[...new Map(data.map(r=>[r.iso,r])).values()];
  const mean=rows=>{
    const valid=rows.filter(r=>r.radiance!==null);
    if(!valid.length)return null;
    if(mode==='validated'&&valid.length>1&&!valid.every(r=>r.validArea>0))return null;
    const weight=r=>mode==='validated'&&r.validArea>0?r.validArea:1;
    return valid.reduce((s,r)=>s+r.radiance*weight(r),0)/valid.reduce((s,r)=>s+weight(r),0);
  };
  const rows=(year,branch,iso)=>data.filter(r=>r.year===year&&(!iso||r.iso===iso)&&(branch<0||r.continent===groupNames[branch]));
  const value=(year,branch=-1,iso='')=>mean(rows(year,branch,iso));
  const variation=(year,branch,iso)=>{
    const current=value(year,branch,iso);
    const previous=years.filter(y=>y<year).reverse().map(y=>({year:y,value:value(y,branch,iso)})).find(p=>p.value!==null);
    return current===null||!previous?.value?null:{year:previous.year,percent:(current-previous.value)*100/previous.value};
  };
  return {mode,scaleMax,years,countries,value,variation,rows};
}
export async function loadData(){
  const base=import.meta.env.BASE_URL+'assets/data/';
  const real=await fetch(base+'validated.json');
  const content=real.headers.get('content-type')||'';
  if(real.ok&&content.includes('json'))return prepare(await real.json());
  const response=await fetch(base+'simulation.json');
  if(!response.ok)throw Error('Serie de demostración no disponible');
  return prepare(await response.json());
}
