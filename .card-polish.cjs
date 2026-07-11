const fs = require('fs');

const cardPath = 'src/components/WarehouseCard.astro';
let card = fs.readFileSync(cardPath, 'utf8');

if (!card.includes('const displayReady =')) {
  card = card.replace(
    /const rentRate =[^\n]*\n(?:[^\n]*\n){0,3}/,
    (m) => m + "const displayReady = data.ready.trim().toLowerCase() === 'существующие' ? 'Действующие' : data.ready;\n"
  );
}

card = card.replace('<dd>{data.ready}</dd>', '<dd class="warehouse-card-ready-value">{displayReady}</dd>');
fs.writeFileSync(cardPath, card, 'utf8');

const cssPath = 'src/styles/reference-theme.css';
let css = fs.readFileSync(cssPath, 'utf8');
const a = '/* ARENDASKLADA_CARD_POLISH_START */';
const b = '/* ARENDASKLADA_CARD_POLISH_END */';
const i = css.indexOf(a);
const j = css.indexOf(b);
if (i >= 0 && j >= i) css = css.slice(0, i) + css.slice(j + b.length);

const patch = `${a}
.catalog-results-panel .warehouse-card {
  border: 1px solid rgba(19, 25, 54, 0.08) !important;
  background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,248,248,0.98) 100%) !important;
  box-shadow: 0 18px 34px rgba(19, 25, 54, 0.12), 0 4px 10px rgba(19, 25, 54, 0.06) !important;
  transition: transform .22s ease, box-shadow .22s ease !important;
}

.catalog-results-panel .warehouse-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 42px rgba(19, 25, 54, 0.16), 0 8px 16px rgba(19, 25, 54, 0.08) !important;
}

.catalog-results-panel .warehouse-card-content {
  padding-top: 20px !important;
}

.catalog-results-panel .warehouse-card h3 a {
  letter-spacing: -0.015em;
}

.catalog-results-panel .warehouse-card-specs {
  gap: 12px !important;
}

.catalog-results-panel .warehouse-card-specs > div {
  background: linear-gradient(180deg, rgba(19, 25, 54, 0.055) 0%, rgba(19, 25, 54, 0.035) 100%) !important;
  border: 1px solid rgba(19, 25, 54, 0.06) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.65) !important;
}

.catalog-results-panel .warehouse-card-specs dt {
  color: rgba(44, 58, 87, 0.68) !important;
}

.catalog-results-panel .warehouse-card-specs dd {
  white-space: nowrap !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
}

.catalog-results-panel .warehouse-card-ready-value {
  white-space: nowrap !important;
}

.catalog-results-panel .warehouse-card-rate small {
  margin-top: 6px !important;
  color: rgba(44, 58, 87, 0.72) !important;
}

.catalog-results-panel .warehouse-card-actions {
  padding-top: 18px !important;
}
${b}
`;

fs.writeFileSync(cssPath, css.trimEnd() + '\n\n' + patch, 'utf8');
console.log('Готово: карточка обновлена');
