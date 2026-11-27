import {cpSync, readFileSync, rmSync, writeFileSync} from 'node:fs';

const build = new URL('../dist/',import.meta.url);
const output = new URL('../docs/',import.meta.url);
const home = readFileSync(new URL('index.html',build),'utf8');
const pages = [
  ['index.html','¿A qué suena la luz?',0],
  ['experimentar.html','Experimentar · ¿A qué suena la luz?',1],
  ['comprender.html','Comprender · ¿A qué suena la luz?',2]
];

rmSync(output,{recursive:true,force:true});
cpSync(build,output,{recursive:true});
for(const [filename,title,stage] of pages){
  const html=home.replace(/<title>.*?<\/title>/,'<title>'+title+'</title>')
    .replace('<body>','<body data-stage="'+stage+'">');
  writeFileSync(new URL(filename,output),html);
}
writeFileSync(new URL('.nojekyll',output),'');
