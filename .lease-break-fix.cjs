const fs = require('fs');
const cardPath = 'src/components/WarehouseCard.astro';
let card = fs.readFileSync(cardPath, 'utf8');

if (!card.includes('const displayLeaseType =')) {
  card = card.replace(
    /(const displayReady =[\s\S]*?;\n)/,
    `$1const displayLeaseType = data.leaseType
  .replace(/["“”]/g, '')
  .trim()
  .replace(/^Сухая аренда$/i, 'Сухая\\nаренда')
  .replace(/^Стеллажная аренда$/i, 'Стеллажная\\nаренда');
`
  );
}

card = card.replace(
  /<dd class="warehouse-card-lease-value">\{data\.leaseType\}<\/dd>/,
  '<dd class="warehouse-card-lease-value">{displayLeaseType}</dd>'
);
fs.writeFileSync(cardPath, card, 'utf8');

const cssPath = 'src/styles/reference-theme.css';
let css = fs.readFileSync(cssPath, 'utf8');
const a = '/* ARENDASKLADA_LEASE_HARD_BREAK_START */';
const b = '/* ARENDASKLADA_LEASE_HARD_BREAK_END */';
const i = css.indexOf(a), j = css.indexOf(b);
if (i >= 0 && j >= i) css = css.slice(0, i) + css.slice(j + b.length);
css = css.trimEnd() + '\n\n' + `${a}
.catalog-results-panel .warehouse-card-lease-value {
  white-space: pre-line !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
  line-height: 1.15 !important;
}
${b}
`;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('Готово: тип аренды принудительно разбит на две строки');
