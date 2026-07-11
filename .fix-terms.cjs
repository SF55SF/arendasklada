const fs = require('fs');
const path = require('path');

const exts = new Set(['.astro','.ts','.js','.json','.md','.mdx','.yml','.yaml','.css']);
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (exts.has(path.extname(name))) out.push(p);
  }
  return out;
}

for (const file of walk('src')) {
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  s = s.replace(/"Сухая" аренда/g, 'Сухая аренда');
  s = s.replace(/'Сухая' аренда/g, 'Сухая аренда');
  s = s.replace(/“Сухая” аренда/g, 'Сухая аренда');
  s = s.replace(/Действущие/g, 'Действующий');
  s = s.replace(/Действующие/g, 'Действующий');
  s = s.replace(/действующие/g, 'действующий');
  s = s.replace(/Существующие/g, 'Действующий');
  s = s.replace(/существующие/g, 'действующий');
  if (s !== before) fs.writeFileSync(file, s, 'utf8');
}

const cardPath = 'src/components/WarehouseCard.astro';
let card = fs.readFileSync(cardPath, 'utf8');
card = card.replace('<dd>{data.leaseType}</dd>', '<dd class="warehouse-card-lease-value">{data.leaseType}</dd>');
card = card.replace(/\? 'Действующий'\s*:\s*data\.ready;/, "? 'Действующий' : data.ready;");
card = card.replace(/\? 'Действующие'\s*:\s*data\.ready;/, "? 'Действующий' : data.ready;");
fs.writeFileSync(cardPath, card, 'utf8');

const cssPath = 'src/styles/reference-theme.css';
let css = fs.readFileSync(cssPath, 'utf8');
const a = '/* ARENDASKLADA_LEASE_WRAP_START */';
const b = '/* ARENDASKLADA_LEASE_WRAP_END */';
const i = css.indexOf(a), j = css.indexOf(b);
if (i >= 0 && j >= i) css = css.slice(0, i) + css.slice(j + b.length);
css = css.trimEnd() + '\n\n' + `${a}
.catalog-results-panel .warehouse-card-lease-value {
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: normal !important;
  line-height: 1.15 !important;
  max-width: 11ch;
}
.catalog-results-panel .warehouse-card-ready-value {
  white-space: nowrap !important;
}
${b}
`;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('Готово: исправлены термины и перенос для типа аренды');
