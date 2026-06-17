import fs from 'fs';

const puntajes = JSON.parse(fs.readFileSync('./src/data/puntajes.json', 'utf8'));

const updated = puntajes.filter(m => ![
  'POR_COD_20260617',
  'ENG_CRO_20260617',
  'GHA_PAN_20260617',
  'UZB_COL_20260617'
].includes(m.match_id));

fs.writeFileSync('./src/data/puntajes.json', JSON.stringify(updated, null, 2));
console.log("Mock matches removed.");
