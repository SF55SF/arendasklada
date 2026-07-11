const fs = require('fs');

const cardPath = 'src/components/WarehouseCard.astro';
let card = fs.readFileSync(cardPath, 'utf8');

const replacement = `<dd class="warehouse-card-lease-value">
          {/\\s+аренда$/i.test(data.leaseType.replace(/["“”]/g, '').trim()) ? (
            <>
              <span>{data.leaseType.replace(/["“”]/g, '').trim().replace(/\\s+аренда$/i, '')}</span>
              <span>аренда</span>
            </>
          ) : (
            data.leaseType.replace(/["“”]/g, '').trim()
          )}
        </dd>`;

const leaseDd = /<dd class="warehouse-card-lease-value">[\s\S]*?<\/dd>/m;
if (leaseDd.test(card)) {
  card = card.replace(leaseDd, replacement);
} else {
  const plainDd = /<dd>\{(?:data\.leaseType|displayLeaseType)\}<\/dd>/m;
  if (!plainDd.test(card)) throw new Error('Не найден блок Тип аренды в WarehouseCard.astro');
  card = card.replace(plainDd, replacement);
}

fs.writeFileSync(cardPath, card, 'utf8');

const cssPath = 'src/styles/reference-theme.css';
let css = fs.readFileSync(cssPath, 'utf8');
const start = '/* ARENDASKLADA_FORCE_LEASE_BREAK_START */';
const end = '/* ARENDASKLADA_FORCE_LEASE_BREAK_END */';
const i = css.indexOf(start);
const j = css.indexOf(end);
if (i >= 0 && j >= i) css = css.slice(0, i) + css.slice(j + end.length);

const patch = `${start}
.catalog-results-panel .warehouse-card-lease-value {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  justify-content: flex-start !important;
  gap: 1px !important;
  max-width: none !important;
  white-space: normal !important;
  line-height: 1.12 !important;
}

.catalog-results-panel .warehouse-card-lease-value > span {
  display: block !important;
  width: 100% !important;
  white-space: nowrap !important;
}
${end}
`;

fs.writeFileSync(cssPath, css.trimEnd() + '\n\n' + patch, 'utf8');
console.log('Готово: Тип аренды принудительно разбит на две строки внутри карточек');
