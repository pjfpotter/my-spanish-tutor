const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 340, height: 640 } })).newPage();
  await p.goto('file://' + process.env.PROTO_HTML);
  await p.waitForTimeout(2500);
  const out = await p.evaluate(() => {
    const P = window.__proto, QS = P.QS(), rows = [];
    let seed = 7; const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (const q of QS) {
      const b = P.BUILDERS[q.builder], seen = new Set(), list = [];
      let guard = 0;
      while (list.length < 12 && guard++ < 4000) {
        const a = {}; let dead = false;
        for (let step = 0; step < 30; step++) {
          const opts = [];
          for (const s of b.slots) { if (a[s.key] || (q.blocks && s.block != null && !q.blocks.includes(s.block))) continue; const fit = P.slotFits(b, a, s.key, q); if (fit.length) opts.push([s, fit]); }
          if (!opts.length) break;
          const [s, fit] = opts[rnd(opts.length)]; let it = fit[rnd(fit.length)]; if (it.choice) it = P.derive(it, rnd(it.choice.length)); a[s.key] = it;
          if (P.isReady(b, a, q) && rnd(100) < 25) break;
        }
        if (!P.isReady(b, a, q)) continue;
        if (b.together.some((g) => g.some((k) => a[k]) && !g.every((k) => a[k]))) continue;
        const es = P.compose(b, a, 'es', q); if (seen.has(es)) continue; seen.add(es);
        const odd = P.oddCheck(b, a);
        list.push((odd ? '[odd-flag] ' : '') + es + '   ||   ' + P.compose(b, a, 'en', q));
      }
      rows.push(`\n## ${q.es}\n` + list.map((x, i) => `${i + 1}. ${x}`).join('\n'));
    }
    return rows.join('\n');
  });
  console.log(out);
  await b.close();
})();
