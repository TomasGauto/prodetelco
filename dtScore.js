// Calcula los puntos del DT (fantasy) a partir de las estadisticas acumuladas
// del Mundial publicadas por FBref, y actualiza dtSquads/{uid}.dtPoints.
//
// Run:  node dtScore.js --dry-run   -> scrapea, calcula y MUESTRA (no escribe)
//       node dtScore.js             -> ademas escribe dtPoints en Firestore
//
// Requiere credenciales admin (igual que scoreData.js): GOOGLE_APPLICATION_CREDENTIALS
// o la service account JSON prodetelco-firebase-adminsdk-*.json en la raiz.
//
// Necesita cheerio:  npm install
//
// Diseno: el DT es un XI FIJO para todo el torneo, asi que usamos las stats
// ACUMULADAS de FBref (una sola pagina) en vez de scrapear partido por partido.
//
// Limitacion v1: no incluye vallas invictas para defensores/mediocampistas
// (FBref no expone clean sheets por jugador de campo en la tabla estandar).

import { existsSync, readFileSync, readdirSync } from "node:fs";
import * as cheerio from "cheerio";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const DRY_RUN = process.argv.includes("--dry-run");
const PROJECT_ID = "prodetelco";

// Opcion archivo local: si pasas --file <ruta> (o env FBREF_HTML_FILE), el script
// parsea ese HTML en vez de bajarlo (ideal cuando Cloudflare bloquea el fetch:
// guardas la pagina desde el navegador y la lees de disco).
const fileArgIdx = process.argv.indexOf("--file");
const HTML_FILE =
  process.env.FBREF_HTML_FILE ||
  (fileArgIdx !== -1 ? process.argv[fileArgIdx + 1] : null);

// Pagina de stats estandar por jugador del Mundial en FBref.
// Si FBref cambia la URL del torneo, override con env FBREF_STATS_URL.
const STATS_URL =
  process.env.FBREF_STATS_URL ||
  "https://fbref.com/en/comps/1/stats/World-Cup-Stats";

// ── Reglamento de puntos (editable) ──────────────────────────────────
const PTS = {
  appearance: 1,        // por partido jugado
  goal: { GK: 6, DEF: 6, MID: 5, FWD: 4 },
  assist: 3,
  yellow: -1,
  red: -3,
  penMiss: -2,
  captainMultiplier: 2, // el capitan puntua x2
};

// ── Mapa nombre-de-pais FBref -> codigo FIFA ─────────────────────────
// FBref usa variantes propias (ej "Korea Republic", "IR Iran").
const COUNTRY_TO_FIFA = {
  germany: "GER", england: "ENG", austria: "AUT", belgium: "BEL",
  "bosnia and herzegovina": "BIH", "bosnia & herzegovina": "BIH",
  croatia: "CRO", scotland: "SCO", spain: "ESP", france: "FRA",
  norway: "NOR", netherlands: "NED", portugal: "POR", sweden: "SWE",
  switzerland: "SUI", czechia: "CZE", "czech republic": "CZE",
  turkey: "TUR", turkiye: "TUR", argentina: "ARG", brazil: "BRA",
  colombia: "COL", ecuador: "ECU", paraguay: "PAR", uruguay: "URU",
  canada: "CAN", usa: "USA", "united states": "USA", mexico: "MEX",
  curacao: "CUW", haiti: "HAI", panama: "PAN", "south africa": "RSA",
  algeria: "ALG", "cape verde": "CPV", "cabo verde": "CPV",
  "ivory coast": "CIV", "cote d'ivoire": "CIV", egypt: "EGY", ghana: "GHA",
  morocco: "MAR", "dr congo": "COD", "congo dr": "COD",
  "congo kinshasa": "COD", senegal: "SEN", tunisia: "TUN",
  "saudi arabia": "KSA", australia: "AUS", iraq: "IRQ", japan: "JPN",
  jordan: "JOR", uzbekistan: "UZB", qatar: "QAT",
  "south korea": "KOR", "korea republic": "KOR", iran: "IRN",
  "ir iran": "IRN", "new zealand": "NZL",
};

// ── Helpers ──────────────────────────────────────────────────────────
const normalize = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // saca diacriticos
    .replace(/[.\-']/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const lastName = (norm) => norm.split(" ").slice(-1)[0] || "";

const toInt = (v) => {
  const n = parseInt(String(v).replace(/[^0-9-]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
};

// FBref mete varias tablas dentro de comentarios HTML para lazy-render.
const uncomment = (html) => html.replace(/<!--/g, "").replace(/-->/g, "");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// User-Agent: por defecto Chrome en Windows. Si pegas una cookie cf_clearance
// (env FBREF_COOKIE) copiala junto con el MISMO User-Agent del navegador (env FBREF_UA).
const USER_AGENT =
  process.env.FBREF_UA ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const fetchHtml = async (url) => {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    Referer: "https://fbref.com/en/comps/1/World-Cup-Stats",
    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
  };
  if (process.env.FBREF_COOKIE) headers.Cookie = process.env.FBREF_COOKIE;

  let lastStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res.text();
    lastStatus = res.status;
    if (res.status === 403 && attempt < 3) {
      await sleep(attempt * 2500); // backoff por si Cloudflare deja pasar al reintentar
      continue;
    }
    break;
  }
  throw new Error(
    `FBref devolvio HTTP ${lastStatus}. ` +
      (lastStatus === 403
        ? "Cloudflare bloqueo el request. Proba: (1) correrlo desde tu PC (IP residencial), " +
          "o (2) abrir FBref en el navegador, copiar la cookie 'cf_clearance' y el User-Agent, " +
          "y exportarlos como FBREF_COOKIE y FBREF_UA."
        : "")
  );
};

// ── Scrapea stats por jugador desde FBref ────────────────────────────
const scrapePlayers = async () => {
  const raw = HTML_FILE
    ? readFileSync(HTML_FILE, "utf8")
    : await fetchHtml(STATS_URL);
  if (HTML_FILE) console.log(`Leyendo HTML local: ${HTML_FILE}`);
  const html = uncomment(raw);
  const $ = cheerio.load(html);

  const rows = $("table#stats_standard tbody tr");
  if (rows.length === 0) {
    throw new Error(
      "No encontre la tabla #stats_standard. Revisa STATS_URL o la estructura de FBref."
    );
  }

  // FBref antepone el codigo de bandera al texto de la celda ("us United States"),
  // asi que tomamos el texto del <a> y, si no hay, sacamos el prefijo de bandera.
  const cellText = ($tr, stat) => {
    const $cell = $tr.find(`[data-stat="${stat}"]`);
    const link = $cell.find("a").first().text().trim();
    if (link) return link;
    return $cell.text().trim().replace(/^[a-z]{2,4}\s+/, "");
  };

  const players = [];
  rows.each((_, tr) => {
    const $tr = $(tr);
    if ($tr.hasClass("thead")) return;
    const name = cellText($tr, "player");
    if (!name) return;
    const team = cellText($tr, "team") || cellText($tr, "squad");
    const get = (stat) => toInt($tr.find(`[data-stat="${stat}"]`).text());
    players.push({
      name,
      team,
      games: get("games"),
      goals: get("goals"),
      assists: get("assists"),
      yellow: get("cards_yellow"),
      red: get("cards_red"),
      pensMade: get("pens_made"),
      pensAtt: get("pens_att"),
    });
  });
  return players;
};

const pointsFor = (stat, position) => {
  const goalPts = (PTS.goal[position] ?? PTS.goal.MID) * stat.goals;
  const penMiss = Math.max(0, stat.pensAtt - stat.pensMade);
  return (
    stat.games * PTS.appearance +
    goalPts +
    stat.assists * PTS.assist +
    stat.yellow * PTS.yellow +
    stat.red * PTS.red +
    penMiss * PTS.penMiss
  );
};

// ── Init firebase-admin ──────────────────────────────────────────────
const initAdmin = () => {
  let saFile = null;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    saFile = readdirSync(".").find(
      (f) => f.startsWith("prodetelco-firebase-adminsdk") && f.endsWith(".json")
    );
  }
  initializeApp({
    credential:
      saFile && existsSync(saFile)
        ? cert(JSON.parse(readFileSync(saFile, "utf8")))
        : applicationDefault(),
    projectId: PROJECT_ID,
  });
  return getFirestore();
};

// ── Proceso principal ────────────────────────────────────────────────
const run = async () => {
  console.log(`\nCalculando puntos DT desde FBref${DRY_RUN ? " (DRY-RUN)" : ""}...\n`);

  const db = initAdmin();

  const [fbPlayers, playersSnap, squadsSnap] = await Promise.all([
    scrapePlayers(),
    db.collection("players").get(),
    db.collection("dtSquads").get(),
  ]);
  console.log(`FBref: ${fbPlayers.length} jugadores con stats.`);

  // Indice de NUESTROS jugadores por pais FIFA.
  const ourByCountry = {}; // fifa -> { full: Map, last: Map<string, ids[]> , pos: {id->pos} }
  const posById = {};
  playersSnap.forEach((d) => {
    const p = d.data();
    const fifa = p.country;
    posById[d.id] = p.position;
    if (!ourByCountry[fifa]) ourByCountry[fifa] = { full: new Map(), last: new Map() };
    const norm = normalize(p.name);
    ourByCountry[fifa].full.set(norm, d.id);
    const ln = lastName(norm);
    if (!ourByCountry[fifa].last.has(ln)) ourByCountry[fifa].last.set(ln, []);
    ourByCountry[fifa].last.get(ln).push(d.id);
  });

  // Match FBref -> nuestro player id, y calculo de puntos por jugador.
  const pointsByPlayerId = {};
  const unknownCountries = new Set();
  const unmatched = [];
  let matched = 0;

  for (const fb of fbPlayers) {
    const fifa = COUNTRY_TO_FIFA[normalize(fb.team)];
    if (!fifa) { unknownCountries.add(fb.team); continue; }
    const idx = ourByCountry[fifa];
    if (!idx) continue;

    const norm = normalize(fb.name);
    let id = idx.full.get(norm);
    if (!id) {
      const cands = idx.last.get(lastName(norm));
      if (cands && cands.length === 1) id = cands[0]; // match unico por apellido
    }
    if (!id) { unmatched.push(`${fb.name} (${fifa})`); continue; }

    pointsByPlayerId[id] = pointsFor(fb, posById[id] || "MID");
    matched++;
  }

  console.log(`Jugadores matcheados: ${matched}/${fbPlayers.length}`);
  if (unknownCountries.size) {
    console.log(`\n⚠️  Paises sin mapear (agregalos a COUNTRY_TO_FIFA):`);
    [...unknownCountries].forEach((c) => console.log(`   - "${c}"`));
  }
  if (unmatched.length) {
    console.log(`\n⚠️  ${unmatched.length} jugadores de FBref sin match en nuestra base (primeros 25):`);
    unmatched.slice(0, 25).forEach((n) => console.log(`   - ${n}`));
  }

  // Puntos por usuario (XI + capitan x2).
  const results = [];
  squadsSnap.forEach((d) => {
    const s = d.data();
    const ids = [
      s.gk,
      ...(s.defenders || []),
      ...(s.midfielders || []),
      ...(s.forwards || []),
    ].filter(Boolean);

    let total = 0;
    ids.forEach((pid) => {
      const pts = pointsByPlayerId[pid] || 0;
      total += pts;
      if (pid === s.captainId) total += pts * (PTS.captainMultiplier - 1);
    });
    results.push({ uid: d.id, total, old: s.dtPoints || 0 });
  });

  results.sort((a, b) => b.total - a.total);
  console.log("\nPuntos DT calculados:");
  console.log("─".repeat(46));
  results.forEach((r, i) => {
    const arrow = r.total !== r.old ? `  (antes ${r.old})` : "";
    console.log(`${String(i + 1).padStart(2)}. ${r.uid.slice(0, 18).padEnd(20)} ${String(r.total).padStart(4)} pts${arrow}`);
  });
  console.log("─".repeat(46));
  console.log(`Equipos: ${results.length}\n`);

  if (DRY_RUN) {
    console.log("DRY-RUN: no se escribio nada. Quita --dry-run para guardar.\n");
    return;
  }

  const now = Timestamp.now();
  for (let i = 0; i < results.length; i += 500) {
    const batch = db.batch();
    for (const r of results.slice(i, i + 500)) {
      batch.set(
        db.collection("dtSquads").doc(r.uid),
        { dtPoints: r.total, dtPointsUpdatedAt: now },
        { merge: true }
      );
    }
    await batch.commit();
  }
  console.log(`Listo. ${results.length} equipos actualizados.\n`);
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error calculando puntos DT:", err.message || err);
    process.exit(1);
  });
