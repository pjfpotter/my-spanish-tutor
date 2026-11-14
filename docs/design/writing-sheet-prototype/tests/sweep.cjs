const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 340, height: 640 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.env.PROTO_HTML);
  await p.waitForTimeout(2500);
  const res = await p.evaluate(() => {
    const P = window.__proto, out = {};
    const PROPER = /\b(Skype|Zoom|España|Francia|Italia|Estados Unidos|SMS)\b/;
    const lintEs = (t) => { const f = []; if (/\s{2,}/.test(t)) f.push('double space'); if (/\b(\p{L}+) \1\b/iu.test(t)) f.push('repeated word'); if (/\b(de|a) el\b/i.test(t)) f.push('de el / a el'); if (/[.!?] \p{Ll}/u.test(t)) f.push('sentence starts lowercase'); const tt = t.replace(PROPER, 'X'); if (/(?<=\p{Ll}) \p{Lu}\p{Ll}/u.test(tt)) f.push('stray capital'); if (/…|,\.|\.\./.test(t)) f.push('placeholder/punctuation'); if (/\/a\b/.test(t)) f.push('unresolved o/a'); return f; };
    const lintEn = (t) => { const f = []; if (/\s{2,}/.test(t)) f.push('double space'); if (/\b(\w+) \1\b/i.test(t)) f.push('repeated word'); if (/\ba [aeiou]/i.test(t)) f.push('a before vowel'); if (/\ban [^aeiou\s]/i.test(t)) f.push('an before consonant'); if (/[áéíóúñ¿¡]/i.test(t)) f.push('Spanish left in English'); if (/…/.test(t)) f.push('placeholder'); if (/\bI go\b|\bI take\b/.test(t) && /\blast|ayer|\bwent\b/.test(t)) f.push('tense'); return f; };
    for (const b of Object.values(P.BUILDERS)) {
      const R = { b: b.name, slots: b.slots.length, items: 0, space: 1, pairsTotal: 0, pairsBlocked: 0, pairsAllowed: 0, lints: {}, ex: {}, itemLints: {}, itemEx: {}, rtFail: 0, rtN: 0, rtEx: [], triples: 0 };
      const note = (k, ex, bag, exBag) => { bag[k] = (bag[k] || 0) + 1; (exBag[k] = exBag[k] || []).length < 3 && exBag[k].push(ex); };
      // item-level lints
      const PAST = /^(fui|fue|hice|comí|llovió|hizo|lo pasé|me gustó|me encantó)\b/i, PASTEN = /\b(went|was|were|did|ate|rained|had|liked|loved|made|spent|it was|I ate|I did)\b/i;
      b.columns.filter((c) => !c.static).forEach((c) => c.items.forEach((it) => {
        R.items++;
        const en = it.enFix != null ? it.enFix : it.en;
        if (en == null) note('no English at all', `${c.key}: ${it.es}`, R.itemLints, R.itemEx);
        else { if (it.enFix == null && PAST.test(it.es) && !PASTEN.test(en)) note('gloss tense does not match Spanish', `${it.es} = ${en}`, R.itemLints, R.itemEx); if (/[=\[\]]/.test(en)) note('stray symbols in English', `${it.es} = ${en}`, R.itemLints, R.itemEx); }
        if (it.enFix != null && it.enFix !== it.en) note('English corrected by review layer', `${it.es}: “${it.en}” → “${it.enFix}”`, R.itemLints, R.itemEx);
        if (/[A-Z]/.test(it.es.slice(1)) && !PROPER.test(it.es)) note('capital inside chunk', it.es, R.itemLints, R.itemEx);
      }));
      for (const q of b.questions) {
        const slots = b.slots.filter((s) => !(q.blocks && s.block != null && !q.blocks.includes(s.block)));
        R.space *= 1; let space = 1; slots.forEach((s) => { space *= P.slotItems(b, s).length + 1; }); R.space = Math.max(R.space, space);
        const fillDeps = (a, k) => { const sd = b.slotMap[k]; if (sd.after && !a[sd.after]) { fillDeps(a, sd.after); const fit = P.slotFits(b, a, sd.after, q); if (fit.length) a[sd.after] = fit[0].choice ? P.derive(fit[0], 0) : fit[0]; } };
        const complete = (a) => { for (const k of (q.required || b.required)) if (!a[k]) { fillDeps(a, k); const fit = P.slotFits(b, a, k, q); if (fit.length) a[k] = fit[0].choice ? P.derive(fit[0], 0) : fit[0]; } if (b.requiredAny && !P.isReady(b, a, q)) { const g = b.requiredAny[0]; g.forEach((k) => { if (!a[k]) { fillDeps(a, k); const fit = P.slotFits(b, a, k, q); if (fit.length) a[k] = fit[0]; } }); } };
        const exp = (it) => (it.choice ? it.choice.map((_, vi) => P.derive(it, vi)) : [it]);
        for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
          const A = slots[i], B2 = slots[j];
          for (const ia of P.slotItems(b, A).flatMap(exp)) for (const ib of P.slotItems(b, B2).flatMap(exp)) {
            R.pairsTotal++;
            const a = {};
            fillDeps(a, A.key); if (P.clash(b, a, A.key, ia, q)) { R.pairsBlocked++; continue; } a[A.key] = ia;
            fillDeps(a, B2.key); if (P.clash(b, a, B2.key, ib, q)) { R.pairsBlocked++; continue; } a[B2.key] = ib;
            R.pairsAllowed++;
            complete(a);
            const es = P.compose(b, a, 'es', q), en = P.compose(b, a, 'en', q);
            lintEs(es).forEach((f) => note('Spanish: ' + f, es, R.lints, R.ex)); lintEn(en).forEach((f) => note('English: ' + f, en + '  ⇐  ' + es, R.lints, R.ex));
            const partial = b.together.some((g) => g.some((k) => a[k]) && !g.every((k) => a[k]));
            if (!partial) { R.rtN++; const pr = P.parseText(b, es), again = P.compose(b, pr.ans, 'es', q); if (again !== es || pr.off.length || pr.fixes.length) { R.rtFail++; if (R.rtEx.length < 4) R.rtEx.push(es + '  ⇒  ' + again); } }
          }
        }
        // triples used by polarity rules
        for (const rule of b.rules.pol || []) {
          const ks = [rule.s, rule.c, rule.r].filter(Boolean); if (ks.some((k) => !b.slotMap[k])) continue;
          const lists = ks.map((k) => P.slotItems(b, b.slotMap[k]));
          const rec = (n, a) => { if (n === ks.length) { R.triples++; return; } for (const it of lists[n]) rec(n + 1, a); };
          rec(0, {});
        }
      }
      out[b.name] = R;
    }
    return out;
  });
  let tot = { pairs: 0, allowed: 0, blocked: 0 };
  for (const [k, R] of Object.entries(res)) {
    tot.pairs += R.pairsTotal; tot.allowed += R.pairsAllowed; tot.blocked += R.pairsBlocked;
    console.log(`\n=== ${k}: ${R.items} chunks, ${R.slots} slots. Upper bound on distinct answers: ${R.space.toExponential(2)}. Item pairs: ${R.pairsTotal} (engine blocks ${R.pairsBlocked}, allows ${R.pairsAllowed}); triples under polarity rules: ${R.triples}`);
    console.log(`   typed round-trip on allowed pairs: ${R.rtN - R.rtFail}/${R.rtN}${R.rtEx.length ? '\n     e.g. ' + R.rtEx.join('\n     e.g. ') : ''}`);
    for (const [c, n] of Object.entries(R.itemLints)) console.log(`   [chunk] ${c}: ${n}   e.g. ${R.itemEx[c].join(' | ')}`);
    for (const [c, n] of Object.entries(R.lints)) console.log(`   [sentence] ${c}: ${n}   e.g. ${R.ex[c].join(' | ')}`);
  }
  console.log('\nTOTAL pairs', tot, 'ERR', errs);
  await b.close();
})();
