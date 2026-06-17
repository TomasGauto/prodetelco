// Genera src/data/puntajes.json (modo DT) con DATOS REALES del Mundial 2026.
// Fuente de eventos: matchData.json (alineaciones, goles, asistencias, tarjetas
//   reales, investigadas en fuentes confiables — ESPN/FotMob/Sky/etc).
// Nombres/posiciones oficiales: colección `players` (API-Football).
//
// Criterio de puntaje (afinado para que sea coherente, no mecánico):
//  base 5.0; gol +1.6 (DEL/MED) o +2.6 (DEF/ARQ); asistencia +0.9;
//  valla invicta +1.3 (ARQ/DEF); -0.4 por gol recibido (tope -2.0);
//  amarilla -0.5; roja -2.5; autogol -2.5; figura +0.8.
//  El resultado pesa: ganar +0.3 (goleada +0.5), perder -0.3 (goleado -0.6).
//  Solo lo excepcional llega a 10 (ej. el hat-trick de Messi).
//
// Run: node genPuntajes.js  (requiere service account, igual que scoreData.js)

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const clamp = (r) => Math.max(1, Math.min(10, Math.round(r * 10) / 10));
const POS_LABEL = { GK: "ARQ", DEF: "DEF", MID: "MED", FWD: "DEL" };
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

// Alias: nombre (como viene en matchData) -> nombre exacto en la colección.
// Necesario para los coreanos (la base los guarda al orden occidental).
const ALIAS = {
  // Coreanos (la base los guarda al orden occidental)
  "son heung min": "Heungmin Son", "kim seung gyu": "Seunggyu Kim",
  "lee han beom": "Hanbeom Lee", "kim min jae": "Minjae Kim",
  "lee gi hyuk": "Gihyuk Lee", "seol young woo": "Youngwoo Seol",
  "hwang in beom": "Inbeom Hwang", "paik seung ho": "Seungho Paik",
  "lee tae seok": "Taeseok Lee", "lee kang in": "Kangin Lee",
  "lee jae sung": "Jaesung Lee", "oh hyeon gyu": "Hyeongyu Oh",
  // Apodos / nombres que difieren entre fuente y base
  "casemiro": "Carlos Casimiro", "raphinha": "Raphael Belloli", "marquinhos": "Marcos Corrêa",
  "alisson": "Alisson Becker", "bono": "Yassine Bounou",
  "rodri": "Rodrigo Hernández", "pedri": "Pedro López", "gavi": "Pablo Gavira",
  "mahmoud abunada": "Mahmoud Abu Nada", "sidny lopes cabral": "Sidny Cabral",
  "mohammed abu al shamat": "Mohammed Abu Alshamat",
  "shahriar moghanlou": "Shahriyar Moghanloo", "ehsan hajsafi": "Ehsan Hajisafi",
  "el hadji malick diouf": "El Hadji Diouf", "idrissa gana gueye": "Idrissa Gueye",
  "akam hashem": "Akam Hashim", "mostafa shobeir": "Mostafa Shoubir",
  "yazeed abulaila": "Yazeed Abu Laila", "mohammad abu hashish": "Mohammad Abu Hasheesh",
};

const normalize = (s) =>
  (s || "").toLowerCase()
    .replace(/ı/g, "i").replace(/İ/g, "i").replace(/ø/g, "o")
    .replace(/ð/g, "d").replace(/ł/g, "l").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[.\-']/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const slug = (s) => normalize(s).replace(/ /g, "");
const lastTok = (n) => n.split(" ").slice(-1)[0] || "";

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

// Resuelve un nombre (matchData) contra la plantilla real de su país.
const resolvePlayer = (rawName, team, byCountry, scored, isGK) => {
  const squad = byCountry[team] || { byNorm: new Map(), byLast: new Map() };
  const n = normalize(rawName);
  // 1) match directo
  if (squad.byNorm.has(n)) return squad.byNorm.get(n);
  // 2) alias
  if (ALIAS[n]) {
    const an = normalize(ALIAS[n]);
    if (squad.byNorm.has(an)) return squad.byNorm.get(an);
  }
  // 3) apellido único dentro del país
  const cands = squad.byLast.get(lastTok(n));
  if (cands && cands.length === 1) return cands[0];
  // 4) sintético (no está en la base): el 1° del XI es arquero
  unmatched.push(`${rawName} (${team})`);
  return { name: rawName, position: isGK ? "GK" : scored ? "FWD" : "MID", synthetic: true };
};

const resultCtx = (gf, ga) => {
  const m = Math.abs(gf - ga);
  if (gf > ga) return m >= 3 ? 0.5 : 0.3;
  if (gf < ga) return m >= 3 ? -0.6 : -0.3;
  return 0;
};

const buildHighlight = (st, isMVP, isGK, isDEF, conceded, ctx) => {
  const p = [];
  const isGKDEF = isGK || isDEF;
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
  if (p.length === 0) {
    if (ctx > 0) p.push("Cumplió y aportó en el triunfo.");
    else if (ctx < 0) p.push("Pasó sin pena ni gloria en la derrota.");
    else p.push("Trabajo discreto, sin incidir en el marcador.");
  }
  return p.join(" ");
};

const run = async () => {
  const db = initAdmin();
  const snap = await db.collection("players").get();
  const byCountry = {};
  snap.forEach((d) => {
    const pl = d.data();
    const c = pl.country;
    if (!byCountry[c]) byCountry[c] = { byNorm: new Map(), byLast: new Map() };
    const obj = { id: d.id, name: pl.name, position: pl.position };
    const n = normalize(pl.name);
    byCountry[c].byNorm.set(n, obj);
    const lt = lastTok(n);
    if (!byCountry[c].byLast.has(lt)) byCountry[c].byLast.set(lt, []);
    byCountry[c].byLast.get(lt).push(obj);
  });

  const data = JSON.parse(readFileSync("matchData.json", "utf8"));

  const out = data.map((m) => {
    const [hg, ag] = m.score.split("-").map((x) => parseInt(x.trim(), 10));
    const scoreOf = { [m.home]: hg, [m.away]: ag };
    const concededOf = { [m.home]: ag, [m.away]: hg };

    // set de nombres que jugaron, por equipo (XI + suplentes + nombrados)
    const playedNames = { [m.home]: new Set(), [m.away]: new Set() };
    (m.homeXI || []).forEach((n) => playedNames[m.home].add(n));
    (m.awayXI || []).forEach((n) => playedNames[m.away].add(n));
    (m.homeSubs || []).forEach((n) => playedNames[m.home].add(n));
    (m.awaySubs || []).forEach((n) => playedNames[m.away].add(n));
    m.goals.forEach((g) => playedNames[g.team]?.add(g.scorer));
    m.goals.forEach((g) => { if (g.assist) playedNames[g.team]?.add(g.assist); });
    (m.yellows || []).forEach((y) => playedNames[y.team]?.add(y.name));
    (m.reds || []).forEach((r) => playedNames[r.team]?.add(r.name));

    const scorers = new Set(m.goals.filter((g) => !g.og).map((g) => g.team + "|" + normalize(g.scorer)));
    const gkOf = { [m.home]: normalize((m.homeXI || [])[0]), [m.away]: normalize((m.awayXI || [])[0]) };
    const perf = [];

    for (const team of [m.home, m.away]) {
      const conceded = concededOf[team];
      const ctx = resultCtx(scoreOf[team], concededOf[team]);
      for (const rawName of playedNames[team]) {
        const nm = normalize(rawName);
        const isScorer = scorers.has(team + "|" + nm);
        const p = resolvePlayer(rawName, team, byCountry, isScorer, nm === gkOf[team]);
        const pos = p.position;
        const isGK = pos === "GK", isDEF = pos === "DEF", isGKDEF = isGK || isDEF;

        const goalList = m.goals.filter((g) => g.team === team && !g.og && normalize(g.scorer) === nm);
        const goals = goalList.length;
        const assists = m.goals.filter((g) => g.assist && normalize(g.assist) === nm).length;
        const own = m.goals.filter((g) => g.team === team && g.og && normalize(g.scorer) === nm).length;
        const yellow = (m.yellows || []).filter((y) => y.team === team && normalize(y.name) === nm).length;
        const red = (m.reds || []).filter((r) => r.team === team && normalize(r.name) === nm).length;
        const isMVP = m.mvp.team === team && normalize(m.mvp.name) === nm;
        const st = { goals, assists, yellow_cards: yellow, red_cards: red, own_goals: own };

        let r = 5.0 + ctx;
        r += goals * (isGKDEF ? 2.6 : 1.6);
        r += assists * 0.9;
        if (isGKDEF && conceded === 0 && !red) r += 1.3;
        if (isGKDEF) r += Math.max(-2.0, conceded * -0.4);
        r += yellow * -0.5;
        r += red * -2.5;
        r += own * -2.5;
        if (isMVP) r += 0.8;
        let rating = clamp(r);
        if (isMVP) rating = Math.max(rating, 7.0); // la figura del partido no baja de 7

        perf.push({
          player_id: p.id || `${team.toLowerCase()}_${slug(p.name)}`,
          name: p.name, team, position: POS_LABEL[pos] || pos,
          rating, is_mvp: isMVP, stats_summary: st,
          highlight: buildHighlight(st, isMVP, isGK, isDEF, conceded, ctx),
        });
      }
    }

    perf.sort((a, b) => b.rating - a.rating);
    return {
      match_id: m.id, date: m.date || null,
      home_team: NAME[m.home], away_team: NAME[m.away], score: `${hg} - ${ag}`,
      dt_stats: { tactical_analysis: m.analysis, players_performance: perf },
    };
  });

  writeFileSync("src/data/puntajes.json", JSON.stringify(out, null, 2), "utf8");
  console.log(`puntajes.json: ${out.length} partidos, ${out.reduce((a, x) => a + x.dt_stats.players_performance.length, 0)} jugadores.`);
  if (unmatched.length) {
    console.log(`\n⚠️  Sin match en la base (${[...new Set(unmatched)].length}): ${[...new Set(unmatched)].join(", ")}`);
  } else {
    console.log("Todos los jugadores matchearon con la base. ✅");
  }
};

run().then(() => process.exit(0)).catch((e) => { console.error("Error:", e); process.exit(1); });
