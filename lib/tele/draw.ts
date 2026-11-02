// @ts-nocheck
/*
 * Tele's canvas renderer, ported from the validated sketch in docs/design/tele-sketch.html
 * (task 18.2). The drawing code below the "ported" marker is kept as close to the sketch as
 * possible on purpose, so the look Dolores signed off does not drift. It is untyped (ts-nocheck)
 * for that reason; the public API at the bottom is typed in tele-renderer.ts.
 *
 * Tele has no mouth. Inputs: feelings (eye, antennae, picture, world), loudness (screen and
 * antenna glow while speaking) and a question flag (raised brows at the end of a question).
 */
import { EMOTIONS as EMOS, faceFromFeelings as faceFromEmo, neutral as zero } from './feelings';

// Performance budget knobs (task 18.6). The sketch drew at the screen's full rate and pixel ratio.
export const TELE_MAX_FPS = 30;
const MAX_FPS = TELE_MAX_FPS;
export const TELE_MAX_DPR = 1.5;
const MAX_DPR = TELE_MAX_DPR;

export function createTeleDrawing(cv, isCalm) {
const clamp = (v,a,b) => v<a?a:v>b?b:v, clamp01 = v => clamp(v,0,1), lerp = (a,b,t) => a+(b-a)*t;
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
/* ---------- ported from the sketch: drawing assets ---------- */
const g = cv.getContext('2d');
function makeIris(){
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), r = N/2, rnd = rng(7);
  let gr = x.createRadialGradient(r,r,r*.2,r,r,r);
  gr.addColorStop(0,'#a07a38'); gr.addColorStop(.3,'#7f8c5c'); gr.addColorStop(.52,'#4b88ad');
  gr.addColorStop(.82,'#38668c'); gr.addColorStop(.94,'#1c3248'); gr.addColorStop(1,'#0e1925');
  x.fillStyle = gr; x.beginPath(); x.arc(r,r,r,0,7); x.fill();
  for (let i=0; i<1100; i++){
    const a = rnd()*Math.PI*2, r0 = r*(.2+rnd()*.2), r1 = r*(.6+rnd()*.36), bend = (rnd()-.5)*.28, rm = (r0+r1)/2;
    x.strokeStyle = rnd()<.5 ? `rgba(225,238,248,${.05+rnd()*.13})` : `rgba(8,22,38,${.06+rnd()*.15})`;
    x.lineWidth = .6+rnd()*1.3;
    x.beginPath(); x.moveTo(r+Math.cos(a)*r0, r+Math.sin(a)*r0);
    x.quadraticCurveTo(r+Math.cos(a+bend)*rm, r+Math.sin(a+bend)*rm, r+Math.cos(a)*r1, r+Math.sin(a)*r1); x.stroke();
  }
  x.strokeStyle = 'rgba(214,168,86,.55)'; x.lineWidth = 3.2; x.beginPath();
  for (let i=0; i<=140; i++){ const a = i/140*Math.PI*2, rr = r*(.41+(rnd()-.5)*.07); const px = r+Math.cos(a)*rr, py = r+Math.sin(a)*rr; i ? x.lineTo(px,py) : x.moveTo(px,py); }
  x.stroke();
  for (let i=0; i<46; i++){ const a = rnd()*7, rr = r*(.46+rnd()*.36); x.fillStyle = `rgba(12,28,44,${.14+rnd()*.22})`; x.beginPath(); x.ellipse(r+Math.cos(a)*rr, r+Math.sin(a)*rr, 2+rnd()*5, 1+rnd()*2, a, 0, 7); x.fill(); }
  gr = x.createRadialGradient(r,r,r*.8,r,r,r); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(4,10,20,.8)');
  x.fillStyle = gr; x.beginPath(); x.arc(r,r,r,0,7); x.fill();
  return c;
}
const IRIS = makeIris();
const NOISE = [0,1,2,3].map(() => { const c = document.createElement('canvas'); c.width = 96; c.height = 72; const x = c.getContext('2d'), d = x.createImageData(96,72); for (let i=0; i<d.data.length; i+=4){ const v = Math.random()*255|0; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } x.putImageData(d,0,0); return c; });
const SCAN = (() => { const c = document.createElement('canvas'); c.width = 1; c.height = 3; const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0,0,1,1); return g.createPattern(c, 'repeat'); })();
const R7 = rng(11);
const VEINS = Array.from({length:16}, (_,i) => { // eye-local polylines starting near the corners
  const side = i%2 ? 1 : -1; let x = side*(70+R7()*8), y = (R7()-.5)*22, a = side>0 ? Math.PI : 0; a += (R7()-.5)*.8;
  const pts = [[x,y]]; const n = 6+R7()*7|0;
  for (let k=0; k<n; k++){ a += (R7()-.5)*.9; x += Math.cos(a)*5; y += Math.sin(a)*4; pts.push([x,y]); }
  return {pts, w:.5+R7()*.9};
});
const LASH = Array.from({length:38}, () => ({len:.75+R7()*.5, off:(R7()-.5)*.012, curl:.7+R7()*.6}));
const LLASH = Array.from({length:18}, () => ({len:.7+R7()*.6, off:(R7()-.5)*.02}));
const HAIR = Array.from({length:110}, () => ({t:R7(), o:R7(), len:.8+R7()*.5, a:(R7()-.5)*.35}));
const CLOUDS = Array.from({length:5}, (_,i) => ({x:R7()*440-20, y:36+R7()*120, s:.6+R7()*.7, v:3+R7()*5}));

/* ---------- colours of the world ---------- */
const hex = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const SKY = {neutral:['#8cc4f2','#e6f3ff'], joy:['#6fc6ff','#fff2cf'], sadness:['#6f7d92','#c4ccd8'], anger:['#b5544c','#f6c6a8'], fear:['#1e2645','#535979'], surprise:['#c08fe4','#ffe2f2'], disgust:['#83a04f','#dde6a6']};
const FLOOR = {neutral:'#ee9cbc', joy:'#ffd36b', sadness:'#8fa4c4', anger:'#d4574d', fear:'#4a4c6a', surprise:'#c8a0f0', disgust:'#a8c25a'};
const TINT = {joy:'#ffcf6b', sadness:'#5f86d8', anger:'#ff3b30', fear:'#2c1f5c', surprise:'#ff8fd8', disgust:'#9acd32'};
const HX = {}; for (const k in SKY) HX[k] = SKY[k].map(hex); const FX = {}; for (const k in FLOOR) FX[k] = hex(FLOOR[k]);
function moodColor(table, em, idx){
  const tot = EMOS.reduce((s,e) => s+(em[e]||0), 0), w = Math.min(1, tot);
  const base = idx===undefined ? table.neutral : table.neutral[idx];
  const c = base.map(v => v*(1-w));
  if (tot > 0) for (const e of EMOS){ const k = (em[e]||0)/tot*w; const col = idx===undefined ? table[e] : table[e][idx]; for (let j=0; j<3; j++) c[j] += col[j]*k; }
  return `rgb(${c.map(v => Math.round(v)).join(',')})`;
}
const rr = (x,y,w,h,r) => { g.beginPath(); g.roundRect ? g.roundRect(x,y,w,h,r) : g.rect(x,y,w,h); };

/* ---------- state ---------- */
const S = {emo:zero(), target:zero(), blinkNext:0, blinkT:-1, gaze:{x:0,y:0,tx:0,ty:0,next:0},
  emph:0, amp:0, ampTarget:0, last:0, power:0, flash:0, ant:{w:0,v:0}, knob:0, knobT:0, vol:0,
  tear:{on:false,y:0,v:0,s:0,wait:0}, look:null, speaking:false, question:false, blinkF:1};
/* ---------- world + body ---------- */
function drawWorld(f, now){
  const em = S.emo;
  let gr = g.createLinearGradient(0,0,0,300);
  gr.addColorStop(0, moodColor(HX, em, 0)); gr.addColorStop(1, moodColor(HX, em, 1));
  g.fillStyle = gr; g.fillRect(0,0,400,430);
  const joy = em.joy||0;
  if (joy > .05){ // rainbow
    const bands = ['#ff6b6b','#ffb36b','#ffe66b','#7be38a','#6bb8ff','#a88bff'];
    g.save(); g.globalAlpha = Math.min(.7, joy*.8); g.lineWidth = 7;
    bands.forEach((c,i) => { g.strokeStyle = c; g.beginPath(); g.arc(200, 330, 250-i*7, Math.PI*1.08, Math.PI*1.92); g.stroke(); });
    g.restore();
  }
  for (const c of CLOUDS){
    const x = isCalm() ? c.x : ((c.x + now*c.v) % 480) - 40;
    g.save(); g.translate(x, c.y); g.scale(c.s, c.s);
    g.fillStyle = 'rgba(255,255,255,.92)';
    [[0,0,22],[20,-10,26],[44,-2,20],[24,8,22],[60,6,14]].forEach(([cx,cy,r]) => { g.beginPath(); g.arc(cx,cy,r,0,7); g.fill(); });
    g.fillStyle = 'rgba(160,180,210,.25)'; g.beginPath(); g.ellipse(30,18,40,7,0,0,7); g.fill();
    g.restore();
  }
  // checkerboard floor running to a vanishing point
  const H = 292, vpy = 228, fc = moodColor(FX, em);
  g.fillStyle = '#f3ead6'; g.fillRect(0,H,400,138);
  const ys = []; for (let inv = (H-vpy)/(430-vpy)*0+1/((H-vpy)/(430-vpy)), k=0; k<12; k++){ const s = 1/Math.max(.9, inv - k*.42); ys.push(vpy + s*(430-vpy)); }
  ys.unshift(H);
  g.fillStyle = fc;
  for (let r=0; r<ys.length-1; r++){
    const y0 = ys[r], y1 = Math.min(430, ys[r+1]); if (y0 >= 430) break;
    const s0 = (y0-vpy)/(430-vpy), s1 = (y1-vpy)/(430-vpy);
    for (let u=-9; u<9; u++){ if ((u+r)&1) continue;
      g.beginPath(); g.moveTo(200+u*58*s0, y0); g.lineTo(200+(u+1)*58*s0, y0); g.lineTo(200+(u+1)*58*s1, y1); g.lineTo(200+u*58*s1, y1); g.closePath(); g.fill(); }
  }
  gr = g.createLinearGradient(0,H,0,H+40); gr.addColorStop(0,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0,H,400,40);
  // a door standing alone in the room
  g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(84,293,18,3,0,0,7); g.fill();
  g.fillStyle = '#fbf7ee'; g.fillRect(70,244,26,49);
  gr = g.createLinearGradient(74,248,92,292); gr.addColorStop(0,'#fff6c8'); gr.addColorStop(1,'#ffd98a'); g.fillStyle = gr; g.fillRect(74,248,18,45);
  g.fillStyle = '#d8cdb8'; g.beginPath(); g.moveTo(74,248); g.lineTo(64,252); g.lineTo(64,296); g.lineTo(74,293); g.closePath(); g.fill();
  // a small mushroom that watches too
  g.fillStyle = '#fff'; g.fillRect(334,286,8,14);
  g.fillStyle = '#e0473d'; g.beginPath(); g.ellipse(338,287,15,10,0,Math.PI,0); g.fill();
  g.fillStyle = '#fff'; [[330,282],[344,281],[338,278]].forEach(([x,y]) => { g.beginPath(); g.arc(x,y,1.8,0,7); g.fill(); });
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(338,293,3.2,2.6*Math.max(.15,S.blinkF??1),0,0,7); g.fill();
  g.fillStyle = '#1b1b2a'; g.beginPath(); g.arc(338+S.gaze.x*.15, 293, 1.4, 0, 7); g.fill();
  // fear dims the world and makes it flicker
  const dark = (em.fear||0)*.35 + (em.sadness||0)*.12;
  if (dark > .01){ g.fillStyle = `rgba(6,8,20,${clamp01(dark*(isCalm() ? 1 : .85+Math.random()*.3))})`; g.fillRect(0,0,400,430); }
}
function drawBody(breath){
  g.save(); g.translate(0, breath*.3);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(200,338,96,14,0,0,7); g.fill();
  let gr = g.createLinearGradient(0,330,0,430); gr.addColorStop(0,'#f7b6cf'); gr.addColorStop(1,'#d9819f');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(14,430); g.bezierCurveTo(20,398,40,374,92,360); g.bezierCurveTo(128,350,164,342,200,342); g.bezierCurveTo(236,342,272,350,308,360); g.bezierCurveTo(360,374,380,398,386,430); g.closePath(); g.fill();
  g.strokeStyle = '#a9557a'; g.lineWidth = 1.5; g.stroke();
  g.strokeStyle = 'rgba(169,85,122,.6)'; g.lineWidth = 1.5; [[88,362,104,430],[312,362,296,430]].forEach(([a,b,c,d]) => { g.beginPath(); g.moveTo(a,b); g.quadraticCurveTo((a+c)/2+(a<200?8:-8),(b+d)/2,c,d); g.stroke(); });
  g.fillStyle = '#3a2a35'; g.beginPath(); g.ellipse(200,343,34,8,0,0,7); g.fill();
  g.fillStyle = '#fdf6e9'; g.strokeStyle = '#b9a98f'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(166,340); g.lineTo(200,376); g.lineTo(184,338); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(234,340); g.lineTo(200,376); g.lineTo(216,338); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#b8607f'; g.lineWidth = 2; g.beginPath(); g.moveTo(200,376); g.lineTo(200,430); g.stroke();
  g.fillStyle = '#fff4c2'; [394,416].forEach(y => { g.beginPath(); g.arc(207,y,3.5,0,7); g.fill(); });
  // patches: a heart and a star, stitched on
  g.fillStyle = '#e8414f'; g.beginPath(); g.moveTo(112,410); g.bezierCurveTo(92,396,98,380,112,388); g.bezierCurveTo(126,380,132,396,112,410); g.fill();
  g.setLineDash([2,2]); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
  g.fillStyle = '#ffd84a'; g.beginPath(); for (let i=0; i<10; i++){ const a = -Math.PI/2 + i*Math.PI/5, r = i%2 ? 6 : 14; g.lineTo(292+Math.cos(a)*r, 400+Math.sin(a)*r); } g.closePath(); g.fill();
  g.strokeStyle = '#c99a00'; g.stroke();
  // a coiled cable from the TV down into the collar
  g.strokeStyle = '#2b2d33'; g.lineWidth = 3; g.beginPath(); g.moveTo(226,300);
  for (let i=0; i<=24; i++){ const t = i/24; g.lineTo(226+t*8+Math.sin(t*Math.PI*10)*4, 300+t*40); } g.stroke();
  g.restore();
}

/* ---------- the TV ---------- */
const SX = 104, SY = 115, SW = 192, SH = 142;
function bez(p0,p1,p2,p3,t){ const u = 1-t; return {x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x, y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y,
  dx:3*u*u*(p1.x-p0.x)+6*u*t*(p2.x-p1.x)+3*t*t*(p3.x-p2.x), dy:3*u*u*(p1.y-p0.y)+6*u*t*(p2.y-p1.y)+3*t*t*(p3.y-p2.y)}; }
function drawTV(f, blinkF, now){
  const amp = S.amp;
  // antennae
  const base = {x:200, y:80};
  const a0 = (f.antenna >= 0 ? 30-14*f.antenna : 30-46*f.antenna) * Math.PI/180;
  for (const s of [-1,1]){
    const ang = s*a0 + S.ant.w*Math.PI/180, L = 86 - Math.max(0,-f.antenna)*8;
    const tip = {x:base.x+Math.sin(ang)*L, y:base.y-Math.cos(ang)*L};
    const bendX = Math.max(0,-f.antenna)*s*10, bendY = Math.max(0,-f.antenna)*12;
    g.strokeStyle = '#9aa1ad'; g.lineWidth = 3.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(base.x,base.y); g.quadraticCurveTo((base.x+tip.x)/2+bendX, (base.y+tip.y)/2+bendY, tip.x, tip.y); g.stroke();
    g.strokeStyle = '#eef1f6'; g.lineWidth = 1; g.stroke();
    if (amp > .02){ const gl = g.createRadialGradient(tip.x,tip.y,1,tip.x,tip.y,6+16*amp); gl.addColorStop(0,`rgba(255,244,190,${.75*amp})`); gl.addColorStop(1,'rgba(255,244,190,0)'); g.fillStyle = gl; g.beginPath(); g.arc(tip.x,tip.y,6+16*amp,0,7); g.fill(); }
    const bg = g.createRadialGradient(tip.x-1.5,tip.y-1.5,.5,tip.x,tip.y,5.5); bg.addColorStop(0,'#ffffff'); bg.addColorStop(1, amp > .05 ? '#ffd86a' : '#8e95a2');
    g.fillStyle = bg; g.beginPath(); g.arc(tip.x,tip.y,5.5,0,7); g.fill();
  }
  // wood top and side
  let gr = g.createLinearGradient(80,80,338,92); gr.addColorStop(0,'#94603a'); gr.addColorStop(1,'#6d4427');
  g.fillStyle = gr; g.beginPath(); g.moveTo(80,92); g.lineTo(320,92); g.lineTo(338,80); g.lineTo(98,80); g.closePath(); g.fill();
  gr = g.createLinearGradient(320,0,338,0); gr.addColorStop(0,'#7a4c2c'); gr.addColorStop(1,'#5a3820');
  g.fillStyle = gr; g.beginPath(); g.moveTo(320,92); g.lineTo(338,80); g.lineTo(338,290); g.lineTo(320,304); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(60,34,16,.45)'; g.lineWidth = 1;
  for (let i=0; i<6; i++){ g.beginPath(); g.moveTo(323+i*2.4, 92-i*1.6+4); g.bezierCurveTo(326+i*2.4,160,321+i*2.4,220,324+i*2.4,300-i*2); g.stroke(); }
  g.fillStyle = '#5b5f68'; g.beginPath(); g.ellipse(200,82,16,6,0,Math.PI,0); g.fill();
  // cream front
  gr = g.createLinearGradient(0,92,0,304); gr.addColorStop(0,'#f2e8cf'); gr.addColorStop(1,'#d4c29c');
  g.fillStyle = gr; rr(78,92,244,212,16); g.fill(); g.strokeStyle = '#9c8a66'; g.lineWidth = 1.5; g.stroke();
  // bezel
  gr = g.createLinearGradient(0,106,0,266); gr.addColorStop(0,'#3a3a40'); gr.addColorStop(1,'#1f1f23');
  g.fillStyle = gr; rr(94,106,212,160,26); g.fill();
  // screen
  g.save(); rr(SX,SY,SW,SH,28); g.clip();
  drawScreen(f, blinkF, now);
  g.restore();
  // glass: curved reflection and edge shade
  g.save(); rr(SX,SY,SW,SH,28); g.clip();
  gr = g.createLinearGradient(SX,SY,SX+SW*.6,SY+SH*.6); gr.addColorStop(0,'rgba(255,255,255,.22)'); gr.addColorStop(.35,'rgba(255,255,255,.04)'); gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(SX+40, SY+24, 90, 34, -.35, 0, 7); g.fill();
  g.restore();
  g.strokeStyle = '#0d0d10'; g.lineWidth = 2.5; rr(SX,SY,SW,SH,28); g.stroke();
  if (amp > .02){ g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(170,210,255,${.35*amp})`; g.lineWidth = 6; rr(SX-2,SY-2,SW+4,SH+4,30); g.stroke(); g.restore(); }
  // speaker grille that hums with the voice
  const jig = isCalm() ? 0 : Math.sin(now*70)*amp*.8;
  for (let i=0; i<6; i++){ g.fillStyle = amp > .05 ? `rgb(${lerp(91,255,amp*.8)|0},${lerp(82,214,amp*.8)|0},${lerp(64,120,amp*.8)|0})` : '#5b5240'; rr(104+jig, 273+i*4, 74, 2.2, 1); g.fill(); }
  // power LED, brand, knobs
  const on = S.speaking;
  g.fillStyle = on ? `rgba(255,${60+amp*80|0},48,1)` : '#6a1f1b'; g.beginPath(); g.arc(194,284,3.2,0,7); g.fill();
  if (on){ g.fillStyle = `rgba(255,80,60,${.25+.4*amp})`; g.beginPath(); g.arc(194,284,7,0,7); g.fill(); }
  g.fillStyle = '#6b5a3c'; g.font = '15px VT323, monospace'; g.textAlign = 'left'; g.fillText('TELE', 204, 289);
  [[252, S.knob], [286, -130 + 260*S.vol]].forEach(([x, deg]) => {
    const kg = g.createRadialGradient(x-3,281,1,x,284,11); kg.addColorStop(0,'#6a6970'); kg.addColorStop(1,'#2a292e');
    g.fillStyle = kg; g.beginPath(); g.arc(x,284,11,0,7); g.fill();
    const a = deg*Math.PI/180; g.strokeStyle = '#f2e8cf'; g.lineWidth = 2; g.beginPath(); g.moveTo(x,284); g.lineTo(x+Math.sin(a)*8, 284-Math.cos(a)*8); g.stroke();
  });
}
function drawScreen(f, blinkF, now){
  const em = S.emo;
  const jx = isCalm() ? 0 : (Math.random()-.5)*f.jitter*3.2, jy = isCalm() ? 0 : (Math.random()-.5)*f.jitter*1.6;
  g.save(); g.translate(jx, jy);
  // skin
  let gr = g.createRadialGradient(205,178,10,205,186,170);
  gr.addColorStop(0,'#f4d8c8'); gr.addColorStop(.55,'#e2b39d'); gr.addColorStop(1,'#b47e6b');
  g.fillStyle = gr; g.fillRect(SX-10,SY-10,SW+20,SH+20);
  gr = g.createRadialGradient(205,184,26,205,184,104); gr.addColorStop(0,'rgba(140,80,70,.2)'); gr.addColorStop(1,'rgba(140,80,70,0)');
  g.fillStyle = gr; g.fillRect(SX,SY,SW,SH);
  gr = g.createRadialGradient(222,150,4,222,150,60); gr.addColorStop(0,'rgba(255,240,230,.35)'); gr.addColorStop(1,'rgba(255,240,230,0)');
  g.fillStyle = gr; g.fillRect(SX,SY,SW,SH);

  // eye geometry (a right eye: tear duct on the left)
  const ex = 202, ey = 192, ix = 128, iy = 199, ox = 278, oy = 186;
  const openU = 40*(1+.42*f.lidUp), hL = 24*(1-.55*clamp01(f.lidLow));
  const angryIn = Math.max(0,-f.browInner)*.38 + f.squeeze*.08, sadOut = Math.max(0, f.browInner - Math.max(0,f.browOuter))*.28;
  const loY = ey + hL*1.33;
  const u1 = {x:ix+38, y:lerp(loY, ey-openU*1.33*(1-angryIn), blinkF)}, u2 = {x:ox-58, y:lerp(loY, ey-openU*1.33*(1-sadOut), blinkF)};
  const l1 = {x:ox-46, y:loY}, l2 = {x:ix+46, y:loY};
  const I = {x:ix,y:iy}, O = {x:ox,y:oy};
  const eyePath = () => { g.beginPath(); g.moveTo(ix,iy); g.bezierCurveTo(u1.x,u1.y,u2.x,u2.y,ox,oy); g.bezierCurveTo(l1.x,l1.y,l2.x,l2.y,ix,iy); g.closePath(); };

  // brow, hair by hair
  const bi = {x:130, y:139 - f.browInner*12 + f.squeeze*4}, bo = {x:284, y:132 - f.browOuter*8};
  const bp = {x:224, y:Math.min(bi.y,bo.y) - 12 - Math.max(0,f.browOuter)*3};
  const qb = t => ({x:(1-t)*(1-t)*bi.x+2*(1-t)*t*bp.x+t*t*bo.x, y:(1-t)*(1-t)*bi.y+2*(1-t)*t*bp.y+t*t*bo.y, dx:2*(1-t)*(bp.x-bi.x)+2*t*(bo.x-bp.x), dy:2*(1-t)*(bp.y-bi.y)+2*t*(bo.y-bp.y)});
  g.lineCap = 'round';
  g.fillStyle = 'rgba(120,82,60,.32)'; g.beginPath();
  for (let k=0; k<=20; k++){ const p = qb(k/20), L = Math.hypot(p.dx,p.dy), w = 6*(1-k/20*.7); g.lineTo(p.x+p.dy/L*w, p.y-p.dx/L*w); }
  for (let k=20; k>=0; k--){ const p = qb(k/20), L = Math.hypot(p.dx,p.dy), w = 5*(1-k/20*.7); g.lineTo(p.x-p.dy/L*w, p.y+p.dx/L*w); }
  g.closePath(); g.fill();
  for (const h of HAIR){
    const p = qb(h.t), L = Math.hypot(p.dx,p.dy), tx = p.dx/L, ty = p.dy/L, nx = ty, ny = -tx;
    const off = (h.o-.5)*12*(1-h.t*.6);
    const bx = p.x + nx*off, by = p.y + ny*off;
    const up = h.t < .18 ? -1.1 : -.32;
    const a = Math.atan2(ty,tx) + up + h.a, len = (6+5*(1-h.t))*h.len;
    g.strokeStyle = 'rgba(92,62,44,.55)'; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(bx,by); g.lineTo(bx+Math.cos(a)*len, by+Math.sin(a)*len); g.stroke();
  }
  if (f.squeeze > .05){ g.strokeStyle = `rgba(120,70,60,${.45*clamp01(f.squeeze)})`; g.lineWidth = 1.6; [[114,150,118,172],[122,152,124,170]].forEach(([a,b,c,d]) => { g.beginPath(); g.moveTo(a,b); g.quadraticCurveTo(a-3,(b+d)/2,c,d); g.stroke(); }); }
  if (f.browInner > .2 || f.browOuter > .2){ g.strokeStyle = `rgba(150,95,80,${.3*clamp01(Math.max(f.browInner,f.browOuter))})`; g.lineWidth = 1.4; [124,130].forEach(y => { g.beginPath(); g.moveTo(150,y+4); g.quadraticCurveTo(210,y-4,270,y+2); g.stroke(); }); }

  // lid crease
  g.strokeStyle = 'rgba(120,68,58,.42)'; g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(ix+8, iy-9); g.bezierCurveTo(ix+40, ey-openU*1.33-16+angryIn*14, ox-58, ey-openU*1.33-18+sadOut*18, ox-4, oy-11); g.stroke();
  gr = g.createLinearGradient(0, ey-openU-20, 0, ey); gr.addColorStop(0,'rgba(150,90,80,0)'); gr.addColorStop(1,'rgba(150,90,80,.22)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(ix,iy); g.bezierCurveTo(ix+40, ey-openU*1.33-16, ox-58, ey-openU*1.33-18, ox,oy); g.bezierCurveTo(u2.x,u2.y,u1.x,u1.y,ix,iy); g.fill();

  // eyeball
  g.save(); eyePath(); g.clip();
  gr = g.createRadialGradient(ex+4,ey,8,ex,ey,90); gr.addColorStop(0,'#fbf7f2'); gr.addColorStop(.7,'#ece0d8'); gr.addColorStop(1,'#c9a49a');
  g.fillStyle = gr; g.fillRect(ix-4, ey-60, ox-ix+8, 120);
  const blood = clamp01(.18 + .55*f.bloodshot + .35*clamp01(f.tear));
  g.strokeStyle = `rgba(190,40,50,${blood})`;
  for (const v of VEINS){ g.lineWidth = v.w; g.beginPath(); v.pts.forEach(([x,y],k) => k ? g.lineTo(ex+x, ey+y) : g.moveTo(ex+x, ey+y)); g.stroke(); }
  const G = S.gaze, icx = ex + 6 + G.x*1.6, icy = ey + 2 + G.y*1.4 + f.gazeY*9, R = 34;
  g.drawImage(IRIS, icx-R, icy-R, R*2, R*2);
  const pr = clamp(11.5*(1+.55*f.pupil), 4, 20);
  gr = g.createRadialGradient(icx,icy,pr*.75,icx,icy,pr*1.08); gr.addColorStop(0,'#050507'); gr.addColorStop(1,'rgba(5,5,7,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(icx,icy,pr*1.08,0,7); g.fill();
  g.fillStyle = '#050507'; g.beginPath(); g.arc(icx,icy,pr*.8,0,7); g.fill();
  gr = g.createLinearGradient(0, Math.min(u1.y,u2.y)*.25+ey*.75-openU*.75, 0, Math.min(u1.y,u2.y)*.25+ey*.75-openU*.75+22);
  gr.addColorStop(0,'rgba(60,25,20,.5)'); gr.addColorStop(1,'rgba(60,25,20,0)');
  g.fillStyle = gr; g.fillRect(ix, ey-80, ox-ix, 110);
  g.fillStyle = 'rgba(255,255,255,.92)'; rr(icx-R*.5, icy-R*.52, R*.36, R*.26, 4); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(icx+R*.32, icy+R*.3, 2.6, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(ex-30, ey-6, 26, 8, -.2, 0, 7); g.fill();
  g.fillStyle = 'rgba(214,120,120,.85)'; g.beginPath(); g.ellipse(ix+7, iy-1, 8, 5.5, .1, 0, 7); g.fill();
  g.restore();

  // lid margins
  g.strokeStyle = 'rgba(232,170,160,.9)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(ox,oy); g.bezierCurveTo(l1.x,l1.y-1.5,l2.x,l2.y-1.5,ix,iy); g.stroke();
  g.strokeStyle = '#2a1a17'; g.lineWidth = 3.6; g.beginPath(); g.moveTo(ix,iy); g.bezierCurveTo(u1.x,u1.y,u2.x,u2.y,ox,oy); g.stroke();
  g.strokeStyle = 'rgba(110,60,50,.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(ox,oy); g.bezierCurveTo(l1.x,l1.y+2,l2.x,l2.y+2,ix,iy+1); g.stroke();
  // lashes
  g.strokeStyle = '#1d1210'; g.lineWidth = 1.6;
  LASH.forEach((l,k) => {
    const t = .1 + k/(LASH.length-1)*.88 + l.off, p = bez(I,u1,u2,O,t);
    const L = Math.hypot(p.dx,p.dy); let nx = p.dy/L, ny = -p.dx/L; if (ny > 0){ nx=-nx; ny=-ny; }
    const len = (6 + 9*Math.pow(t,1.4))*l.len*(.55+.45*blinkF);
    const tilt = .25 + .6*t;
    const ex2 = p.x + (nx+tilt)*len, ey2 = p.y + ny*len*(.6+.4*blinkF) - len*.15*l.curl*blinkF;
    g.beginPath(); g.moveTo(p.x,p.y); g.quadraticCurveTo(p.x+nx*len*.6, p.y+ny*len*.6, ex2, ey2); g.stroke();
  });
  g.lineWidth = 1.1; g.strokeStyle = 'rgba(29,18,16,.8)';
  LLASH.forEach((l,k) => {
    const t = .12 + k/(LLASH.length-1)*.8 + l.off, p = bez(O,l1,l2,I,t);
    const L = Math.hypot(p.dx,p.dy); let nx = p.dy/L, ny = -p.dx/L; if (ny < 0){ nx=-nx; ny=-ny; }
    const len = (4+5*(1-t))*l.len;
    g.beginPath(); g.moveTo(p.x,p.y+1.5); g.lineTo(p.x+nx*len+(1-t)*2, p.y+1.5+ny*len); g.stroke();
  });
  // tears
  const T = S.tear;
  if (T.on){
    const tx = lerp(ix, ox, .32) + 2, ty = loY*.75 + ey*.25 + 4 + T.y;
    g.fillStyle = 'rgba(200,228,255,.6)'; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(tx, ty-T.s*2.2); g.bezierCurveTo(tx+T.s*1.2, ty-T.s*.6, tx+T.s, ty+T.s, tx, ty+T.s); g.bezierCurveTo(tx-T.s, ty+T.s, tx-T.s*1.2, ty-T.s*.6, tx, ty-T.s*2.2); g.fill(); g.stroke();
  }
  if (f.tear > .1){ g.strokeStyle = `rgba(255,255,255,${.5*clamp01(f.tear)})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ox-10,oy+6); g.bezierCurveTo(l1.x,l1.y-2,l2.x,l2.y-2,ix+10,iy); g.stroke(); }
  g.restore();

  // picture: tint, darkness, rolling bar, static, scanlines, vignette, glow
  g.save(); g.globalCompositeOperation = 'soft-light';
  for (const e of EMOS){ const w = em[e]||0; if (w < .03) continue; g.globalAlpha = Math.min(.85, w*.7); g.fillStyle = TINT[e]; g.fillRect(SX,SY,SW,SH); }
  g.restore();
  if (em.fear > .05){ g.fillStyle = `rgba(5,5,15,${.3*em.fear})`; g.fillRect(SX,SY,SW,SH); }
  if (f.roll > .05){ const y = SY + (isCalm() ? SH*.3 : (now*38) % (SH+40)) - 20; g.fillStyle = `rgba(0,0,0,${.22*f.roll})`; g.fillRect(SX, y, SW, 22); g.fillStyle = `rgba(255,255,255,${.08*f.roll})`; g.fillRect(SX, y+22, SW, 4); }
  const st = clamp01(.035 + .14*clamp01(f.static) + S.flash*.9 + (S.power < 1 ? (1-S.power)*.5 : 0));
  g.save(); g.globalAlpha = st; g.imageSmoothingEnabled = false; g.drawImage(NOISE[isCalm() ? 0 : (now*24|0)%4], SX, SY, SW, SH); g.restore();
  g.fillStyle = SCAN; g.globalAlpha = .22; g.fillRect(SX,SY,SW,SH); g.globalAlpha = 1;
  if (S.amp > .02){ g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(150,190,255,${.1*S.amp})`; g.fillRect(SX,SY,SW,SH); g.restore(); }
  let gr2 = g.createRadialGradient(200,186,60,200,186,150); gr2.addColorStop(0,'rgba(0,0,0,0)'); gr2.addColorStop(1,'rgba(0,0,0,.55)');
  g.fillStyle = gr2; g.fillRect(SX,SY,SW,SH);
  // glitch: shift a few bands of the picture sideways
  if (!isCalm() && f.glitch > .05 && Math.random() < f.glitch*.6){
    const m = g.getTransform();
    g.save(); g.setTransform(1,0,0,1,0,0);
    for (let k=0; k<2+Math.random()*3; k++){
      const yy = SY + Math.random()*SH, p = m.transformPoint({x:SX, y:yy}), p2 = m.transformPoint({x:SX+SW, y:yy});
      const bh = (2+Math.random()*7)*m.d, shift = (Math.random()-.5)*16*m.a*f.glitch;
      g.drawImage(cv, p.x, p.y, p2.x-p.x, bh, p.x+shift, p.y, p2.x-p.x, bh);
      g.fillStyle = `rgba(255,40,60,${.18*f.glitch})`; g.fillRect(p.x, p.y, p2.x-p.x, Math.max(1,bh*.25));
    }
    g.restore();
  }
  // switching on: a bright line opening into a picture
  if (S.power < 1){
    const e = 1-Math.pow(1-S.power,3), half = SH/2*e, cy = SY+SH/2;
    g.fillStyle = '#050505'; g.fillRect(SX,SY,SW,cy-half-SY); g.fillRect(SX,cy+half,SW,SY+SH-cy-half);
    g.fillStyle = `rgba(255,255,255,${(1-S.power)*.9})`; g.fillRect(SX, cy-1.5, SW, 3);
  }
}

/* ---------- frame loop (adapted from the sketch: inputs are set from outside, not from a timeline) ---------- */
function resize(){
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  const W = Math.round(w*dpr), H = Math.round(h*dpr);
  if (cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; }
}
function frame(ms){
  const now = ms/1000, dt = S.last ? Math.min(.05, now-S.last) : .016; S.last = now;
  const calm = isCalm();
  const emoT = S.target, q = S.question;
  const ampT = S.speaking ? S.ampTarget : 0;
  S.amp += (ampT - S.amp)*(1-Math.exp(-dt/(ampT > S.amp ? .03 : .1)));
  S.vol += (S.amp - S.vol)*(1-Math.exp(-dt/.2));
  const ke = 1-Math.exp(-dt/.28);
  for (const e of EMOS) S.emo[e] += ((emoT[e]||0)-S.emo[e])*ke;
  S.emph *= Math.exp(-dt/.28); S.flash *= Math.exp(-dt/.18);
  if (S.power < 1) S.power = Math.min(1, S.power + dt/(calm ? .2 : .9));
  S.knob += (S.knobT - S.knob)*(1-Math.exp(-dt/.12));
  const f = faceFromEmo(S.emo);
  f.browInner += S.emph*.3; f.browOuter += S.emph*.45; f.lidUp += S.emph*.15;
  if (q){ f.browInner += .45; f.browOuter += .5; f.tilt += .8; f.antenna += .3; }
  // antenna spring: bounces on stressed syllables, trembles with fear
  const A = S.ant;
  if (!calm && f.jitter > .1) A.v += (Math.random()-.5)*f.jitter*260*dt*10;
  if (!calm && f.bounce > .1 && Math.random() < dt*1.2) A.v += 40*f.bounce;
  A.v += (-A.w*170 - A.v*7)*dt; A.w += A.v*dt;
  // blink, glance, tears, breathing
  if (!S.blinkNext) S.blinkNext = now+1.6;
  let blinkF = 1;
  if (S.blinkT < 0 && now > S.blinkNext) S.blinkT = 0;
  if (S.blinkT >= 0){ S.blinkT += dt; const p = S.blinkT/.16; if (p >= 1){ S.blinkT = -1; S.blinkNext = now+2+Math.random()*4.5; } else blinkF = 1-Math.sin(p*Math.PI); }
  S.blinkF = blinkF;
  const G = S.gaze;
  if (S.look){ G.tx = S.look.x; G.ty = S.look.y; if (now > S.look.until) S.look = null; }
  else if (!calm && now > G.next){ G.tx = (Math.random()-.5)*8; G.ty = (Math.random()-.5)*5; G.next = now+.7+Math.random()*2.6; }
  const kg = 1-Math.exp(-dt/.045); G.x += (G.tx-G.x)*kg; G.y += (G.ty-G.y)*kg;
  const T = S.tear;
  if (f.tear > .45){
    if (!T.on && now > T.wait){ T.on = true; T.y = 0; T.v = 0; T.s = 0; }
    if (T.on){ if (T.s < 4.2) T.s += dt*5; else { T.v += 60*dt; T.y += T.v*dt; } if (T.y > 80){ T.on = false; T.wait = now + .8 + Math.random(); } }
  } else if (T.on){ T.v += 60*dt; T.y += T.v*dt; if (T.y > 80) T.on = false; }
  const breath = calm ? 0 : Math.sin(now*2*Math.PI/4.4)*1.4;

  resize();
  const sc = cv.width/400;
  g.setTransform(sc,0,0,sc,0,0);
  drawWorld(f, now);
  drawBody(breath);
  g.save();
  g.translate(200, 330 + f.drop*8 + breath - S.emph*2); g.rotate(f.tilt*5*Math.PI/180); g.translate(-200, -330);
  g.fillStyle = '#34363d'; g.fillRect(184,296,32,44);
  drawTV(f, blinkF, now);
  g.restore();
}

/* ---------- inputs ---------- */
let raf = 0, lastDraw = 0;
// Performance budget (docs/performance-budget.md): draw at most MAX_FPS frames a second.
const loop = (ms) => {
  raf = requestAnimationFrame(loop);
  if (ms - lastDraw >= 1000 / MAX_FPS - 2){ lastDraw = ms; frame(ms); }
};
return {
  start(){ if (!raf) raf = requestAnimationFrame(loop); },
  stop(){ cancelAnimationFrame(raf); raf = 0; S.last = 0; },
  renderOnce(){ frame(performance.now()); },
  setFeelings(v){ for (const e of EMOS) S.target[e] = clamp01(Number(v && v[e]) || 0); },
  setLoudness(n){ S.ampTarget = clamp01(Number(n) || 0); },
  setSpeaking(b){ S.speaking = !!b; },
  setQuestion(b){ S.question = !!b; },
  emphasise(){ S.emph = 1; },
  lookAt(x, y, ms){ S.look = {x, y, until: performance.now()/1000 + ms/1000}; },
  /** For tests: the settled feelings the picture is showing. */
  current(){ return { ...S.emo }; },
};
}
