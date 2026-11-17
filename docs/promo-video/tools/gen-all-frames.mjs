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
const CUT = "Plain flat white background, character only, no paper lines, no stains, no margin, whole figure fully inside the frame with space around it, blue ballpoint pen sketch style, no writing. ";
const jobs = [
 ['02a-flashcards', true, STYLE+"Close-up of Dolores's head resting on her arm over a pile of plain blank flashcards, bored, half-asleep."],
 ['02b-talking-to-wall', true, STYLE+"Dolores standing facing her bedroom wall, mouth open mid-word, then looking embarrassed. A small speech bubble with a single question mark above her."],
 ['02c-lost-notes', true, STYLE+"A school bag spilling open onto a messy bedroom floor, loose blank papers everywhere, Dolores peering in, looking lost."],
 ['03-calendar-facedown', true, STYLE+"Dolores's hand turning a wall calendar face down, then Dolores asleep with her head on a sketchbook."],
 ['04a-nightmare-corridor', false, STYLE+"A long school corridor in dramatic one-point perspective, lockers on both sides, no people, darker and heavier ink than a normal sketch, the far end disappearing into scribbled black. Use the attached images only for the pen style."],
 ['04b-monster-teacher', true, STYLE+"A weird, tall, original monster teacher, thin and stretched, tiny glasses, too many long fingers, no features of any real person, chasing small Dolores down a school corridor. Scribbled speech bubbles of illegible squiggles fly from its mouth. Dark heavy ink."],
 ['07a-test-day-classroom', true, STYLE+"A classroom, about 30 pupils seen from behind and the side, a friendly ordinary teacher at the front with a notepad, Dolores standing at the front looking calm and confident."],
 ['07b-teacher-pen-drop', true, STYLE+"The same classroom, the teacher's pen falling from their hand in surprise as Dolores answers, Dolores grinning."],
 ['pose-neutral', true, CUT+"Dolores, full figure standing, neutral relaxed expression."],
 ['pose-eyes-wide', true, CUT+"Dolores, full figure standing, eyes wide in alarm."],
 ['pose-speaking', true, CUT+"Dolores, full figure standing, mouth open speaking."],
 ['pose-grin', true, CUT+"Dolores, full figure standing, a big grin."],
];
const refs = [await up('scribbles-dolores-2.jpg'), await up('01-desk-drawing.jpg')];
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
