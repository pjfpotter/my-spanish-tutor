// Generates ../video/index.html. Run: node build.mjs
import fs from "node:fs";

const DUR = 40.6;
const STEP = 0.125; // line-boil rate (8 fps)

// ---- sketch shots -------------------------------------------------------
// kind: "land" fills the frame, "port" is a portrait page on the desk
const shots = [
  { id: "s1", img: "bus", kind: "port", t: 0, d: 4.4, from: { s: 1.0, x: 0, y: 0 }, to: { s: 1.3, x: 0, y: 0 }, org: "50% 28%" },
  { id: "s2", img: "sofa", kind: "land", t: 4.4, d: 3.8, from: { s: 1.02, x: 40, y: 0 }, to: { s: 1.14, x: -40, y: 0 }, org: "50% 50%" },
  { id: "s3", img: "bedroom", kind: "land", t: 8.2, d: 2.3, from: { s: 1.02, x: 0, y: 0 }, to: { s: 1.18, x: 0, y: 0 }, org: "55% 70%" },
  { id: "sa", img: "sofa", kind: "land", t: 10.5, d: 1.7, from: { s: 1.7, x: 0, y: 0 }, to: { s: 2.0, x: 0, y: 0 }, org: "36% 45%" },
  { id: "sb", img: "bedroom", kind: "land", t: 12.2, d: 1.1, from: { s: 1.8, x: 0, y: 0 }, to: { s: 2.1, x: 0, y: 0 }, org: "52% 70%" },
  { id: "sc", img: "dinner", kind: "land", t: 13.3, d: 2.4, from: { s: 1.3, x: 0, y: 0 }, to: { s: 1.6, x: 0, y: 0 }, org: "75% 42%" },
  { id: "sd", bloom: true, img: "bus", kind: "port", t: 15.7, d: 2.7, from: { s: 1.8, x: 0, y: 0 }, to: { s: 2.4, x: 0, y: 0 }, org: "49% 21%" },
  { id: "se", bloom: true, img: "bus", kind: "port", t: 27.5, d: 6.5, from: { s: 1.15, x: 0, y: 0 }, to: { s: 1.5, x: 0, y: 0 }, org: "49% 24%" },
];

// ---- captions (Win98 window, like the app's caption window) -------------
const caps = [
  { id: "c1", t: 0.55, d: 2.9, who: "Teacher", a: "¿Qué haces en tu tiempo libre?", b: "What do you do in your free time?" },
  { id: "c2", t: 4.7, d: 3.4, who: "Tele", a: "You've been here. Everyone has." },
  { id: "c3", t: 8.45, d: 2.0, who: "Tele", a: "It started with this." },
  { id: "c4", t: 10.6, d: 1.2, who: "Tele", a: "Silent revision." },
  { id: "c5", t: 12.2, d: 1.1, who: "Tele", a: "Lost paper." },
  { id: "c6", t: 13.5, d: 2.0, who: "Tele", a: "Nobody to check the answers." },
  { id: "c7", t: 15.75, d: 2.35, who: "Tele", a: "No wonder they blank." },
  { id: "c8", t: 18.55, d: 2.3, who: "Tele", a: "So we made them something better." },
  { id: "c9", t: 27.85, d: 2.95, hi: true, who: "Teacher", a: "¿Qué haces en tu tiempo libre?", b: "What do you do in your free time?" },
  { id: "c10", t: 29.6, d: 4.2, who: "Student", a: "En mi tiempo libre juego al fútbol y veo vídeos con mis amigos.", b: "In my free time I play football and watch videos with my friends." },
  { id: "c11", t: 34.1, d: 2.6, who: "Tele", a: "Next time? They won't blank." },
];

// ---- voice + sfx ---------------------------------------------------------
const audio = [
  ["v1", "assets/audio/v1.mp3", 0.4, 3.05, 1],
  ["v2", "assets/audio/v2.mp3", 4.5, 3.55, 1],
  ["v3", "assets/audio/v3.mp3", 8.3, 1.88, 1],
  ["v4", "assets/audio/v4.mp3", 10.5, 7.47, 1],
  ["v5", "assets/audio/v5.mp3", 18.4, 8.83, 1],
  ["v1b", "assets/audio/v1.mp3", 27.7, 3.05, 1],
  ["v6b", "assets/audio/v6b.mp3", 29.5, 4.05, 1],
  ["v7", "assets/audio/v7.mp3", 34.0, 4.28, 1],
  ["x1", "assets/sfx/tele-correct-2.mp3", 18.35, 1.0, 0.5],
  ["x2", "assets/sfx/tap-1.mp3", 21.13, 1, 0.8],
  ["x3", "assets/sfx/tap-2.mp3", 22.26, 1, 0.8],
  ["x4", "assets/sfx/tap-3.mp3", 23.32, 1, 0.8],
  ["x5", "assets/sfx/combo-1.mp3", 24.2, 2, 0.6],
  ["x6", "assets/sfx/correct-3.mp3", 25.3, 1.5, 0.7],
  ["x7", "assets/sfx/personal-best.mp3", 26.5, 3, 0.7],
  ["x8", "assets/sfx/correct-1.mp3", 36.9, 1.5, 0.6],
];

const env5 = JSON.parse(fs.readFileSync("../video/assets/env-v5.json", "utf8"));
const env7 = JSON.parse(fs.readFileSync("../video/assets/env-v7.json", "utf8"));

// ---- html pieces ---------------------------------------------------------
const shotHtml = shots
  .map(
    (s) => `
    <div id="${s.id}" class="clip shot" data-start="${s.t}" data-duration="${s.d}" style="z-index:${2 + shots.indexOf(s)}">
      <div class="page ${s.kind}" style="transform-origin:${s.org}">
        <img class="b b0" src="assets/img/${s.img}.jpg" alt="" style="filter:url(#boil0)">
        <img class="b b1" src="assets/img/${s.img}.jpg" alt="" style="filter:url(#boil1)">
        <img class="b b2" src="assets/img/${s.img}.jpg" alt="" style="filter:url(#boil2)">
        ${s.bloom ? `<div id="bloom-${s.id}" class="bloom"></div>` : ""}
      </div>
    </div>`
  )
  .join("\n");

const capHtml = caps
  .map(
    (c) => `
    <div id="${c.id}" class="clip cap" data-start="${c.t}" data-duration="${c.d}">
      <div class="win${c.hi ? " hi" : ""}">
        <div class="tb"><span>${c.who}</span><i></i><i></i></div>
        <div class="bd"><p class="t1${c.b ? " es" : ""}">${c.a}</p>${c.b ? `<p class="t2">${c.b}</p>` : ""}</div>
      </div>
    </div>`
  )
  .join("\n");

const audioHtml = audio
  .map(
    ([id, src, t, d, v]) =>
      `<audio id="${id}" src="${src}" data-start="${t}" data-duration="${d}" data-volume="${v}" data-track-index="${id.startsWith("x") ? 11 : 10}"></audio>`
  )
  .join("\n    ");

const stage = (id) => `
        <div id="${id}" class="tele">
          <img class="tn" src="assets/tele/stage-neutral.png" alt="">
          <img class="tj" src="assets/tele/stage-joy.png" alt="">
          <div class="glow g-screen"></div><div class="glow g-ant1"></div><div class="glow g-ant2"></div>
        </div>`;

const phone = (id, file) => `
        <div id="${id}" class="phone"><div class="pin"><img src="assets/screens/${file}" alt=""></div></div>`;

const html = `<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <title>Blank - My Spanish Tutor promo</title>
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Fredoka"; src: url("assets/fonts/Fredoka.woff2") format("woff2"); font-weight: 600; }
      @font-face { font-family: "Pixelify Sans"; src: url("assets/fonts/PixelifySans.woff2") format("woff2"); font-weight: 500; }
      :root {
        --desk: #231a15;
        --navy: #0b2a4a;
        --cream: #f4f4d0;
        --pink: #ff5fa8;
        --lemon: #ffeb00;
        --grey: #c0c0c0;
        --font-display: "Fredoka", sans-serif;
        --font-pixel: "Pixelify Sans", monospace;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--desk); }
      #root { position: absolute; inset: 0; overflow: hidden;
        background: repeating-linear-gradient(92deg, #2a2019 0 38px, #261d17 38px 41px, #2d221a 41px 90px), var(--desk); }
      .shot { position: absolute; inset: 0; }
      .page { position: absolute; }
      .page.land { inset: 0; }
      .page.port { left: 555px; top: 0; width: 810px; height: 1080px; box-shadow: 0 30px 90px rgba(0,0,0,.7); }
      .b { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; }
      .b0 { opacity: 1; }

      #vig { position: absolute; inset: 0; z-index: 30; pointer-events: none;
        background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.5) 100%); }
      #grain { position: absolute; inset: 0; z-index: 31; pointer-events: none; opacity: .09; mix-blend-mode: multiply;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>"); }

      .bloom { position: absolute; inset: 0; z-index: 3; mix-blend-mode: multiply; pointer-events: none;
        background:
          radial-gradient(circle at 30% 30%, #ff5fa8 0, rgba(255,95,168,0) 42%),
          radial-gradient(circle at 75% 25%, #00e5e5 0, rgba(0,229,229,0) 40%),
          radial-gradient(circle at 70% 75%, #ffeb00 0, rgba(255,235,0,0) 50%),
          #bfe3ff; }

      /* ---- app world ---- */
      .app { position: absolute; inset: 0; z-index: 40; overflow: hidden;
        background: linear-gradient(180deg, #4fa9f0 0%, #9ad6ff 55%, #ddf3ff 100%); }
      .tele { position: absolute; left: 0; top: 0; transform-origin: 0 0; width: 1216px; height: 1098px; border-radius: 48px; overflow: hidden;
        box-shadow: 0 24px 70px rgba(11,42,74,.45); border: 6px solid var(--navy); }
      .tele img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
      .tele .tj { opacity: 0; }
      .glow { position: absolute; border-radius: 50%; opacity: 0; mix-blend-mode: screen; pointer-events: none; }
      .g-screen { left: 21%; top: 24%; width: 44%; height: 40%;
        background: radial-gradient(ellipse, rgba(255,240,170,.95) 0, rgba(255,210,120,.5) 45%, rgba(255,200,100,0) 72%); }
      .g-ant1 { left: 33.5%; top: -2%; width: 5%; height: 5.5%; background: radial-gradient(circle, #fff 0, rgba(255,255,255,0) 70%); }
      .g-ant2 { left: 49%; top: -2%; width: 5%; height: 5.5%; background: radial-gradient(circle, #fff 0, rgba(255,255,255,0) 70%); }

      .phone { position: absolute; left: 1210px; top: 112px; width: 480px; height: 856px; border-radius: 44px; background: #10151c;
        padding: 12px; box-shadow: 0 30px 80px rgba(11,42,74,.5), 0 0 0 4px #0b2a4a; opacity: 0; }
      .pin { position: relative; width: 100%; height: 100%; border-radius: 34px; overflow: hidden; background: #dff3ff; }
      .pin img { position: absolute; left: 0; top: -62px; width: 456px; height: auto; }

      .word { position: absolute; left: 150px; font-family: var(--font-display); font-weight: 600; font-size: 168px; line-height: 1;
        color: var(--cream); -webkit-text-stroke: 10px var(--navy); paint-order: stroke fill;
        text-shadow: 10px 10px 0 var(--pink); white-space: nowrap; opacity: 0; }
      #w1 { top: 70px; } #w2 { top: 250px; } #w3 { top: 430px; }
      #w4 { top: 270px; font-size: 150px; white-space: normal; width: 920px; line-height: 1.08; }

      .endcard { position: absolute; left: 1090px; top: 250px; width: 770px; opacity: 0; }
      .win.hi { bottom: auto; top: 200px; left: 1290px; width: 560px; }
      .win.hi .t1 { font-size: 40px; }
      .win.hi .t2 { font-size: 28px; }
      .endcard .win { width: 100%; }
      .endcard h1 { font-family: var(--font-display); font-weight: 600; font-size: 92px; line-height: 1.02; color: var(--navy); }
      .endcard h1 em { font-style: normal; color: #ff1fa9; }
      .endcard p { font-family: var(--font-display); font-weight: 600; font-size: 46px; color: var(--navy); margin-top: 14px; }

      /* ---- Win98 caption window ---- */
      .cap { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; z-index: 60; pointer-events: none; }
      .win { position: absolute; left: 380px; bottom: 112px; width: 1160px; background: var(--grey);
        border: 4px solid #fff; border-right-color: #404040; border-bottom-color: #404040; box-shadow: 14px 14px 0 rgba(11,42,74,.5); }
      .tb { height: 44px; display: flex; align-items: center; gap: 8px; padding: 0 12px;
        background: linear-gradient(90deg, #000080, #0a5cc0); color: var(--cream); font-family: var(--font-pixel); font-size: 28px; }
      .tb span { flex: 1; }
      .tb i { width: 28px; height: 28px; background: var(--grey); border: 3px solid #fff; border-right-color: #404040; border-bottom-color: #404040; }
      .bd { background: #fff; margin: 8px; padding: 18px 28px 22px; border: 3px solid #404040; border-right-color: #fff; border-bottom-color: #fff; }
      .bd .t1 { font-family: var(--font-display); font-weight: 600; font-size: 54px; line-height: 1.12; color: var(--navy); }
      .bd .t1.es { font-size: 48px; }
      .bd .t2 { font-family: var(--font-display); font-weight: 600; font-size: 32px; line-height: 1.2; color: #4a5a6a; margin-top: 8px; }
      .win.hi { bottom: auto; top: 200px; left: 1290px; width: 560px; }
      .win.hi .t1 { font-size: 40px; }
      .win.hi .t2 { font-size: 28px; }
      .endcard .win { position: relative; left: 0; bottom: 0; }
      #flash { position: absolute; inset: 0; z-index: 35; background: #fff; opacity: 0; pointer-events: none; }
    </style>
  </head>
  <body>
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <filter id="boil0" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/></filter>
      <filter id="boil1" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/></filter>
      <filter id="boil2" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="27" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/></filter>
    </svg>

    <div id="root" data-composition-id="main" data-start="0" data-duration="${DUR}" data-width="1920" data-height="1080">
${shotHtml}

      <div id="vig" class="clip" data-start="0" data-duration="${DUR}"></div>
      <div id="grain" class="clip" data-start="0" data-duration="${DUR}"></div>
      <div id="flash" class="clip" data-start="0" data-duration="${DUR}"></div>

      <div id="app5" class="clip app" data-start="18.2" data-duration="9.3">
${stage("tele5")}
        <div id="w1" class="word">Hear it.</div>
        <div id="w2" class="word">Say it.</div>
        <div id="w3" class="word">Again.</div>
        <div id="w4" class="word">Until it’s automatic.</div>
${phone("p1", "04-hear-playing.png")}
${phone("p2", "07-memorise-listening.png")}
${phone("p3", "11-round-summary.png")}
${phone("p4", "14-rewards.png")}
      </div>

      <div id="app7" class="clip app" data-start="33.95" data-duration="${(DUR - 33.95).toFixed(2)}">
${stage("tele7")}
        <div id="endcard" class="endcard">
          <div class="win">
            <div class="tb"><span>my_spanish_tutor.exe</span><i></i><i></i></div>
            <div class="bd"><h1>My Spanish <em>Tutor</em></h1><p>Hear it. Say it. Again.</p></div>
          </div>
        </div>
      </div>
${capHtml}

    ${audioHtml}
    </div>

    <script>
      const tl = gsap.timeline({ paused: true });
      const E5 = ${JSON.stringify(env5)};
      const E7 = ${JSON.stringify(env7)};
      const shots = ${JSON.stringify(shots)};

      // line boil: step through three redraws of each sketch at 8 fps
      shots.forEach((s) => {
        const n = Math.floor(s.d / ${STEP});
        for (let i = 0; i < n; i++) {
          const t = s.t + i * ${STEP};
          const on = (i * 2 + (i % 3)) % 3 === 0 ? 0 : i % 3; // irregular order so it reads hand-drawn
          for (let k = 0; k < 3; k++) tl.set("#" + s.id + " .b" + k, { opacity: k === on ? 1 : 0 }, t);
        }
        // slow push / drift
        tl.fromTo("#" + s.id + " .page", { scale: s.from.s, x: s.from.x, y: s.from.y },
          { scale: s.to.s, x: s.to.x, y: s.to.y, duration: s.d, ease: "none" }, s.t);
        // cut punch
        tl.fromTo("#" + s.id + " .page", { rotation: -0.8 }, { rotation: 0, duration: 0.25, ease: "power2.out" }, s.t);
      });

      // paper flash on the cuts
      [4.4, 8.2, 10.5, 12.2, 13.3, 15.7, 27.5].forEach((t) => {
        tl.fromTo("#flash", { opacity: 0.45 }, { opacity: 0, duration: 0.18, ease: "power1.out", immediateRender: false }, t);
      });

      // captions
      ${JSON.stringify(caps.map((c) => c.id))}.forEach((id) => {
        tl.fromTo("#" + id + " .win", { scale: 0.92, y: 18, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.16, ease: "back.out(2)" }, parseFloat(document.getElementById(id).dataset.start));
      });

      // the blank: after the teacher's question, the page drains and shakes
      tl.to("#s1 .page", { x: 6, duration: 0.05, repeat: 5, yoyo: true, ease: "none" }, 3.5);

      // colour bleed 1: sketch -> app
      tl.fromTo("#bloom-sd", { clipPath: "circle(0px at 50% 22%)" }, { clipPath: "circle(1100px at 50% 22%)", duration: 1.0, ease: "power2.in" }, 17.3);
      tl.fromTo("#app5", { clipPath: "circle(0px at 50% 50%)" }, { clipPath: "circle(1300px at 50% 50%)", duration: 0.9, ease: "power2.out" }, 18.2);

      // colour bleed 2: Dolores gets coloured in as they answer
      tl.fromTo("#bloom-se", { clipPath: "circle(0px at 50% 30%)" }, { clipPath: "circle(1000px at 50% 30%)", duration: 3.2, ease: "power1.inOut" }, 27.9);

      // ---- Tele, app section 1 ----
      tl.set("#tele5 .tj", { opacity: 1 }, 18.4);
      tl.set("#tele5 .tn", { opacity: 0 }, 18.4);
      tl.fromTo("#tele5", { x: 352, y: -9, scale: 0.99 }, { x: 352, y: -9, scale: 1.0, duration: 2.6, ease: "none" }, 18.2);
      // tele moves to a corner badge on "Hear it"
      tl.to("#tele5", { x: 90, y: 650, scale: 0.27, duration: 0.5, ease: "power3.inOut" }, 20.85);
      // words + phones on the beats of V5 (+18.4 s)
      const beat = (w, p, t) => {
        tl.fromTo(w, { opacity: 0, x: -120 }, { opacity: 1, x: 0, duration: 0.22, ease: "back.out(2.2)" }, t);
        if (p) tl.fromTo(p, { opacity: 0, y: 90, scale: 0.9, rotation: 2 }, { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.3, ease: "back.out(1.8)" }, t);
      };
      beat("#w1", "#p1", 21.13);
      beat("#w2", "#p2", 22.26);
      tl.set("#p1", { opacity: 0 }, 22.26);
      beat("#w3", "#p3", 23.32);
      tl.set("#p2", { opacity: 0 }, 23.32);
      // "Until it's automatic": clear the list, one big line
      tl.to(["#w1", "#w2", "#w3"], { opacity: 0, x: -200, duration: 0.2, ease: "power2.in" }, 25.15);
      tl.set("#p3", { opacity: 0 }, 25.3);
      tl.fromTo("#w4", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, 25.25);
      tl.fromTo("#p4", { opacity: 0, y: 90, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(1.6)" }, 25.3);

      // Tele glows with the voice loudness (V5 from 18.4 s)
      E5.forEach((v, i) => {
        const t = 18.4 + i / 30;
        tl.set("#tele5 .glow", { opacity: v }, t);
      });
      tl.set("#tele5 .glow", { opacity: 0 }, 27.3);

      // ---- Tele, closing ----
      tl.set("#tele7 .tj", { opacity: 1 }, 35.2);
      tl.fromTo("#tele7", { x: 60, y: -9, scale: 0.99 }, { x: 60, y: -9, scale: 1.0, duration: 2.8, ease: "none" }, 33.95);
      tl.to("#tele7", { x: 40, y: 100, scale: 0.8, duration: 0.6, ease: "power3.inOut" }, 36.9);
      tl.fromTo("#endcard", { opacity: 0, y: 60, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.7)" }, 37.2);
      E7.forEach((v, i) => {
        const t = 34.0 + i / 30;
        tl.set("#tele7 .glow", { opacity: v }, t);
      });
      tl.set("#tele7 .glow", { opacity: 0 }, 38.3);

      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

fs.writeFileSync("../video/index.html", html);
console.log("written", html.length);
