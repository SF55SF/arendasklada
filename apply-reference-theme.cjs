const fs = require('fs');

const heroComponent = `---
import { relativePath } from '../lib/paths';

const currentPath = Astro.url.pathname;
const heroImage = relativePath('/images/hero-warehouse-bg.jpg', currentPath);
---

<section class="reference-hero" aria-labelledby="reference-hero-title">
  <img
    class="reference-hero__image"
    src={heroImage}
    alt="Современный складской комплекс"
    fetchpriority="high"
  />

  <div class="reference-hero__overlay" aria-hidden="true"></div>

  <div class="reference-hero__content">
    <p class="reference-hero__eyebrow">Аренда складов в Ташкенте</p>

    <h1 id="reference-hero-title">
      Качественные склады для вашего бизнеса
    </h1>

    <p class="reference-hero__lead">
      Свободные складские и индустриальные объекты — на карте и в удобном каталоге.
    </p>

    <a class="reference-hero__button" href="#warehouses">
      Смотреть объекты
    </a>
  </div>
</section>
`;

const referenceStyles = `:root {
  --reference-navy: #131936;
  --reference-navy-dark: #0d122b;
  --reference-burgundy: #7f2028;
  --reference-burgundy-dark: #651820;
  --reference-background: #e8e8e2;
  --reference-surface: #f8f8f5;
  --reference-panel: #d2d3d0;
  --reference-text: #171a24;
  --reference-muted: #747985;
  --reference-border: #ced0cd;
  --reference-shadow: 0 18px 48px rgba(19, 25, 54, 0.12);
}

html,
body,
button,
input,
textarea,
select {
  font-family: 'Tilda Sans', Inter, Arial, sans-serif;
}

body {
  color: var(--reference-text);
  background: var(--reference-background);
}

.site-header {
  min-height: 72px;
  padding: 14px clamp(20px, 4vw, 64px);
  border-bottom: 0;
  background: var(--reference-navy);
  box-shadow: 0 8px 26px rgba(13, 18, 43, 0.18);
  backdrop-filter: none;
}

.logo-mark {
  border-radius: 4px;
  color: #fff;
  background: var(--reference-burgundy);
}

.main-nav {
  gap: clamp(18px, 3vw, 42px);
}

.main-nav a {
  color: rgba(255, 255, 255, 0.84);
  font-weight: 600;
}

.main-nav a:hover {
  color: #fff;
}

.reference-hero {
  position: relative;
  min-height: clamp(440px, 62vh, 650px);
  overflow: hidden;
  background: var(--reference-navy);
}

.reference-hero__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.reference-hero__overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      rgba(13, 18, 43, 0.46) 0%,
      rgba(13, 18, 43, 0.14) 55%,
      rgba(13, 18, 43, 0.05) 100%
    );
}

.reference-hero__content {
  position: relative;
  z-index: 2;
  width: min(610px, 46vw);
  margin-left: clamp(20px, 5vw, 86px);
  padding: clamp(38px, 6vw, 78px);
  background: rgba(112, 114, 117, 0.89);
  color: #fff;
  transform: translateY(clamp(50px, 10vh, 105px));
  box-shadow: var(--reference-shadow);
}

.reference-hero__eyebrow {
  margin: 0 0 18px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.reference-hero h1 {
  max-width: 520px;
  margin: 0 0 22px;
  color: #fff;
  font-size: clamp(42px, 5vw, 72px);
  font-weight: 700;
  line-height: 0.98;
  letter-spacing: -0.035em;
}

.reference-hero__lead {
  max-width: 500px;
  margin: 0 0 28px;
  color: rgba(255, 255, 255, 0.86);
  font-size: clamp(16px, 1.4vw, 20px);
  line-height: 1.45;
}

.reference-hero__button {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 12px 22px;
  border-radius: 4px;
  background: var(--reference-burgundy);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.reference-hero__button:hover {
  background: var(--reference-burgundy-dark);
  transform: translateY(-2px);
}

.catalog-workspace {
  background: var(--reference-background);
}

.catalog-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  align-items: start;
}

.catalog-map-panel,
.catalog-results-panel {
  min-width: 0;
  width: 100%;
}

.catalog-map-panel {
  position: sticky;
  top: 72px;
  height: calc(100vh - 72px);
  min-height: 620px;
  padding: 24px;
  background: var(--reference-surface);
}

.catalog-static-map {
  height: 100%;
  border: 1px solid var(--reference-border);
  border-radius: 14px;
  background: #d7d8d4;
  box-shadow: none;
}

.catalog-map-heading {
  top: 40px;
  left: 40px;
  border: 0;
  border-radius: 4px;
  background: rgba(248, 248, 245, 0.94);
  box-shadow: 0 8px 28px rgba(19, 25, 54, 0.12);
}

.catalog-results-panel {
  padding: clamp(28px, 4vw, 58px);
  border-left: 1px solid var(--reference-border);
  background: var(--reference-background);
}

.catalog-results-head {
  align-items: end;
  margin-bottom: 24px;
}

.catalog-results-head .eyebrow {
  color: var(--reference-burgundy);
}

.catalog-results-head h2 {
  max-width: 620px;
  margin: 0;
  color: var(--reference-navy);
  font-size: clamp(34px, 3.5vw, 54px);
  line-height: 1;
  letter-spacing: -0.035em;
}

.catalog-summary {
  color: var(--reference-muted);
}

.catalog-toolbar {
  position: relative;
  top: auto;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(0, 1fr) repeat(2, minmax(110px, 0.5fr));
  grid-template-rows: auto auto auto;
  gap: 9px;
  margin: 0 0 24px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.catalog-search {
  grid-column: 1;
  grid-row: 1 / 3;
  min-height: 105px;
  border: 1px solid var(--reference-border);
  border-radius: 6px;
  background: var(--reference-surface);
}

.catalog-search input {
  color: var(--reference-text);
  font-size: 15px;
}

.catalog-search svg {
  stroke: var(--reference-burgundy);
}

.toolbar-filter {
  position: relative;
  min-width: 0;
}

.toolbar-filter:nth-of-type(1) {
  grid-column: 2;
  grid-row: 1;
}

.toolbar-filter:nth-of-type(2) {
  grid-column: 3;
  grid-row: 1;
}

.toolbar-filter:nth-of-type(3) {
  grid-column: 2;
  grid-row: 2;
}

.toolbar-filter:nth-of-type(4) {
  grid-column: 3;
  grid-row: 2;
}

.toolbar-filter summary {
  min-height: 48px;
  padding: 11px 13px;
  border: 1px solid var(--reference-border);
  border-radius: 6px;
  background: var(--reference-surface);
  color: var(--reference-navy);
  font-size: 12px;
  font-weight: 700;
}

.toolbar-filter[open] summary {
  border-color: var(--reference-navy);
  background: var(--reference-navy);
  color: #fff;
}

.toolbar-filter fieldset {
  position: static;
  min-width: 0;
  margin-top: 6px;
  padding: 8px;
  border: 1px solid var(--reference-border);
  border-radius: 6px;
  background: var(--reference-surface);
  box-shadow: none;
}

.toolbar-filter label {
  color: var(--reference-text);
  font-size: 11px;
}

.toolbar-filter label:hover {
  background: rgba(127, 32, 40, 0.07);
}

.toolbar-filter input {
  accent-color: var(--reference-burgundy);
}

.toolbar-reset {
  grid-column: 2 / 4;
  grid-row: 3;
  justify-self: end;
  color: var(--reference-burgundy);
  font-size: 12px;
}

.catalog-results-panel .warehouse-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 0;
}

.catalog-results-panel .warehouse-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: 245px;
  overflow: hidden;
  border: 1px solid var(--reference-border);
  border-radius: 8px;
  background: var(--reference-surface);
  box-shadow: 0 10px 30px rgba(19, 25, 54, 0.08);
}

.catalog-results-panel .warehouse-card-media {
  width: 100%;
  height: 100%;
  min-height: 245px;
  border-radius: 0;
  background: var(--reference-panel);
}

.catalog-results-panel .warehouse-card-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.catalog-results-panel .warehouse-card-content {
  display: flex;
  min-width: 0;
  min-height: 245px;
  flex-direction: column;
  padding: 24px;
}

.catalog-results-panel .warehouse-card-location {
  color: var(--reference-muted);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.catalog-results-panel .warehouse-card h3 {
  margin: 0 0 20px;
  color: var(--reference-navy);
  font-size: clamp(20px, 1.8vw, 28px);
  line-height: 1.08;
}

.catalog-results-panel .warehouse-card-specs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.catalog-results-panel .warehouse-card-specs dt {
  color: var(--reference-muted);
  font-size: 9px;
  text-transform: uppercase;
}

.catalog-results-panel .warehouse-card-specs dd {
  color: var(--reference-text);
  font-size: 13px;
  font-weight: 700;
}

.catalog-results-panel .warehouse-card-actions {
  display: block;
  margin-top: auto;
  padding-top: 20px;
}

.catalog-results-panel .warehouse-card-actions .button {
  width: 100%;
  min-height: 42px;
  border: 0;
  border-radius: 4px;
  background: var(--reference-burgundy);
  color: #fff;
  font-size: 12px;
}

.catalog-results-panel .warehouse-card-actions .button:hover {
  background: var(--reference-burgundy-dark);
}

.contact-section {
  background: var(--reference-navy);
}

@media (max-width: 1100px) {
  .reference-hero__content {
    width: min(620px, 58vw);
  }

  .catalog-results-panel {
    padding: 30px 22px 54px;
  }

  .catalog-toolbar {
    grid-template-columns: 1fr 1fr;
  }

  .catalog-search {
    grid-column: 1 / -1;
    grid-row: auto;
    min-height: 52px;
  }

  .toolbar-filter:nth-of-type(1),
  .toolbar-filter:nth-of-type(2),
  .toolbar-filter:nth-of-type(3),
  .toolbar-filter:nth-of-type(4) {
    grid-column: auto;
    grid-row: auto;
  }

  .toolbar-reset {
    grid-column: 1 / -1;
    grid-row: auto;
  }
}

@media (max-width: 820px) {
  .site-header {
    min-height: 64px;
  }

  .reference-hero {
    min-height: 570px;
  }

  .reference-hero__content {
    width: calc(100% - 32px);
    margin: 0 16px;
    padding: 34px 24px;
    transform: translateY(190px);
  }

  .reference-hero h1 {
    font-size: clamp(38px, 11vw, 56px);
  }

  .catalog-split {
    display: block;
  }

  .catalog-map-panel {
    position: relative;
    top: auto;
    height: 460px;
    min-height: 460px;
    padding: 14px;
  }

  .catalog-results-panel {
    border-left: 0;
  }

  .catalog-results-head {
    align-items: start;
  }
}

@media (max-width: 600px) {
  .catalog-toolbar {
    grid-template-columns: 1fr;
  }

  .toolbar-filter:nth-of-type(1),
  .toolbar-filter:nth-of-type(2),
  .toolbar-filter:nth-of-type(3),
  .toolbar-filter:nth-of-type(4),
  .toolbar-reset {
    grid-column: 1;
  }

  .catalog-results-panel .warehouse-card {
    grid-template-columns: 1fr;
  }

  .catalog-results-panel .warehouse-card-media {
    min-height: 210px;
    aspect-ratio: 16 / 10;
  }

  .catalog-results-panel .warehouse-card-content {
    min-height: 230px;
  }

  .catalog-results-head {
    display: block;
  }

  .catalog-summary {
    margin-top: 10px;
  }
}
`;

fs.writeFileSync('src/components/HomeHero.astro', heroComponent, 'utf8');
fs.writeFileSync('src/styles/reference-theme.css', referenceStyles, 'utf8');

let indexPage = fs.readFileSync('src/pages/index.astro', 'utf8');

if (!indexPage.includes("reference-theme.css")) {
  indexPage = indexPage.replace(
    "import BaseLayout from '../layouts/BaseLayout.astro';",
    "import BaseLayout from '../layouts/BaseLayout.astro';\nimport '../styles/reference-theme.css';"
  );
}

if (!indexPage.includes("HomeHero")) {
  indexPage = indexPage.replace(
    "import Header from '../components/Header.astro';",
    "import Header from '../components/Header.astro';\nimport HomeHero from '../components/HomeHero.astro';"
  );

  indexPage = indexPage.replace(
    "  <Header />\n\n  <main>",
    "  <Header />\n  <HomeHero />\n\n  <main>"
  );
}

fs.writeFileSync('src/pages/index.astro', indexPage, 'utf8');

let table = fs.readFileSync('src/components/WarehousesTable.astro', 'utf8');

if (table.includes('<h1>Свободные складские объекты</h1>')) {
  table = table.replace(
    '<h1>Свободные складские объекты</h1>',
    '<h2>Свободные складские объекты</h2>'
  );
}

const formPattern = /\n  <form class="catalog-toolbar"[\s\S]*?\n  <\/form>\n/;
const formMatch = table.match(formPattern);

if (formMatch) {
  const form = formMatch[0].trim();
  table = table.replace(formMatch[0], '\n');

  const insertionPoint = '      </div>\n\n      <div data-property-table hidden>';

  if (!table.includes(insertionPoint)) {
    throw new Error('Не удалось найти место для переноса фильтров');
  }

  const indentedForm = form
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');

  table = table.replace(
    insertionPoint,
    `      </div>\n\n${indentedForm}\n\n      <div data-property-table hidden>`
  );
} else if (!table.includes('class="catalog-toolbar"')) {
  throw new Error('Форма фильтров не найдена');
}

fs.writeFileSync('src/components/WarehousesTable.astro', table, 'utf8');

console.log('Готово: структура и палитра обновлены.');
