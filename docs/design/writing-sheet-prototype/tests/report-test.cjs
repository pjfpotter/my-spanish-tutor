const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await (await b.newContext({ viewport: { width: 340, height: 640 } })).newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.env.PROTO_HTML);
  await p.waitForTimeout(3000);
  console.log(await p.evaluate(() => [...document.querySelectorAll('#log li')].map(l => l.textContent).join('\n')));
  console.log('SUM', await p.evaluate(() => document.getElementById('reportSum').textContent));
  console.log(await p.evaluate(() => [...document.querySelectorAll('#report details')].map(d => d.innerText.replace(/\n+/g, '\n  ')).join('\n---\n')));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
