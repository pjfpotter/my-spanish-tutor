const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await (await b.newContext({ viewport: { width: 340, height: 640 } })).newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.env.PROTO_HTML);
  await p.waitForTimeout(2300);
  const txt = (sel) => p.evaluate((s) => document.querySelector(s).innerText.replace(/\s+/g, ' '), sel);
  const pick = async (es, col) => { const r = await p.evaluate(([es, col]) => { const all=[...document.querySelectorAll('#paper .cell[data-col]')].filter(c=>c.querySelector('.es').childNodes[0].textContent===es && (!col||c.dataset.col===col)); const el=all.find(c=>c.getAttribute('aria-disabled')!=='true')||all[0]; if(!el) return 'NOCELL'; el.click(); return el.getAttribute('aria-disabled')==='true'?('BLOCKED: '+el.dataset.why):'ok'; }, [es, col]); await p.waitForTimeout(700); return r; };
  const open = async (i) => { await p.evaluate(() => window.__proto.goList()); await p.click(`[data-q="${i}"]`); await p.waitForTimeout(1500); };
  const sheetH = () => p.evaluate(() => Math.round(document.getElementById('sheetView').getBoundingClientRect().height));
  const say = async (l) => console.log(l.padEnd(34), '|', await txt('#said'));
  // FREE TIME
  await open(0);
  await pick('Me gusta'); await pick('jugar al baloncesto'); await pick('dado que'); await pick('es divertido');
  await say('basic sentence'); console.log('   chips:', await txt('#lines'), '| sheet height', await sheetH());
  await p.screenshot({ path: 'w1.png' });
  await p.click('[data-more]'); await p.waitForTimeout(300); console.log('   menu:', await txt('#moreMenu'));
  await p.screenshot({ path: 'w2.png' });
  await p.evaluate(() => document.querySelector('#moreMenu [data-act="contrast"]').click()); await p.waitForTimeout(800);
  console.log('   active contrast; porque tap:', await pick('porque'));
  console.log('   already-used dado que tap:', await pick('dado que'));
  console.log('   sin embargo:', await pick('sin embargo'));
  console.log('   Odio now:', await pick('Odio'));
  await say('after contrast opinion');
  await p.click('[data-more]'); await p.waitForTimeout(200);
  console.log('   menu now:', await txt('#moreMenu'));
  await p.evaluate(() => document.querySelector('#moreMenu [data-act="glue"]').click()); await p.waitForTimeout(700);
  console.log('   pero w/o contrast? (starter2 present so allowed)', await pick('pero'));
  await p.screenshot({ path: 'w3.png' });
  // restart free: lohago before when
  await p.evaluate(() => document.getElementById('resetBtn').click()); await open(0);
  await pick('Me encanta'); await pick('jugar al baloncesto'); await pick('dado que'); await pick('es divertido');
  await p.click('[data-more]'); await p.evaluate(() => document.querySelector('#moreMenu [data-act="glue"]').click()); await p.waitForTimeout(700);
  console.log('pero (positive sentence):', await pick('pero'));
  console.log('y:', await pick('y'));
  console.log('Lo hacemos:', await pick('Lo hacemos')); console.log('una vez a la semana:', await pick('una vez a la semana')); console.log('mis primos:', await pick('mis primos'));
  await say('final'); console.log('   chips:', await txt('#lines')); await p.screenshot({ path: 'w4a.png' }); console.log(await p.evaluate(() => { const c=document.getElementById('cardArea'), a=document.getElementById('acard'); const r=(e)=>{const b=e.getBoundingClientRect();return [Math.round(b.top),Math.round(b.height)]}; return JSON.stringify({cardArea:r(c),acard:r(a),lines:r(document.getElementById('lines')),tools:r(document.getElementById('tools')),said:r(document.getElementById('said')),sub:r(document.getElementById('sub')),scrollH:c.scrollHeight,clientH:c.clientHeight}); }));
  await p.click('#checkBtn'); await p.waitForTimeout(1500); console.log('   result:', await txt('#result'));
  await p.screenshot({ path: 'w4.png' });
  // WEAR list
  await open(5);
  await pick('voy a llevar'); await pick('un jersey'); await pick('rojo'); await pick('vaqueros'); await pick('azules'); await pick('zapatillas de deporte'); await pick('blancas');
  await say('wear list'); console.log('   en:', await txt('#sub'));
  // BEDROOM fragments
  await open(6);
  await pick('Me gusta mi dormitorio porque es'); await pick('bastante');
  await say('bedroom fragment'); await p.click('#checkBtn'); await p.waitForTimeout(1300); console.log('   result:', await txt('#result'));
  await p.screenshot({ path: 'w5.png' });
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
