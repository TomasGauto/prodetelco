// Calcula y actualiza los puntos del PRODE Mundial 2026.
// Run:  node scoreData.js            -> calcula y ESCRIBE users/{uid}.totalPoints
//       node scoreData.js --dry-run  -> solo muestra el resultado, no escribe nada
//
// Requiere credenciales de admin (igual que initData.js):
//   - Variable GOOGLE_APPLICATION_CREDENTIALS apuntando a la service account JSON, o
//   - El archivo prodetelco-firebase-adminsdk-*.json presente en la raiz, o
//   - gcloud auth application-default login
//
// Esquema usado:
//   matches/{id}      -> { homeScore, awayScore, group, round, homeTeam, awayTeam, ... }
//   predictions/{id}  -> { userId, matchId, homeScore, awayScore }   (fase de grupos)
//   users/{uid}       -> se actualiza { totalPoints, pointsUpdatedAt }
//
// Solo se puntua la FASE DE GRUPOS (el knockout todavia no esta en vivo).

import { existsSync, readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const DRY_RUN = process.argv.includes("--dry-run");
const PROJECT_ID = "prodetelco";

// ── Puntaje fase de grupos ───────────────────────────────────────────
// Resultado exacto         -> 3 pts
// Ganador o empate correcto -> 1 pt
// Diferencia de gol exacta  -> +1 pt  (implica acertar el signo, no acumula con el exacto)
const PTS_EXACT = 3;
const PTS_OUTCOME = 1;
const PTS_GOAL_DIFF = 1;

const isNum = (v) => typeof v === "number" && !Number.isNaN(v);

// Un partido es de eliminatorias si su round no es numerico (ej. "R32") o no
// tiene group (los de grupos siempre tienen letra de grupo).
const isKnockout = (m) => (m.round != null && Number.isNaN(Number(m.round))) || !m.group;

/**
 * Puntos de una prediccion de grupos contra el resultado real.
 * @returns {number}
 */
const scoreGroupPrediction = (pred, match) => {
  const { homeScore: ph, awayScore: pa } = pred;
  const { homeScore: rh, awayScore: ra } = match;
  if (![ph, pa, rh, ra].every(isNum)) return 0;

  if (ph === rh && pa === ra) return PTS_EXACT; // resultado exacto

  let pts = 0;
  if (Math.sign(ph - pa) === Math.sign(rh - ra)) pts += PTS_OUTCOME; // signo correcto (1/X/2)
  if (ph - pa === rh - ra) pts += PTS_GOAL_DIFF; // diferencia de gol exacta
  return pts;
};

// ── Init firebase-admin ──────────────────────────────────────────────
const findServiceAccount = () => {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return null; // usar ADC
  const local = readdirSync(".").find(
    (f) => f.startsWith("prodetelco-firebase-adminsdk") && f.endsWith(".json")
  );
  return local && existsSync(local) ? local : null;
};

let app;
try {
  const saFile = findServiceAccount();
  app = initializeApp({
    credential: saFile
      ? cert(JSON.parse(readFileSync(saFile, "utf8")))
      : applicationDefault(),
    projectId: PROJECT_ID,
  });
} catch (e) {
  console.error("No se pudo inicializar firebase-admin:", e.message);
  console.error("Configura GOOGLE_APPLICATION_CREDENTIALS o deja la service account JSON en la raiz.");
  process.exit(1);
}

const db = getFirestore(app);

// ── Proceso principal ────────────────────────────────────────────────
const run = async () => {
  console.log(`\nCalculando puntos del PRODE${DRY_RUN ? " (DRY-RUN, no escribe)" : ""}...\n`);

  const [matchesSnap, predsSnap, usersSnap] = await Promise.all([
    db.collection("matches").get(),
    db.collection("predictions").get(),
    db.collection("users").get(),
  ]);

  // Mapa de partidos terminados (con resultado cargado).
  const matches = new Map();
  let finished = 0;
  matchesSnap.forEach((d) => {
    const m = d.data();
    matches.set(d.id, m);
    if (isNum(m.homeScore) && isNum(m.awayScore)) finished++;
  });
  console.log(`Partidos: ${matchesSnap.size} (con resultado cargado: ${finished})`);

  // Acumula puntos por usuario.
  const points = new Map(); // uid -> total (grupos + eliminatorias)
  const koPoints = new Map(); // uid -> solo eliminatorias (arranca de 0)
  let scoredPreds = 0;
  let skippedKnockout = 0;

  predsSnap.forEach((d) => {
    const p = d.data();
    if (!p.userId || !p.matchId) return;

    // Predicciones viejas de knockout por ganador (winnerId, sin marcador) -> se ignoran.
    if (!isNum(p.homeScore) || !isNum(p.awayScore)) {
      if (p.winnerId !== undefined) skippedKnockout++;
      return;
    }

    const match = matches.get(p.matchId);
    if (!match || !isNum(match.homeScore) || !isNum(match.awayScore)) return; // partido sin resultado

    const pts = scoreGroupPrediction(p, match);
    points.set(p.userId, (points.get(p.userId) || 0) + pts);
    if (isKnockout(match)) koPoints.set(p.userId, (koPoints.get(p.userId) || 0) + pts);
    if (pts > 0) scoredPreds++;
  });

  if (skippedKnockout > 0) {
    console.log(`Predicciones de knockout ignoradas (todavia no se puntuan): ${skippedKnockout}`);
  }

  // Prepara actualizaciones para TODOS los usuarios (resetea puntos viejos a 0 si no sumaron).
  const updates = [];
  usersSnap.forEach((d) => {
    const newTotal = points.get(d.id) || 0;
    const koTotal = koPoints.get(d.id) || 0;
    const oldTotal = d.data().totalPoints || 0;
    updates.push({ uid: d.id, nickname: d.data().nickname || "—", oldTotal, newTotal, koTotal });
  });

  updates.sort((a, b) => b.newTotal - a.newTotal);

  console.log("\nRanking calculado (total · eliminatorias):");
  console.log("─".repeat(56));
  updates.forEach((u, i) => {
    const arrow = u.newTotal !== u.oldTotal ? `  (antes ${u.oldTotal})` : "";
    console.log(`${String(i + 1).padStart(2)}. ${u.nickname.padEnd(22)} ${String(u.newTotal).padStart(4)} pts · elim ${u.koTotal}${arrow}`);
  });
  console.log("─".repeat(56));
  console.log(`Usuarios: ${updates.length} · predicciones que sumaron: ${scoredPreds}\n`);

  if (DRY_RUN) {
    console.log("DRY-RUN: no se escribio nada. Quita --dry-run para guardar.\n");
    process.exit(0);
  }

  // Escribe en lotes de 500 (limite de batch de Firestore).
  const now = Timestamp.now();
  let written = 0;
  for (let i = 0; i < updates.length; i += 500) {
    const batch = db.batch();
    for (const u of updates.slice(i, i + 500)) {
      batch.set(
        db.collection("users").doc(u.uid),
        { totalPoints: u.newTotal, knockoutPoints: u.koTotal, pointsUpdatedAt: now },
        { merge: true }
      );
      written++;
    }
    await batch.commit();
  }

  console.log(`Listo. ${written} usuarios actualizados.\n`);
  process.exit(0);
};

run().catch((err) => {
  console.error("Error calculando puntos:", err);
  process.exit(1);
});
