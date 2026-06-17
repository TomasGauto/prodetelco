// Seed colección `players` desde el HTML local de api-football.
// Uso:
//   node seedPlayers.js            -> dry-run (parsea + valida + reporta)
//   node seedPlayers.js --apply    -> escribe a Firestore
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const HTML_PATH =
  "FIFA World Cup 2026 Lineups_ All Teams, Coaches and Players - API-FOOTBALL.html";

const COUNTRY_TO_FIFA = {
  Germany: "GER",
  England: "ENG",
  Austria: "AUT",
  Belgium: "BEL",
  "Bosnia & Herzegovina": "BIH",
  Croatia: "CRO",
  Scotland: "SCO",
  Spain: "ESP",
  France: "FRA",
  Norway: "NOR",
  Netherlands: "NED",
  Portugal: "POR",
  Sweden: "SWE",
  Switzerland: "SUI",
  Czechia: "CZE",
  Turkey: "TUR",
  Argentina: "ARG",
  Brazil: "BRA",
  Colombia: "COL",
  Ecuador: "ECU",
  Paraguay: "PAR",
  Uruguay: "URU",
  Canada: "CAN",
  USA: "USA",
  Mexico: "MEX",
  Curaçao: "CUW",
  Haiti: "HAI",
  Panama: "PAN",
  "South Africa": "RSA",
  Algeria: "ALG",
  "Cape Verde": "CPV",
  "Ivory Coast": "CIV",
  Egypt: "EGY",
  Ghana: "GHA",
  Morocco: "MAR",
  "DR Congo": "COD",
  Senegal: "SEN",
  Tunisia: "TUN",
  "Saudi Arabia": "KSA",
  Australia: "AUS",
  Iraq: "IRQ",
  Japan: "JPN",
  Jordan: "JOR",
  Uzbekistan: "UZB",
  Qatar: "QAT",
  "South Korea": "KOR",
  Iran: "IRN",
  "New Zealand": "NZL",
};

const POSITION_LABELS = {
  Goalkeepers: "GK",
  Defenders: "DEF",
  Midfielders: "MID",
  Forwards: "FWD",
};

const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const parse = (html) => {
  const squads = [];
  const sectionRe = /<h2[^>]*>([^<]+) squad list<\/h2>([\s\S]*?)(?=<h2|<h1|Related Posts|Recent Posts)/g;
  let m;
  while ((m = sectionRe.exec(html)) !== null) {
    const country = decodeEntities(m[1].trim());
    const section = m[2];
    const players = [];
    const posRe = /<p><strong>(Goalkeepers|Defenders|Midfielders|Forwards):<\/strong>([\s\S]*?)<\/p>/g;
    let pm;
    while ((pm = posRe.exec(section)) !== null) {
      const position = POSITION_LABELS[pm[1]];
      const namesRaw = pm[2].replace(/\s+/g, " ");
      const names = namesRaw
        .split("·")
        .map((s) => decodeEntities(s).replace(/<[^>]+>/g, "").trim())
        .filter(Boolean);
      names.forEach((name) => players.push({ name, position }));
    }
    squads.push({ country, players });
  }
  return squads;
};

const main = async () => {
  const apply = process.argv.includes("--apply");
  const html = readFileSync(HTML_PATH, "utf8");
  const squads = parse(html);

  console.log(`Países parseados: ${squads.length}`);

  const missing = squads.filter((s) => !COUNTRY_TO_FIFA[s.country]);
  if (missing.length) {
    console.error(
      "❌ Faltan mappings FIFA para:",
      missing.map((s) => `"${s.country}"`).join(", ")
    );
    process.exit(1);
  }

  const byPos = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  let total = 0;
  squads.forEach((s) => {
    s.players.forEach((p) => {
      byPos[p.position] = (byPos[p.position] || 0) + 1;
      total++;
    });
  });
  console.log("Total jugadores:", total);
  console.log("Por posición:", byPos);

  // Algunas alertas de calidad
  squads.forEach((s) => {
    const gk = s.players.filter((p) => p.position === "GK").length;
    const def = s.players.filter((p) => p.position === "DEF").length;
    const mid = s.players.filter((p) => p.position === "MID").length;
    const fwd = s.players.filter((p) => p.position === "FWD").length;
    if (gk < 2 || def < 4 || mid < 4 || fwd < 2) {
      console.warn(
        `⚠️  ${s.country} (${COUNTRY_TO_FIFA[s.country]}): GK=${gk} DEF=${def} MID=${mid} FWD=${fwd}`
      );
    }
  });

  // Ejemplo: Argentina
  const arg = squads.find((s) => s.country === "Argentina");
  console.log("\nMuestra Argentina (primeros 5):");
  arg.players.slice(0, 5).forEach((p) => console.log(`  ${p.position} ${p.name}`));

  if (!apply) {
    console.log("\n(Dry-run. Para escribir a Firestore: node seedPlayers.js --apply)");
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: "prodetelco",
  });
  const db = getFirestore();

  let batch = db.batch();
  let ops = 0;
  let writes = 0;

  for (const sq of squads) {
    const fifa = COUNTRY_TO_FIFA[sq.country];
    for (const p of sq.players) {
      const id = `${fifa}_${slug(p.name)}`;
      batch.set(db.collection("players").doc(id), {
        name: p.name,
        country: fifa,
        position: p.position,
      });
      ops++;
      writes++;
      if (ops >= 400) {
        await batch.commit();
        console.log(`  Escritos ${writes}/${total}...`);
        batch = db.batch();
        ops = 0;
      }
    }
  }
  if (ops > 0) await batch.commit();
  console.log(`✅ Listo. ${writes} jugadores escritos en Firestore.`);
};

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
