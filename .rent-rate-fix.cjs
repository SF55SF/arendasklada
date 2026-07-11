const fs = require('fs');
const path = require('path');

const walk = (dir, out = []) => {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, out);
    else if (name.endsWith('.astro')) out.push(p);
  }
  return out;
};

const file = walk('src').find((p) => {
  const text = fs.readFileSync(p, 'utf8');
  return text.includes('warehouse-card-rate') && text.includes('rentRate');
});

if (!file) throw new Error('Не найден файл карточки');

let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  /const rawPrice =[\s\S]*?const rentRate =[\s\S]*?;\n/,
  `const rawPrice = data.price.trim();
const numericPrice = rawPrice
  .replace(/^от\s*/i, '')
  .replace(/\$/g, '')
  .replace(/\/\s*м².*$/i, '')
  .trim();
const rentRate = rawPrice.toLowerCase() === 'по запросу'
  ? 'По запросу'
  : ` + "`от $ ${numericPrice} за м²`" + `;
`
);
text = text.replace(
  /<small>[\s\S]*?<\/small>/,
  '<small>не включая НДС и эксплуатацию</small>'
);
fs.writeFileSync(file, text, 'utf8');
console.log('Готово:', file);
