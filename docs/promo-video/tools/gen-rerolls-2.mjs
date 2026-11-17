import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const D=process.cwd()+'/docs/promo-video/';
const env = await readFile(process.cwd()+'/.env.local','utf8');
const key = env.match(/^MADEAPP_KEY=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'');
const base='https://www.made.app/api';
async function api(path, body){
  const r = await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body&&{body:JSON.stringify(body)})});
  const d = await r.json(); if(!r.ok) throw new Error(r.status+' '+JSON.stringify(d)); return d;
}
async function up(f){
  const { media, upload } = await api('/v1/media',{content_type:'image/jpeg',filename:f});
  const p = await fetch(upload.url,{method:'PUT',headers:upload.headers,body:await readFile(D+f)});
  if(!p.ok) throw new Error('upload');
  await api(`/v1/media/${media.id}/confirm`,{}); return media.id;
}
const REF = "Character reference (attached drawings): Dolores, an invented drawn character: same face, same curly tousled hair, same school jumper over collared shirt and tie. Keep her recognisably the same person in every image. ";
const STYLE = "Loose, scribbly blue ballpoint pen sketch on a page of lined school exercise book paper. Sketchy ink outlines, rough cross-hatching, overlapping doodle-like lines. Faint red margin, blue horizontal lines, subtle coffee stains. Blue ink only, no colour. No readable writing, letters or numbers anywhere. No margin doodles, no extra icons. Portrait 9:16 for a phone video: keep the main action in the middle 60% of the frame and keep the bottom fifth calm and uncluttered for captions. ";
const CUT = "Pure white background (#FFFFFF), nothing else in the frame: no paper lines, no stains, no margin, no shadow, no floor. Character only, in blue ballpoint pen sketch style, no writing. FULL FIGURE from the top of her head to the soles of her shoes, both shoes visible, centred, with clear white space all round. Outfit exactly as the reference pose-neutral image: grey V-neck school jumper over a white collared shirt and striped tie, plain grey school trousers, black shoes. No skirt, no socks showing, no plasters, no accessories. ";
const jobs = [
 ['pose-speaking', true, CUT+"Dolores standing, mouth open speaking, one hand gesturing gently. Line work only with light cross-hatching, exactly like the pose-neutral reference: do NOT fill the jumper or trousers with solid grey or blue tone."],
 ['07b-teacher-pen-drop', true, STYLE+"The same classroom. In the middle of the frame, Dolores standing, grinning confidently, drawn large. The teacher, an ordinary friendly adult, stands beside her, smaller in frame, hand open and surprised. A single large clearly visible pen is falling through the air in the empty space between them, drawn big with small motion lines above it. Pupils as small shapes behind. No giant arms or hands in the foreground."],
];
const refs = [await up('scribbles-dolores-2.jpg'), await up('01-desk-drawing.jpg'), await up('pose-neutral-v1.jpg')];
const out = await Promise.allSettled(jobs.map(async ([name,withDol,prompt])=>{
  const input={model:'nano_banana_2',prompt:(withDol?REF:'')+prompt,aspect_ratio:'9:16',resolution:'1K',medias:refs.map(v=>({value:v,role:'image'}))};
  const {cost}=await api('/v1/cost',input);
  let job=await api('/v1/generations',{...input,request_id:randomUUID(),max_cost_cents:cost.customerCostCents});
  while(!['succeeded','failed','canceled'].includes(job.status)){await new Promise(r=>setTimeout(r,3000));job=await api(`/v1/generations/${job.id}`);}
  if(job.status!=='succeeded') throw new Error(name+' '+JSON.stringify(job.error));
  await writeFile(D+name+'.jpg',Buffer.from(await (await fetch(job.result.assets[0].url)).arrayBuffer()));
  return name+' '+cost.credits;
}));
out.forEach(o=>console.log(o.status, o.value||o.reason.message));
console.log('balance',(await api('/v1/balance')).balanceCredits);
