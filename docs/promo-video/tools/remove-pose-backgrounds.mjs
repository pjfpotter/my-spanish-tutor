import { readFile } from 'node:fs/promises';
const D=process.cwd()+'/';
const env = await readFile(D+'.env.local','utf8');
const key = env.match(/^MADEAPP_KEY=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'');
const base='https://www.made.app/api';
async function api(path, body){
  const r = await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body&&{body:JSON.stringify(body)})});
  const d = await r.json(); if(!r.ok) throw new Error(r.status+' '+JSON.stringify(d)); return d;
}
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const names=['pose-neutral','pose-eyes-wide','pose-speaking','pose-grin'];
const res=await Promise.allSettled(names.map(async n=>{
  const { media, upload } = await api('/v1/media',{content_type:'image/jpeg',filename:n+'.jpg'});
  const p=await fetch(upload.url,{method:'PUT',headers:upload.headers,body:await readFile(D+'docs/promo-video/'+n+'.jpg')});
  if(!p.ok) throw new Error('upload');
  await api(`/v1/media/${media.id}/confirm`,{});
  const body={media:{image:media.id},settings:{}};
  const q=await api('/v1/tools/background-remover/quote',body);
  let job=await api('/v1/tools/background-remover/run',{...body,request_id:randomUUID(),max_cost_cents:q.costCents});
  while(!['succeeded','failed','canceled'].includes(job.status)){await new Promise(r=>setTimeout(r,3000));job=await api(`/v1/generations/${job.id}`);}
  if(job.status!=='succeeded') throw new Error(n+JSON.stringify(job.error));
  await writeFile(D+'docs/promo-video/'+n+'.png',Buffer.from(await (await fetch(job.result.assets[0].url)).arrayBuffer()));
  return n;
}));
res.forEach(r=>console.log(r.status,r.value||r.reason.message));
console.log('balance',(await api('/v1/balance')).balanceCredits);
