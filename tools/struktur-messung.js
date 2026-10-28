// Strukturmessung fuer index.html (Plan Auslagern, docs/ideen-und-planung.md): zerlegt den Skriptteil mit dem in Node eingebauten Parser acorn
// und misst, was ein Bereich von start() aus dem Rest braucht (freie Namen) und was er dem Rest liefert. Nur Messung, nichts wird veraendert.
// Aufruf (Projektordner):  node --expose-internals tools/struktur-messung.js <Befehl> [Zeile von] [Zeile bis]
//   ebene             Anweisungen auf oberster Ebene des Skripts und die Groesse von start()
//   gross [Byte]      Anweisungen im Rumpf von start() ab Byte (Standard 2500) mit Zeile und Groesse
//   baender           Groesse je Zeilenband (Karten, Vertrag, Zustand, Polizei, Netz, Zeichnen ...)
//   bereich von bis   Abhaengigkeiten der Anweisungen, die in den Zeilen von bis beginnen: braucht (const, Funktion, let, von dem Bereich beschrieben), liefert, von aussen beschrieben
//   namen von bis [von bis ...]  wie bereich fuer mehrere Zeilenbereiche, aber mit Zaehlung der Verweise je Name (die Kontextgroesse einer Fabrik mkXxx(X))
// Grenzen: Die Zuordnung ist grob, Namen, die im Bereich auch als lokale Variable vorkommen (p, d, g, R, H, st, cs ...), stehen als KOLLISION und sind von Hand zu pruefen
// (das Umformen selbst braucht einen scope-bewussten Durchlauf). Stand der ersten Messung: 28. Oktober 2026.
const fs = require('fs'), path = require('path');
let acorn, walk;
try { acorn = require('internal/deps/acorn/acorn/dist/acorn'); walk = require('internal/deps/acorn/acorn-walk/dist/walk'); }
catch (e) { console.error('Aufruf mit: node --expose-internals tools/struktur-messung.js ...'); process.exit(1); }
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('<script>\nconst BUILD'), b = html.lastIndexOf('</script>');
const src = html.slice(a + 9, b), off = html.slice(0, a + 9).split('\n').length - 1;
const ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true });
const ln = n => n.loc.start.line + off, sz = n => n.end - n.start;
const st = ast.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'start'), stm = st.body.body;
const pat = (p, f) => { if (!p) return; if (p.type === 'Identifier') f(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach(q => pat(q.value || q.argument, f)); else if (p.type === 'ArrayPattern') p.elements.forEach(q => pat(q, f)); else if (p.type === 'AssignmentPattern') pat(p.left, f); else if (p.type === 'RestElement') pat(p.argument, f); };
const decl = new Map();
stm.forEach((n, i) => { if (n.type === 'FunctionDeclaration') decl.set(n.id.name, { i, kind: 'fn' }); else if (n.type === 'VariableDeclaration') for (const d of n.declarations) pat(d.id, nm => decl.set(nm, { i, kind: n.kind })); });
const name = n => n.type === 'FunctionDeclaration' ? 'function ' + n.id.name : n.type === 'VariableDeclaration' ? n.declarations.map(d => d.id.name || '{..}').join(',') : n.type === 'ExpressionStatement' ? 'expr' : n.type;
function refs(nodes) {
  const used = new Map(), written = new Set(), inner = new Set();
  for (const n of nodes) walk.full(n, x => {
    if (x.type === 'Identifier') used.set(x.name, (used.get(x.name) || 0) + 1);
    if (x.type === 'FunctionDeclaration' || x.type === 'FunctionExpression' || x.type === 'ArrowFunctionExpression') { if (x.id) inner.add(x.id.name); x.params.forEach(p => pat(p, nm => inner.add(nm))); }
    if (x.type === 'VariableDeclarator') pat(x.id, nm => inner.add(nm));
    if (x.type === 'CatchClause' && x.param) pat(x.param, nm => inner.add(nm));
    if (x.type === 'AssignmentExpression' && x.left.type === 'Identifier') written.add(x.left.name);
    if (x.type === 'UpdateExpression' && x.argument.type === 'Identifier') written.add(x.argument.name);
  });
  return { used, written, inner };
}
const pick = ranges => { const idx = []; stm.forEach((n, i) => { if (ranges.some(([f, t]) => ln(n) >= f && ln(n) <= t)) idx.push(i); }); return idx; };
const [cmd, ...rest] = process.argv.slice(2), nums = rest.map(Number);
if (cmd === 'ebene') {
  for (const n of ast.body) console.log(' ', ln(n), sz(n), n.type, name(n).slice(0, 60));
  console.log('start: Zeilen', ln(st), '-', st.loc.end.line + off, 'Bytes', sz(st), 'Anweisungen im Rumpf', stm.length, 'Bytes ohne Kommentare', stm.reduce((s, n) => s + sz(n), 0));
} else if (cmd === 'gross') {
  const min = nums[0] || 2500; for (const n of stm) if (sz(n) >= min) console.log(ln(n), sz(n), name(n));
} else if (cmd === 'baender') {
  const B = [[215, 365, 'Zustand, CFG, Raster, Dekor'], [366, 1060, 'Kartenerzeugung'], [1061, 1142, 'Treffpunkt, Ausweichpunkt, layoutFor'], [1143, 1348, 'Karten-Vertrag, Ableiten'], [1349, 1571, 'buildWorld, Spielzustand'], [1572, 1812, 'reset, Polizei, Aktionen'], [1813, 1960, 'Transporter'], [1961, 2250, 'Ueberfall, Gadgets, Ende, hostStep'], [2251, 2600, 'Netz, Schnappschuss'], [2601, 2700, 'applySnap, Zeichenhelfer'], [2701, 3060, 'Zeichnen'], [3061, 3186, 'hud, Schleife, dbg']];
  for (const [f, t, nm] of B) { const r = stm.filter(n => ln(n) >= f && ln(n) <= t); console.log(String(f).padStart(5), String(t).padStart(5), String(r.reduce((s, n) => s + sz(n), 0)).padStart(7), 'Bytes', String(r.length).padStart(4), 'Anweisungen ', nm); }
} else if (cmd === 'bereich' || cmd === 'namen') {
  const ranges = []; for (let i = 0; i + 1 < nums.length; i += 2) ranges.push([nums[i], nums[i + 1]]);
  const idx = pick(ranges), set = new Set(idx), blk = idx.map(i => stm[i]), r = refs(blk), rr = refs(stm.filter((n, i) => !set.has(i)));
  const declared = [...decl].filter(([, d]) => set.has(d.i)).map(([nm]) => nm);
  console.log('BEREICH', JSON.stringify(ranges), 'Anweisungen', idx.length, 'Bytes', blk.reduce((s, n) => s + sz(n), 0));
  const need = [...r.used].filter(([nm]) => decl.has(nm) && !set.has(decl.get(nm).i));
  if (cmd === 'namen') { need.sort((x, y) => y[1] - x[1]); for (const [nm, c] of need) console.log(' ', nm, c, decl.get(nm).kind, r.inner.has(nm) ? 'KOLLISION' : '', r.written.has(nm) ? 'GESCHRIEBEN' : ''); }
  else { const by = {}; for (const [nm] of need) { const k = decl.get(nm).kind + (r.written.has(nm) ? '*' : '') + (r.inner.has(nm) ? '?' : ''); (by[k] = by[k] || []).push(nm); } for (const k of Object.keys(by)) console.log(' braucht', k, by[k].length, by[k].join(' ').slice(0, 900)); }
  const prov = declared.filter(nm => rr.used.has(nm)); console.log(' liefert', prov.length, prov.join(' ').slice(0, 900));
  console.log(' von aussen beschrieben (let/var):', prov.filter(nm => ['let', 'var'].includes(decl.get(nm).kind) && rr.written.has(nm)).join(' '));
  console.log(' (* = vom Bereich beschrieben, ? = Name kommt im Bereich auch lokal vor)');
} else console.log('Befehle: ebene | gross [Byte] | baender | bereich von bis | namen von bis [von bis ...]');
