const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 340, height: 640 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.PROTO_HTML);
  await p.waitForTimeout(2200);
  const dir = process.env.SHEETS_DIR + '/';
  for (const pre of ['ccf5a4ae', '3c6279f4', '3c6ad2bf']) {
    const f = fs.readdirSync(dir).find(x => x.startsWith(pre));
    await p.setInputFiles('#upload', dir + f); await p.waitForTimeout(2500);
    const out = await p.evaluate(() => {
      const P = window.__proto, b = P.BUILDERS.custom, q = P.QS().filter(x => x.builder === 'custom')[0];
      const r = P.analyse(b, 340);
      // sample 12 random complete answers
      let seed = 5; const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
      const ex = [];
      for (let g = 0; g < 300 && ex.length < 6; g++) {
        const a = {};
        for (let st = 0; st < 30; st++) { const opts = []; for (const s of b.slots) { if (a[s.key]) continue; const fit = P.slotFits(b, a, s.key, q); if (fit.length) opts.push([s, fit]); } if (!opts.length) break; const [s, fit] = opts[rnd(opts.length)]; let it = fit[rnd(fit.length)]; if (it.choice) it = P.derive(it, 0); a[s.key] = it; if (P.isReady(b, a, q) && rnd(100) < 30) break; }
        if (P.isReady(b, a, q) && !P.fragment(b, a, q)) ex.push(P.compose(b, a, 'es', q) + '   ||   ' + P.compose(b, a, 'en', q));
      }
      return { name: b.name, slots: b.slots.length, warns: r.warns, notes: r.notes, rt: `${r.R.rtN - r.R.rtFail}/${r.R.rtN}`, dead: r.R.deadReq, ex };
    });
    console.log('#####', f.slice(9)); console.log(JSON.stringify({ slots: out.slots, roundTrip: out.rt, deadEnds: out.dead, warns: out.warns }), '\n' + out.ex.map((e, i) => `  ${i + 1}. ${e}`).join('\n'));
  }
  console.log('ERR', errs); await b.close();
})();
