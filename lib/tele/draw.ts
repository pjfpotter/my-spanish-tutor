// @ts-nocheck
/*
 * Tele's canvas renderer. The look is the 2026-11-12 redesign (docs/design/tele-react/): a 1970s
 * television with one realistic eye, rabbit-ear antennae, a stripy turtleneck and a patchwork
 * corduroy jacket, standing in a painted room with drifting clouds, a lone door and a mushroom.
 * The drawing code is kept as close to the designer's engine as possible so the signed-off look
 * does not drift. It is untyped (ts-nocheck) for that reason; the public API at the bottom is typed
 * in tele-renderer.ts. The designer's clip player is not used: the app's own playback drives this.
 *
 * Tele has no mouth. Inputs: feelings (eye, antennae, picture, world), loudness (screen, speaker
 * and antenna glow while speaking), a question flag (raised brows and a tilt) and the jacket.
 */
import { EMOTIONS as EMOS, faceFromFeelings as faceFromEmo, neutral as zero } from './feelings';

// Performance budget knobs (task 18.6). The sketch drew at the screen's full rate and pixel ratio.
export const TELE_MAX_FPS = 30;
const MAX_FPS = TELE_MAX_FPS;
export const TELE_MAX_DPR = 1.5;
const MAX_DPR = TELE_MAX_DPR;
/** The stage is 400 by 360 drawing units; the canvas keeps that shape. */
export const TELE_STAGE = { w: 400, h: 360 } as const;
/** Sprites are WebP, served from public/tele/ (about 330 KB in all, see docs/performance-budget.md). */
export const TELE_SPRITE_BASE = '/tele/';

export function createTeleDrawing(cv, isCalm, options = {}) {
const base = options.spriteBase ?? TELE_SPRITE_BASE;
const clamp = (v,a,b) => v<a?a:v>b?b:v, clamp01 = v => clamp(v,0,1), lerp = (a,b,t) => a+(b-a)*t;
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* ---------- drawing assets, made once ---------- */
let g = cv.getContext('2d');
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
  tear:{on:false,y:0,v:0,s:0,wait:0}, look:null, speaking:false, question:false, blinkF:1, jacket:true};

/* ---------- sprites cut from the atlas ---------- */
const META = {"tv": {"x": 104, "y": 97, "w": 474, "h": 306}, "screen": {"x": 137, "y": 128, "w": 273, "h": 222}, "sweater": {"x": 93, "y": 440, "w": 378, "h": 404}, "hand_sw_l": {"x": 102, "y": 850, "w": 76, "h": 112}, "hand_sw_r": {"x": 389, "y": 850, "w": 75, "h": 112}, "jacket_l": {"x": 510, "y": 432, "w": 221, "h": 538}, "jacket_r": {"x": 747, "y": 443, "w": 187, "h": 490}, "hand_j_l": {"x": 523, "y": 844, "w": 67, "h": 115}, "hand_j_r": {"x": 865, "y": 843, "w": 70, "h": 119}};
const IMG = {}, KNOB = {};
const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
function makeKnob(ax, ay, r){ // a round crop of one of the set's own dials, so it can turn
  const m = META.tv, d = Math.ceil(r*2)+4, c = document.createElement('canvas'); c.width = c.height = d;
  const x = c.getContext('2d'); x.beginPath(); x.arc(d/2, d/2, r, 0, 7); x.clip();
  x.drawImage(IMG.tv, d/2-(ax-m.x), d/2-(ay-m.y));
  return {c, d, sx:ax-m.x, sy:ay-m.y};
}
['tv','screen','sweater','jacket_l','jacket_r','hand_sw_l','hand_sw_r','hand_j_l','hand_j_r'].forEach(n => loadImg(base+n+'.webp').then(im => {
  IMG[n] = im;
  if (n==='tv' && im){ KNOB.a = makeKnob(487, 266.5, 23); KNOB.b = makeKnob(487, 321.5, 23.5); }
}));
loadImg(base+'clouds.webp').then(im => { IMG.clouds = im; });
['door','mushroom'].forEach(n => loadImg(base+n+'.webp').then(im => { IMG[n] = im; }));

/* ---------- world ---------- */
const WH = 360, FH = 292, VPY = 244;
function drawClouds(now){
  const im = IMG.clouds; if (!im) return;
  const t = isCalm() ? 0 : now;
  g.save(); g.beginPath(); g.rect(0,0,400,FH+4); g.clip();
  // two copies of the cloud sheet turn about a point just above the floor, the nearer one a little faster
  [{size:1040, w:.010, a:.92, p:0}, {size:1400, w:.016, a:.5, p:2.3}].forEach(L => {
    const w = L.size, h = L.size*im.height/im.width;
    g.save(); g.globalAlpha = L.a; g.translate(200, FH-20); g.rotate(L.p + t*L.w);
    g.drawImage(im, -w/2, -h/2, w, h); g.restore();
  });
  g.restore();
}
function drawWorld(f, now){
  const em = S.emo;
  let gr = g.createLinearGradient(0,0,0,FH);
  gr.addColorStop(0, moodColor(HX, em, 0)); gr.addColorStop(1, moodColor(HX, em, 1));
  g.fillStyle = gr; g.fillRect(0,0,400,WH);
  const joy = em.joy||0;
  if (joy > .05){ // rainbow
    const bands = ['#ff6b6b','#ffb36b','#ffe66b','#7be38a','#6bb8ff','#a88bff'];
    g.save(); g.globalAlpha = Math.min(.7, joy*.8); g.lineWidth = 7;
    bands.forEach((c,i) => { g.strokeStyle = c; g.beginPath(); g.arc(200, FH+60, 330-i*7, Math.PI*1.08, Math.PI*1.92); g.stroke(); });
    g.restore();
  }
  drawClouds(now);
  // checkerboard floor running to a vanishing point
  const H = FH, vpy = VPY, fc = moodColor(FX, em);
  g.fillStyle = '#f3ead6'; g.fillRect(0,H,400,WH-H);
  const ys = []; for (let inv = 1/((H-vpy)/(WH-vpy)), k=0; k<12; k++){ const s = 1/Math.max(.9, inv - k*.3); ys.push(vpy + s*(WH-vpy)); }
  ys.unshift(H);
  g.fillStyle = fc;
  for (let r=0; r<ys.length-1; r++){
    const y0 = ys[r], y1 = Math.min(WH, ys[r+1]); if (y0 >= WH) break;
    const s0 = (y0-vpy)/(WH-vpy), s1 = (y1-vpy)/(WH-vpy);
    for (let u=-9; u<9; u++){ if ((u+r)&1) continue;
      g.beginPath(); g.moveTo(200+u*58*s0, y0); g.lineTo(200+(u+1)*58*s0, y0); g.lineTo(200+(u+1)*58*s1, y1); g.lineTo(200+u*58*s1, y1); g.closePath(); g.fill(); }
  }
  gr = g.createLinearGradient(0,H,0,H+40); gr.addColorStop(0,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0,H,400,40);
  // a yellow door onto a garden, and a mushroom with a watching eye
  const d = IMG.door, m = IMG.mushroom;
  if (d){ const w = 50, h = w*d.height/d.width; g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.ellipse(63, H+1, 27, 3, 0, 0, 7); g.fill(); g.drawImage(d, 38, H-h, w, h); }  // on the horizon, partly hidden behind Tele
  if (m){
    const w = 62, h = w*m.height/m.width, x = 318, y = H+36-h;  // brought forward onto the floor
    g.fillStyle = 'rgba(0,0,0,.16)'; g.beginPath(); g.ellipse(x+w/2, H+37, 27, 4.5, 0, 0, 7); g.fill();
    g.drawImage(m, x, y, w, h);
    const bl = 1-Math.max(.15, S.blinkF??1), k = w/m.width;  // eyelid, in the cap's red
    if (bl > .02){ g.fillStyle = '#b5342b'; g.beginPath(); g.ellipse(x+100*k, y+55*k, 44*k, 21*k*bl*1.1, 0, 0, 7); g.fill(); }
  }
  // fear dims the world and makes it flicker
  const dark = (em.fear||0)*.35 + (em.sadness||0)*.12;
  if (dark > .01){ g.fillStyle = `rgba(6,8,20,${clamp01(dark*(isCalm() ? 1 : .85+Math.random()*.3))})`; g.fillRect(0,0,400,WH); }
}

/* ---------- body: stripy turtleneck, with the patchwork jacket over it ---------- */
const BODY = {s:.5, x:200, y:245, ax:282, ay:440, jx:728, jsx:.96, jdy:8, hup:5};
function spr(n, x, y, w, h){ const im = IMG[n]; if (im) g.drawImage(im, x, y, w, h); }
function drawBody(breath){
  const B = BODY, s = B.s;
  g.save(); g.translate(0, breath*.3);
  g.fillStyle = 'rgba(30,20,50,.18)'; g.beginPath(); g.ellipse(200, 522, 84, 7, 0, 0, 7); g.fill();
  const put = n => { const m = META[n]; spr(n, B.x+(m.x-B.ax)*s, B.y+(m.y-B.ay)*s, m.w*s, m.h*s); };
  const hand = (n, jacket) => { const m = META[n]; if (jacket) spr(n, B.x+(m.x-B.jx)*B.jsx*s, B.y+(m.y-B.ay+B.jdy)*s - B.hup, m.w*B.jsx*s, m.h*s); else spr(n, B.x+(m.x-B.ax)*s, B.y+(m.y-B.ay)*s - B.hup, m.w*s, m.h*s); };
  if (S.jacket){ hand('hand_j_l', 1); hand('hand_j_r', 1); } else { hand('hand_sw_l'); hand('hand_sw_r'); }  // hands first, so the cuffs cover their tops
  put('sweater');
  if (S.jacket) for (const n of ['jacket_l','jacket_r']){ const m = META[n]; spr(n, B.x+(m.x-B.jx)*B.jsx*s, B.y+(m.y-B.ay+B.jdy)*s, m.w*B.jsx*s, m.h*s); }
  g.restore();
}

/* ---------- the TV ---------- */
const SX = 104, SY = 115, SW = 192, SH = 142;  // the eye is designed inside this box
const OX = SX-16, OY = SY-16, OW = SW+32, OH = SH+32;  // overlays cover a little more, so any screen shape is filled
const TVS = .64, TV = {x:62, y:70};  // scale and top-left of the TV sprite on the stage
function bez(p0,p1,p2,p3,t){ const u = 1-t; return {x:u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x, y:u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y,
  dx:3*u*u*(p1.x-p0.x)+6*u*t*(p2.x-p1.x)+3*t*t*(p3.x-p2.x), dy:3*u*u*(p1.y-p0.y)+6*u*t*(p2.y-p1.y)+3*t*t*(p3.y-p2.y)}; }
const SCR = document.createElement('canvas');
function renderScreen(f, blinkF, now, sc, hw, hh){
  const pw = Math.max(2, Math.round(hw*sc)), ph = Math.max(2, Math.round(hh*sc));
  if (SCR.width !== pw || SCR.height !== ph){ SCR.width = pw; SCR.height = ph; }
  const main = g; g = SCR.getContext('2d');
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,pw,ph);
  const k = Math.min(hw/SW, hh/SH)*sc;
  g.setTransform(k,0,0,k, pw/2-(SX+SW/2)*k, ph/2-(SY+SH/2)*k);
  drawScreen(f, blinkF, now);
  g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation = 'destination-in'; g.drawImage(IMG.screen, 0, 0, pw, ph); g.globalCompositeOperation = 'source-over';
  g = main;
}
function drawKnob(K, deg){
  if (!K) return;
  const s = K.d*TVS;
  g.save(); g.translate(TV.x+K.sx*TVS, TV.y+K.sy*TVS); g.rotate(deg*Math.PI/180); g.drawImage(K.c, -s/2, -s/2, s, s); g.restore();
}
function drawTV(f, blinkF, now, sc){
  const amp = S.amp, T = META.tv, Sc = META.screen, k = TVS;
  const tw = T.w*k, th = T.h*k;
  // the set's shadow on the collar
  g.save(); g.translate(TV.x+tw/2, TV.y+th+2); g.scale(1,.1);
  let sh = g.createRadialGradient(0,0,6,0,0,tw*.46); sh.addColorStop(0,'rgba(20,10,30,.45)'); sh.addColorStop(1,'rgba(20,10,30,0)');
  g.fillStyle = sh; g.beginPath(); g.arc(0,0,tw*.46,0,7); g.fill(); g.restore();
  // rabbit ears, behind the set
  const base = {x:TV.x+(270-T.x)*k, y:TV.y+5};
  const a0 = (f.antenna >= 0 ? 30-14*f.antenna : 30-46*f.antenna) * Math.PI/180;
  for (const s of [-1,1]){
    const ang = s*a0 + S.ant.w*Math.PI/180, L = 80 - Math.max(0,-f.antenna)*8;
    const tip = {x:base.x+Math.sin(ang)*L, y:base.y-Math.cos(ang)*L};
    const bendX = Math.max(0,-f.antenna)*s*10, bendY = Math.max(0,-f.antenna)*12;
    g.strokeStyle = '#9aa1ad'; g.lineWidth = 3.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(base.x,base.y); g.quadraticCurveTo((base.x+tip.x)/2+bendX, (base.y+tip.y)/2+bendY, tip.x, tip.y); g.stroke();
    g.strokeStyle = '#eef1f6'; g.lineWidth = 1; g.stroke();
    if (amp > .02){ const gl = g.createRadialGradient(tip.x,tip.y,1,tip.x,tip.y,6+16*amp); gl.addColorStop(0,`rgba(255,244,190,${.75*amp})`); gl.addColorStop(1,'rgba(255,244,190,0)'); g.fillStyle = gl; g.beginPath(); g.arc(tip.x,tip.y,6+16*amp,0,7); g.fill(); }
    const bg = g.createRadialGradient(tip.x-1.5,tip.y-1.5,.5,tip.x,tip.y,5.5); bg.addColorStop(0,'#ffffff'); bg.addColorStop(1, amp > .05 ? '#ffd86a' : '#8e95a2');
    g.fillStyle = bg; g.beginPath(); g.arc(tip.x,tip.y,5.5,0,7); g.fill();
  }
  g.fillStyle = '#4a4e57'; g.beginPath(); g.ellipse(base.x, base.y+1, 14, 5, 0, Math.PI, 0); g.fill();
  if (!IMG.tv || !IMG.screen) return;
  // the picture, seen through the glass
  const hw = Sc.w*k, hh = Sc.h*k;
  renderScreen(f, blinkF, now, sc, hw, hh);
  g.drawImage(SCR, TV.x+(Sc.x-T.x)*k, TV.y+(Sc.y-T.y)*k, hw, hh);
  // the casing
  g.drawImage(IMG.tv, TV.x, TV.y, tw, th);
  // dials turn: the upper one changes channel, the lower one is the volume
  drawKnob(KNOB.a, S.knob); drawKnob(KNOB.b, -130 + 260*S.vol);
  // the speaker grille warms with the voice
  if (amp > .02){ g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,170,80,${.34*amp})`; g.fillRect(TV.x+333*k, TV.y+19*k, 75*k, 121*k); g.restore(); }
  // power light
  const lx = TV.x+352*k, ly = TV.y+257*k, on = S.speaking;
  if (on){ g.fillStyle = `rgba(255,80,60,${.25+.4*amp})`; g.beginPath(); g.arc(lx,ly,6,0,7); g.fill(); }
  g.fillStyle = on ? `rgba(255,${60+amp*80|0},48,1)` : '#6a1f1b'; g.beginPath(); g.arc(lx,ly,2.3,0,7); g.fill();
}
function drawScreen(f, blinkF, now){
  const SX = OX, SY = OY, SW = OW, SH = OH;  // overlays and the power-on line cover the whole off-screen picture
  const em = S.emo;
  const jx = isCalm() ? 0 : (Math.random()-.5)*f.jitter*3.2, jy = isCalm() ? 0 : (Math.random()-.5)*f.jitter*1.6;
  g.save(); g.translate(jx, jy);
  // skin
  let gr = g.createRadialGradient(205,178,10,205,186,170);
  gr.addColorStop(0,'#f4d8c8'); gr.addColorStop(.55,'#e2b39d'); gr.addColorStop(1,'#b47e6b');
  g.fillStyle = gr; g.fillRect(SX,SY,SW,SH);
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
  if (f.roll > .05){ const y = SY + ((now*38) % (SH+40)) - 20; g.fillStyle = `rgba(0,0,0,${.22*f.roll})`; g.fillRect(SX, y, SW, 22); g.fillStyle = `rgba(255,255,255,${.08*f.roll})`; g.fillRect(SX, y+22, SW, 4); }
  const st = clamp01(.035 + .14*clamp01(f.static) + S.flash*.9 + (S.power < 1 ? (1-S.power)*.5 : 0));
  g.save(); g.globalAlpha = st; g.imageSmoothingEnabled = false; g.drawImage(NOISE[(now*24|0)%4], SX, SY, SW, SH); g.restore();
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
      g.drawImage(g.canvas, p.x, p.y, p2.x-p.x, bh, p.x+shift, p.y, p2.x-p.x, bh);
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
  // glass: a curved highlight, and a halo round the edge that brightens with the voice
  gr = g.createLinearGradient(SX, SY, SX+SW*.6, SY+SH*.6); gr.addColorStop(0,'rgba(255,255,255,.2)'); gr.addColorStop(.4,'rgba(255,255,255,.04)'); gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(SX+62, SY+38, 92, 34, -.35, 0, 7); g.fill();
  if (S.amp > .02){ g.save(); g.globalCompositeOperation = 'lighter'; gr = g.createRadialGradient(200,186,48,200,186,128); gr.addColorStop(0,'rgba(120,170,255,0)'); gr.addColorStop(1,`rgba(120,170,255,${.5*S.amp})`); g.fillStyle = gr; g.fillRect(SX,SY,SW,SH); g.restore(); }
}


/* ---------- frame loop (inputs are set from outside, not from a clip) ---------- */
let dead = false;
function resize(){
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return false;
  const W = Math.round(w*dpr), H = Math.round(h*dpr);
  if (cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; }
  return true;
}
function frame(ms){
  if (dead) return;
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

  if (!resize()) return;
  const sc = cv.width/400;
  g.setTransform(sc,0,0,sc,0,0); g.imageSmoothingQuality = 'high';
  drawWorld(f, now);
  drawBody(breath);
  g.save();
  g.translate(200, 266 + f.drop*8 + breath - S.emph*2); g.rotate(f.tilt*5*Math.PI/180); g.translate(-200, -266);
  drawTV(f, blinkF, now, sc);
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
  start(){ dead = false; if (!raf) raf = requestAnimationFrame(loop); },
  stop(){ cancelAnimationFrame(raf); raf = 0; S.last = 0; },
  renderOnce(){ frame(performance.now()); },
  setFeelings(v){ for (const e of EMOS) S.target[e] = clamp01(Number(v && v[e]) || 0); },
  setLoudness(n){ S.ampTarget = clamp01(Number(n) || 0); },
  setSpeaking(b){ S.speaking = !!b; },
  setQuestion(b){ S.question = !!b; },
  setJacket(on){ S.jacket = !!on; },
  emphasise(){ S.emph = 1; S.ant.v += 35; },
  /** The dial turns and the picture flashes, like changing channel. */
  channelChange(){ S.flash = 1; S.knobT += 45; },
  lookAt(x, y, ms){ S.look = {x, y, until: performance.now()/1000 + ms/1000}; },
  /** For tests: the settled feelings the picture is showing. */
  current(){ return { ...S.emo }; },
};
}
