// Scrapea ESPN (API pública gratis) de TODOS los partidos jugados del Mundial 2026,
// calcula los puntajes del DT con las reglas de PUNTAJESDT, y los guarda en Firestore
// (doc dt/puntajes). El front los lee en vivo, así el cron actualiza sin deploy.
//
// Run:  node dtAuto.js --dry-run   -> scrapea, calcula y muestra (no escribe)
//       node dtAuto.js             -> ademas escribe en Firestore dt/puntajes
//
// Pensado para correr en un cron diario (04:00 ART). Requiere service account admin.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DRY_RUN = process.argv.includes("--dry-run");
const NO_DB = process.argv.includes("--no-db"); // prueba ESPN sin leer Firestore
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const START = "2026-06-11"; // primer dia del Mundial

const clamp = (r) => Math.max(1, Math.min(10, Math.round(r * 10) / 10));
const POS_LABEL = { GK: "ARQ", DEF: "DEF", MID: "MED", FWD: "DEL" };
const ESPN_POS = { G: "GK", D: "DEF", M: "MID", F: "FWD" };

const NAME = {
  MEX: "México", RSA: "Sudáfrica", KOR: "Corea del Sur", CZE: "República Checa",
  CAN: "Canadá", BIH: "Bosnia y Herzegovina", USA: "Estados Unidos", PAR: "Paraguay",
  QAT: "Qatar", SUI: "Suiza", BRA: "Brasil", MAR: "Marruecos", HAI: "Haití",
  SCO: "Escocia", AUS: "Australia", TUR: "Turquía", GER: "Alemania", CUW: "Curazao",
  CIV: "Costa de Marfil", ECU: "Ecuador", NED: "Países Bajos", JPN: "Japón",
  SWE: "Suecia", TUN: "Túnez", BEL: "Bélgica", EGY: "Egipto", ESP: "España",
  CPV: "Cabo Verde", KSA: "Arabia Saudita", URU: "Uruguay", IRN: "Irán",
  NZL: "Nueva Zelanda", FRA: "Francia", SEN: "Senegal", IRQ: "Irak", NOR: "Noruega",
  ARG: "Argentina", ALG: "Argelia", AUT: "Austria", JOR: "Jordania",
};

const normalize = (s) =>
  (s || "").toLowerCase()
    .replace(/ı/g, "i").replace(/İ/g, "i").replace(/ø/g, "o")
    .replace(/ð/g, "d").replace(/ł/g, "l").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[.\-']/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const slug = (s) => normalize(s).replace(/ /g, "");
const lastTok = (n) => n.split(" ").slice(-1)[0] || "";

// Nombre de pais (ESPN, ingles) -> FIFA
const TEAM_FIFA = {};
[
  ["mexico", "MEX"], ["south africa", "RSA"], ["south korea", "KOR"], ["korea republic", "KOR"],
  ["czechia", "CZE"], ["czech republic", "CZE"], ["canada", "CAN"],
  ["bosnia and herzegovina", "BIH"], ["bosnia herzegovina", "BIH"], ["bosnia & herzegovina", "BIH"],
  ["united states", "USA"], ["usa", "USA"], ["paraguay", "PAR"], ["qatar", "QAT"],
  ["switzerland", "SUI"], ["brazil", "BRA"], ["morocco", "MAR"], ["haiti", "HAI"],
  ["scotland", "SCO"], ["australia", "AUS"], ["turkey", "TUR"], ["turkiye", "TUR"],
  ["germany", "GER"], ["curacao", "CUW"], ["ivory coast", "CIV"], ["cote d ivoire", "CIV"],
  ["ecuador", "ECU"], ["netherlands", "NED"], ["japan", "JPN"], ["sweden", "SWE"],
  ["tunisia", "TUN"], ["belgium", "BEL"], ["egypt", "EGY"], ["spain", "ESP"],
  ["cape verde", "CPV"], ["cabo verde", "CPV"], ["saudi arabia", "KSA"], ["uruguay", "URU"],
  ["iran", "IRN"], ["ir iran", "IRN"], ["new zealand", "NZL"], ["france", "FRA"],
  ["senegal", "SEN"], ["iraq", "IRQ"], ["norway", "NOR"], ["argentina", "ARG"],
  ["algeria", "ALG"], ["austria", "AUT"], ["jordan", "JOR"], ["england", "ENG"],
  ["croatia", "CRO"], ["ghana", "GHA"], ["panama", "PAN"], ["portugal", "POR"],
  ["dr congo", "COD"], ["uzbekistan", "UZB"], ["colombia", "COL"],
].forEach(([n, f]) => { TEAM_FIFA[n] = f; });

const ALIAS = {
  "son heung min": "Heungmin Son", "kim seung gyu": "Seunggyu Kim",
  "lee han beom": "Hanbeom Lee", "kim min jae": "Minjae Kim", "lee gi hyuk": "Gihyuk Lee",
  "seol young woo": "Youngwoo Seol", "hwang in beom": "Inbeom Hwang", "paik seung ho": "Seungho Paik",
  "lee tae seok": "Taeseok Lee", "lee kang in": "Kangin Lee", "lee jae sung": "Jaesung Lee",
  "oh hyeon gyu": "Hyeongyu Oh", "casemiro": "Carlos Casimiro", "raphinha": "Raphael Belloli",
  "marquinhos": "Marcos Corrêa", "alisson": "Alisson Becker", "bono": "Yassine Bounou",
  "rodri": "Rodrigo Hernández", "pedri": "Pedro López", "gavi": "Pablo Gavira",
  "nico gonzalez": "Nicolás González",
};

// ── ESPN fetch ───────────────────────────────────────────────────────
const getJson = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`ESPN ${res.status} en ${url}`);
  return res.json();
};

const datesRange = () => {
  const out = [];
  const d = new Date(START + "T12:00:00Z");
  const end = new Date(); end.setUTCDate(end.getUTCDate() + 1);
  while (d <= end) {
    out.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
};

const getFinishedEvents = async () => {
  const ids = new Set();
  for (const date of datesRange()) {
    try {
      const j = await getJson(`${ESPN}/scoreboard?dates=${date}`);
      (j.events || []).forEach((e) => {
        const st = e.status?.type;
        if (st?.completed || st?.state === "post") ids.add(e.id);
      });
    } catch { /* dia sin datos */ }
  }
  return [...ids];
};

const fifaOfTeam = (t) => TEAM_FIFA[normalize(t?.displayName || t?.name || "")] || null;

// Extrae lo que necesitamos de un partido de ESPN.
const parseMatch = (s) => {
  const comp = s.header?.competitions?.[0];
  if (!comp) return null;
  const teamsById = {};
  (comp.competitors || []).forEach((c) => {
    teamsById[c.team?.id] = { fifa: fifaOfTeam(c.team), home: c.homeAway === "home", score: parseInt(c.score, 10) };
  });
  const rosters = s.rosters || [];
  if (rosters.length < 2) return null;

  // jugadores por equipo (titulares + posicion) y set de quien jugo
  const played = {}; // fifa -> Map(normName -> {name, pos, starter})
  const teamFifaById = {};
  rosters.forEach((r) => {
    const fifa = fifaOfTeam(r.team);
    if (!fifa) return;
    teamFifaById[r.team?.id] = fifa;
    played[fifa] = new Map();
    (r.roster || []).forEach((p) => {
      const name = p.athlete?.displayName;
      if (!name) return;
      const pos = ESPN_POS[p.position?.abbreviation] || "MID";
      // titular, o entro de cambio (subbedIn), o jugo
      const inGame = p.starter || p.subbedIn || p.didNotPlay === false;
      if (p.starter || p.subbedIn) played[fifa].set(normalize(name), { name, pos, starter: !!p.starter });
    });
  });

  const home = teamsById[Object.keys(teamsById).find((id) => teamsById[id].home)];
  const away = teamsById[Object.keys(teamsById).find((id) => !teamsById[id].home)];
  if (!home?.fifa || !away?.fifa) return null;

  // eventos: goles, autogoles, tarjetas
  const goals = [], cards = [];
  (s.keyEvents || []).forEach((k) => {
    const txt = k.type?.text || "";
    const teamFifa = teamFifaById[k.team?.id] || fifaOfTeam(k.team);
    const parts = (k.participants || []).map((p) => p.athlete?.displayName).filter(Boolean);
    if (/own goal/i.test(txt) || /own goal/i.test(k.text || "")) {
      const scorer = parts[0];
      if (scorer) goals.push({ scorer, team: teamFifa, og: true });
    } else if (k.scoringPlay || /goal/i.test(txt)) {
      const scorer = parts[0];
      if (scorer) goals.push({ scorer, team: teamFifa, assist: parts[1] || null });
    } else if (/yellow/i.test(txt)) {
      if (parts[0]) cards.push({ name: parts[0], team: teamFifa, type: "Y" });
    } else if (/red/i.test(txt) || /second yellow/i.test(txt)) {
      if (parts[0]) cards.push({ name: parts[0], team: teamFifa, type: "R" });
    }
  });

  return {
    id: s.header?.id, home: home.fifa, away: away.fifa,
    hg: home.score, ag: away.score, played, goals, cards,
  };
};

// ── Rating (reglas afinadas, igual que genPuntajes) ──────────────────
const resultCtx = (gf, ga) => {
  const m = Math.abs(gf - ga);
  if (gf > ga) return m >= 3 ? 0.5 : 0.3;
  if (gf < ga) return m >= 3 ? -0.6 : -0.3;
  return 0;
};

const initAdmin = () => {
  let saFile = null;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    saFile = readdirSync(".").find((f) => f.startsWith("prodetelco-firebase-adminsdk") && f.endsWith(".json"));
  }
  initializeApp({
    credential: saFile && existsSync(saFile) ? cert(JSON.parse(readFileSync(saFile, "utf8"))) : applicationDefault(),
    projectId: "prodetelco",
  });
  return getFirestore();
};

const unmatched = [];
const resolveId = (rawName, fifa, byCountry, scored, gkName) => {
  const squad = byCountry[fifa] || { byNorm: new Map(), byLast: new Map() };
  const n = normalize(rawName);
  if (squad.byNorm.has(n)) return squad.byNorm.get(n);
  if (ALIAS[n] && squad.byNorm.has(normalize(ALIAS[n]))) return squad.byNorm.get(normalize(ALIAS[n]));
  const cands = squad.byLast.get(lastTok(n));
  if (cands && cands.length === 1) return cands[0];
  unmatched.push(`${rawName} (${fifa})`);
  return null;
};

const buildHighlight = (st, isMVP, isGK, isDEF, conceded, ctx) => {
  const p = []; const isGKDEF = isGK || isDEF;
  if (isMVP) p.push("Figura del partido.");
  if (st.goals >= 3) p.push("Hat-trick demoledor.");
  else if (st.goals === 2) p.push("Autor de un doblete.");
  else if (st.goals === 1) p.push(isGKDEF ? "Apareció para marcar." : "Marcó un gol.");
  if (st.assists) p.push(st.assists > 1 ? `Repartió ${st.assists} asistencias.` : "Dio una asistencia.");
  if (st.own_goals) p.push("En contra: marcó en su propia valla.");
  if (st.red_cards) p.push("Expulsado, dejó a su equipo con uno menos.");
  else if (st.yellow_cards) p.push("Amonestado.");
  if (!st.red_cards && isGKDEF && conceded === 0 && !st.goals && !isMVP)
    p.push(isGK ? "Seguro bajo los tres palos, valla invicta." : "Sólido atrás, mantuvo el cero.");
  if (isGKDEF && conceded >= 4 && !isMVP && !st.goals)
    p.push(isGK ? "Goleado, tarde para el olvido." : "Superado en la caída del equipo.");
  if (!p.length) p.push(ctx > 0 ? "Cumplió y aportó en el triunfo." : ctx < 0 ? "Pasó sin pena ni gloria en la derrota." : "Trabajo discreto, sin incidir en el marcador.");
  return p.join(" ");
};

const scoreMatch = (mt, byCountry) => {
  const concededOf = { [mt.home]: mt.ag, [mt.away]: mt.hg };
  const scoreOf = { [mt.home]: mt.hg, [mt.away]: mt.ag };
  const perf = [];
  let figura = null;

  for (const team of [mt.home, mt.away]) {
    const conceded = concededOf[team];
    const ctx = resultCtx(scoreOf[team], concededOf[team]);
    const list = mt.played[team] || new Map();
    for (const [nm, info] of list) {
      const p = resolveId(info.name, team, byCountry, false) || { id: null, name: info.name, position: info.pos };
      const pos = p.position || info.pos;
      const isGK = pos === "GK", isDEF = pos === "DEF", isGKDEF = isGK || isDEF;

      const goals = mt.goals.filter((g) => g.team === team && !g.og && normalize(g.scorer) === nm).length;
      const assists = mt.goals.filter((g) => g.assist && normalize(g.assist) === nm).length;
      const own = mt.goals.filter((g) => g.team === team && g.og && normalize(g.scorer) === nm).length;
      const yellow = mt.cards.filter((c) => c.team === team && c.type === "Y" && normalize(c.name) === nm).length;
      const red = mt.cards.filter((c) => c.team === team && c.type === "R" && normalize(c.name) === nm).length;
      const st = { goals, assists, yellow_cards: yellow, red_cards: red, own_goals: own };

      let r = 5.0 + ctx;
      r += goals * (isGKDEF ? 2.6 : 1.6);
      r += assists * 0.9;
      if (isGKDEF && conceded === 0 && !red) r += 1.3;
      if (isGKDEF) r += Math.max(-2.0, conceded * -0.5);
      r += yellow * -0.5; r += red * -2.5; r += own * -2.5;
      const rating = clamp(r);

      const entry = {
        player_id: p.id || `${team.toLowerCase()}_${slug(info.name)}`,
        name: p.name || info.name, team, position: POS_LABEL[pos] || pos,
        rating, is_mvp: false, stats_summary: st, _isGK: isGK, _isDEF: isDEF, _conceded: conceded, _ctx: ctx,
      };
      perf.push(entry);
      if (!figura || rating > figura.rating) figura = entry;
    }
  }

  // figura = mejor rating, con piso 7.0 y bonus
  if (figura) {
    figura.is_mvp = true;
    figura.rating = Math.max(7.0, clamp(figura.rating + 0.8));
  }
  perf.forEach((e) => {
    e.highlight = buildHighlight(e.stats_summary, e.is_mvp, e._isGK, e._isDEF, e._conceded, e._ctx);
    delete e._isGK; delete e._isDEF; delete e._conceded; delete e._ctx;
  });
  perf.sort((a, b) => b.rating - a.rating);
  return perf;
};

// ── Main ─────────────────────────────────────────────────────────────
const run = async () => {
  console.log(`\nDT auto (ESPN)${DRY_RUN ? " DRY-RUN" : ""}${NO_DB ? " NO-DB" : ""}...`);
  let db = null;
  const byCountry = {};
  if (!NO_DB) {
    db = initAdmin();
    const snap = await db.collection("players").get();
    snap.forEach((d) => {
      const pl = d.data(); const c = pl.country;
      if (!byCountry[c]) byCountry[c] = { byNorm: new Map(), byLast: new Map() };
      const obj = { id: d.id, name: pl.name, position: pl.position };
      const n = normalize(pl.name);
      byCountry[c].byNorm.set(n, obj);
      const lt = lastTok(n);
      if (!byCountry[c].byLast.has(lt)) byCountry[c].byLast.set(lt, []);
      byCountry[c].byLast.get(lt).push(obj);
    });
  }

  const ids = await getFinishedEvents();
  console.log(`Partidos terminados en ESPN: ${ids.length}`);

  const out = [];
  for (const id of ids) {
    try {
      const s = await getJson(`${ESPN}/summary?event=${id}`);
      const mt = parseMatch(s);
      if (!mt || !mt.home || !mt.away || mt.hg == null || mt.ag == null) continue;
      const perf = scoreMatch(mt, byCountry);
      if (!perf.length) continue;
      out.push({
        match_id: `${mt.home}_${mt.away}`,
        home_team: NAME[mt.home] || mt.home, away_team: NAME[mt.away] || mt.away,
        score: `${mt.hg} - ${mt.ag}`,
        dt_stats: { tactical_analysis: "", players_performance: perf },
      });
    } catch (e) { console.log(`  (skip ${id}: ${e.message})`); }
  }

  console.log(`Generados: ${out.length} partidos, ${out.reduce((a, x) => a + x.dt_stats.players_performance.length, 0)} jugadores.`);
  if (unmatched.length) console.log(`Sin match (${[...new Set(unmatched)].length}): ${[...new Set(unmatched)].slice(0, 30).join(", ")}`);

  if (DRY_RUN || NO_DB) {
    writeFileSync("_dtauto_preview.json", JSON.stringify(out, null, 2), "utf8");
    console.log("DRY-RUN: escrito _dtauto_preview.json (no toca Firestore).");
    return;
  }
  await db.collection("dt").doc("puntajes").set({ matches: out, updatedAt: new Date() });
  console.log("Escrito en Firestore: dt/puntajes.");
};

run().then(() => process.exit(0)).catch((e) => { console.error("Error:", e); process.exit(1); });
