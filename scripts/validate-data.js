#!/usr/bin/env node
// Dev-only sanity check for the DATA object embedded in index.html.
// Not loaded by the app itself - run manually (or by Claude) before committing:
//   node scripts/validate-data.js

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/const DATA = (\{[\s\S]*?\n\};)/);
if (!match) {
  console.error('Could not find "const DATA = {...};" in index.html');
  process.exit(1);
}

let DATA;
try {
  DATA = eval('(' + match[1].slice(0, -1) + ')');
} catch (e) {
  console.error('DATA block is not valid JS:', e.message);
  process.exit(1);
}

const errors = [];

function checkRecipeList(recipes, where) {
  const seenNames = new Map();
  recipes.forEach((r, i) => {
    if (!r.name || !r.name.trim()) {
      errors.push(`${where}: recipe #${i} has no name`);
      return;
    }
    const key = r.name.trim().toLowerCase();
    if (seenNames.has(key)) {
      errors.push(`${where}: duplicate recipe name "${r.name}"`);
    }
    seenNames.set(key, true);

    if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) {
      errors.push(`${where} :: "${r.name}": no ingredients`);
      return;
    }
    const seenIngr = new Map();
    r.ingredients.forEach((ing) => {
      if (ing.startsWith('§')) return; // section header, not a real ingredient
      const ikey = ing.trim().toLowerCase();
      if (seenIngr.has(ikey)) {
        errors.push(`${where} :: "${r.name}": duplicate ingredient "${ing}"`);
      }
      seenIngr.set(ikey, true);
    });
  });
}

Object.entries(DATA).forEach(([catKey, cat]) => {
  if (cat.subcats) {
    cat.subcats.forEach((s) => checkRecipeList(s.recipes, `${catKey}/${s.key}`));
  } else if (cat.recipes) {
    checkRecipeList(cat.recipes, catKey);
  }
});

if (errors.length) {
  console.error(`Found ${errors.length} issue(s):`);
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
}

console.log('DATA OK - no duplicate ingredients, no duplicate/missing recipe names.');
