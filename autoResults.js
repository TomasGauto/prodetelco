// Bot de resultados del PRODE Mundial 2026.
//
// Obtiene los resultados oficiales desde football-data.org, los carga en
// matches/{id} (solo partidos TERMINADOS de fase de grupos) y recalcula el
// ranking del PRODE reutilizando scoreData.js.
//
// Queda corriendo como proceso de larga duracion y dispara automaticamente
// a las 21:00 y 04:00 (hora Argentina, UTC-3).
//
// Uso:
//   node autoResults.js                 -> arranca el scheduler (corre una vez al inicio, luego 21:00/04:00)
//   node autoResults.js --once          -> corre una sola vez y sale
//   node autoResults.js --once --dry-run-> corre una vez, muestra cambios, NO escribe nada
//
// Token de football-data.org (registro gratis en https://www.football-data.org/client/register):
//   - Variable de entorno FOOTBALL_DATA_TOKEN=xxxx
//   - o un archivo fd-token.txt en la raiz del proyecto con el token adentro.
//
// Credenciales admin (igual que scoreData.js): la service account JSON
// prodetelco-firebase-adminsdk-*.json en la raiz, o GOOGLE_APPLICATION_CREDENTIALS.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ONCE = process.argv.includes("--once");
const DRY_RUN = process.argv.includes("--dry-run");
const PROJECT_ID = "prodetelco";
const COMPETITION = process.env.FD_COMPETITION || "WC"; // World Cup
const RUN_HOURS_ART = [4, 21]; // 04:00 y 21:00 hora Argentina
const ART_OFFSET_MS = 3 * 60 * 60 * 1000; // ART = UTC-3 (sin horario de verano)

// ── Codigos FIFA de nuestros 48 equipos ──────────────────────────────
const KNOWN_FIFA = new Set([
  "MEX", "RSA", "KOR", "CZE", "CAN", "BIH", "QAT", "SUI", "BRA", "MAR",
  "HAI", "SCO", "USA", "PAR", "AUS", "TUR", "GER", "CUW", "CIV", "ECU",
  "NED", "JPN", "SWE", "TUN", "BEL", "EGY", "IRN", "NZL", "ESP", "CPV",
  "KSA", "URU", "FRA", "SEN", "IRQ", "NOR", "ARG", "ALG", "AUT", "JOR",
  "POR", "COD", "UZB", "COL", "ENG", "CRO", "GHA", "PAN",
]);

// ── Nombre de pais (football-data, en ingles) -> codigo FIFA ─────────
const NAME_TO_FIFA = {
  "mexico": "MEX", "south africa": "RSA",
  "korea republic": "KOR", "south korea": "KOR",
  "czechia": "CZE", "czech republic": "CZE",
  "canada": "CAN",
  "bosnia and herzegovina": "BIH", "bosnia herzegovina": "BIH",
  "qatar": "QAT", "switzerland": "SUI", "brazil": "BRA", "morocco": "MAR",
  "haiti": "HAI", "scotland": "SCO",
  "united states": "USA", "usa": "USA", "united states of america": "USA",
  "paraguay": "PAR", "australia": "AUS", "turkey": "TUR", "turkiye": "TUR",
  "germany": "GER", "curacao": "CUW",
  "ivory coast": "CIV", "cote d ivoire": "CIV",
  "ecuador": "ECU", "netherlands": "NED", "japan": "JPN", "sweden": "SWE",
  "tunisia": "TUN", "belgium": "BEL", "egypt": "EGY",
  "iran": "IRN", "ir iran": "IRN", "new zealand": "NZL", "spain": "ESP",
  "cape verde": "CPV", "cabo verde": "CPV", "saudi arabia": "KSA",
  "uruguay": "URU", "france": "FRA", "senegal": "SEN", "iraq": "IRQ",
  "norway": "NOR", "argentina": "ARG", "algeria": "ALG", "austria": "AUT",
  "jordan": "JOR", "portugal": "POR",
  "dr congo": "COD", "congo dr": "COD", "congo kinshasa": "COD",
  "democratic republic of congo": "COD", "democratic republic of the congo": "COD",
  "uzbekistan": "UZB", "colombia": "COL", "england": "ENG", "croatia": "CRO",
  "ghana": "GHA", "panama": "PAN",
};

// ── Helpers ──────────────────────────────────────────────────────────
const isNum = (v) => typeof v === "number" && !Number.isNaN(v);

const normalize = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca diacriticos
    .replace(/[.\-']/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const artStamp = (d = new Date()) => {
  const a = new Date(d.getTime() - ART_OFFSET_MS);
  const p = (n) => String(n).padStart(2, "0");
  return `${a.getUTCFullYear()}-${p(a.getUTCMonth() + 1)}-${p(a.getUTCDate())} ` +
    `${p(a.getUTCHours())}:${p(a.getUTCMinutes())} ART`;
};

const log = (...args) => console.log(`[${artStamp()}]`, ...args);

const fifaOf = (team) => {
  if (!team) return null;
  const tla = (team.tla || "").toUpperCase();
  if (KNOWN_FIFA.has(tla)) return tla;
  return (
    NAME_TO_FIFA[normalize(team.name)] ||
    NAME_TO_FIFA[normalize(team.shortName)] ||
    null
  );
};

// ── Token football-data.org ──────────────────────────────────────────
const loadToken = () => {
  const fromEnv = process.env.FOOTBALL_DATA_TOKEN;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  if (existsSync("fd-token.txt")) {
    const fromFile = readFileSync("fd-token.txt", "utf8").trim();
    if (fromFile) return fromFile;
  }
  return null;
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

// ── Trae los partidos terminados desde football-data.org ─────────────
const fetchFinishedMatches = async (token) => {
  const url = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches?status=FINISHED`;
  const res = await fetch(url, { headers: { "X-Auth-Token": token } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `football-data devolvio HTTP ${res.status}. ` +
        (res.status === 403
          ? "El token no tiene acceso a esta competicion en el plan gratuito."
          : res.status === 429
          ? "Rate limit (free tier: 10 req/min). Reintenta mas tarde."
          : res.status === 400
          ? "El token es invalido o falta el header X-Auth-Token."
          : body.slice(0, 200))
    );
  }
  const data = await res.json();
  return Array.isArray(data.matches) ? data.matches : [];
};

// Un partido es de eliminatorias si su round no es numerico (ej. "R32", "R16").
// Los de grupos tienen round 1/2/3.
const isKnockoutMatch = (m) => !!(m.round && Number.isNaN(Number(m.round)));

// ── Indice de NUESTROS partidos: "HOME>AWAY" (FIFA) -> [docs] ─────────
// Guarda un array por cruce: dos equipos podrian enfrentarse en grupos Y en
// el mano a mano, asi que no alcanza con una sola entrada por par.
const buildOurIndex = (matchesSnap) => {
  const index = new Map();
  matchesSnap.forEach((d) => {
    const m = d.data();
    const homeFifa = (m.homeTeamId || "").split("_")[0];
    const awayFifa = (m.awayTeamId || "").split("_")[0];
    if (!homeFifa || !awayFifa) return;
    const key = `${homeFifa}>${awayFifa}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({
      id: d.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      ko: isKnockoutMatch(m),
    });
  });
  return index;
};

// Elige el partido nuestro que corresponde a un resultado de la API: prioriza
// los del mismo tipo (grupo/knockout) y, entre esos, el que todavia no tiene
// resultado cargado. Asi un cruce repetido no se pisa.
const pickOur = (list, wantKO) => {
  if (!list || !list.length) return null;
  const sameStage = list.filter((x) => x.ko === wantKO);
  const pool = sameStage.length ? sameStage : list;
  return pool.find((x) => !isNum(x.homeScore) || !isNum(x.awayScore)) || pool[0];
};

// ── Calcula que partidos hay que actualizar ──────────────────────────
const computeUpdates = (apiMatches, index) => {
  const updates = [];
  const unresolved = [];

  for (const am of apiMatches) {
    const ft = am.score?.fullTime || {};
    if (!isNum(ft.home) || !isNum(ft.away)) continue;
    const wantKO = !!(am.stage && am.stage !== "GROUP_STAGE"); // grupos o eliminatorias

    const hf = fifaOf(am.homeTeam);
    const af = fifaOf(am.awayTeam);
    if (!hf || !af) {
      unresolved.push(`${am.homeTeam?.name} vs ${am.awayTeam?.name}`);
      continue;
    }

    // Orientacion directa; si no, invertida (y se intercambian los goles).
    let our = pickOur(index.get(`${hf}>${af}`), wantKO);
    let home = ft.home;
    let away = ft.away;
    if (!our) {
      our = pickOur(index.get(`${af}>${hf}`), wantKO);
      home = ft.away;
      away = ft.home;
    }
    if (!our) {
      unresolved.push(`${hf} vs ${af} (sin match en nuestra base)`);
      continue;
    }

    const changed = our.homeScore !== home || our.awayScore !== away;
    if (changed) {
      updates.push({
        id: our.id,
        label: `${our.homeTeam} ${home}-${away} ${our.awayTeam}`,
        prev:
          isNum(our.homeScore) && isNum(our.awayScore)
            ? `${our.homeScore}-${our.awayScore}`
            : null,
        homeScore: home,
        awayScore: away,
      });
    }
  }
  return { updates, unresolved };
};

// ── Un ciclo completo: fetch -> cargar -> recalcular ranking ──────────
const runOnce = async (db, token) => {
  log("Buscando resultados en football-data.org...");
  const apiMatches = await fetchFinishedMatches(token);
  log(`Partidos terminados segun la API: ${apiMatches.length}`);

  const matchesSnap = await db.collection("matches").get();
  const index = buildOurIndex(matchesSnap);
  const { updates, unresolved } = computeUpdates(apiMatches, index);

  if (unresolved.length) {
    log(`Sin mapear (${unresolved.length}): ${unresolved.slice(0, 8).join(" | ")}`);
  }

  if (updates.length === 0) {
    log("No hay resultados nuevos para cargar.");
    return 0;
  }

  log(`Resultados a cargar (${updates.length}):`);
  updates.forEach((u) =>
    console.log(`   ${u.label}${u.prev ? `  (antes ${u.prev})` : "  (nuevo)"}`)
  );

  if (DRY_RUN) {
    log("DRY-RUN: no se escribio nada.");
    return updates.length;
  }

  const batch = db.batch();
  for (const u of updates) {
    batch.update(db.collection("matches").doc(u.id), {
      homeScore: u.homeScore,
      awayScore: u.awayScore,
    });
  }
  await batch.commit();
  log(`${updates.length} resultado(s) cargado(s) en Firestore.`);

  // Recalcula el ranking del PRODE reutilizando el script existente.
  log("Recalculando ranking (scoreData.js)...");
  try {
    execFileSync(process.execPath, ["scoreData.js"], { stdio: "inherit" });
  } catch (err) {
    log("Aviso: scoreData.js fallo:", err.message);
  }
  return updates.length;
};

// ── Scheduler: proxima ejecucion a las 21:00 o 04:00 ART ─────────────
const msUntilNextRun = () => {
  const nowMs = Date.now();
  const art = new Date(nowMs - ART_OFFSET_MS); // getters UTC = hora ART
  const y = art.getUTCFullYear();
  const mo = art.getUTCMonth();
  const d = art.getUTCDate();
  let best = Infinity;
  for (let off = 0; off <= 1; off++) {
    for (const h of RUN_HOURS_ART) {
      const cand = Date.UTC(y, mo, d + off, h, 0, 0) + ART_OFFSET_MS;
      if (cand > nowMs + 1000 && cand < best) best = cand;
    }
  }
  return best - nowMs;
};

const scheduleNext = (db, token) => {
  const delay = msUntilNextRun();
  const when = new Date(Date.now() + delay);
  log(`Proxima ejecucion: ${artStamp(when)} (en ${(delay / 3.6e6).toFixed(1)} h)`);
  setTimeout(async () => {
    try {
      await runOnce(db, token);
    } catch (err) {
      log("Error en la ejecucion programada:", err.message);
    }
    scheduleNext(db, token);
  }, delay);
};

// ── Main ─────────────────────────────────────────────────────────────
const main = async () => {
  const token = loadToken();
  if (!token) {
    console.error(
      "\nFalta el token de football-data.org.\n" +
        "  1. Registrate gratis en https://www.football-data.org/client/register\n" +
        "  2. Defini FOOTBALL_DATA_TOKEN=tu_token  (o crea fd-token.txt con el token en la raiz)\n"
    );
    process.exit(1);
  }

  const db = initAdmin();

  if (ONCE) {
    await runOnce(db, token);
    process.exit(0);
  }

  log("Bot de resultados iniciado. Ejecucion inicial + horarios 04:00 y 21:00 ART.");
  try {
    await runOnce(db, token);
  } catch (err) {
    log("Error en la ejecucion inicial:", err.message);
  }
  scheduleNext(db, token);
};

main().catch((err) => {
  console.error("Error fatal:", err.message || err);
  process.exit(1);
});
