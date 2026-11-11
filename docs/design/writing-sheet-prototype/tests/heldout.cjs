const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 340, height: 640 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.PROTO_HTML);
  await p.waitForTimeout(2000);
  const dir = process.env.SHEETS_DIR + '/';
  for (const pre of ['ccf5a4ae', '3c6279f4', '3c6ad2bf']) {
    const f = fs.readdirSync(dir).find(x => x.startsWith(pre));
    const b64 = fs.readFileSync(dir + f).toString('base64');
    const out = await p.evaluate((b64) => {
      const P = window.__proto; const sh = P.parseDocx(P.b64(b64));
      const cells = sh.tables.map(t => t.cells.filter(c => c.items.length).map(c => `${c.id}[${c.rs}x${c.cs}] n=${c.items.length}: ` + c.items.slice(0, 40).map(i => `${i.es}${i.en ? ' = ' + i.en : ' = ∅'}`).join(' ; ')));
      return JSON.stringify({ stats: sh.stats, warnings: sh.warnings, titles: sh.titles, floats: sh.floats.map(f => f.items.map(i => i.es + '=' + i.en)), cells }, null, 1);
    }, b64);
    console.log('#####', f); console.log(out.slice(0, 5500));
  }
  console.log('ERR', errs);
  await b.close();
})();
