// Congela (banca) los puntos del DT de la fecha ya jugada y deja registrada la
// reapertura de edicion. Por cada dtSquads/{uid}:
//   bankedPoints += squadPoints(equipo actual, partidos nuevos desde el ultimo
//   congelamiento)
// y esos partidos quedan marcados en dt/config.lockedMatchIds.
//
// Asi, cuando se reabre la edicion del DT, cambiar el equipo NO recalcula las
// fechas ya guardadas: el front solo cuenta en vivo los partidos NO congelados.
// El script es reutilizable: cada vez que se quiera reabrir, se vuelve a correr
// y banca de forma incremental lo jugado desde la ultima vez.
//
// Uso:  node bankDt.js             -> congela y escribe
//       node bankDt.js --dry-run   -> muestra que pasaria, no escribe
//
// Credenciales admin: GOOGLE_APPLICATION_CREDENTIALS o la service account
// prodetelco-firebase-adminsdk-*.json en la raiz.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { buildPointsIndex, squadPoints } from "./src/utils/dtPoints.js";

const DRY = process.argv.includes("--dry-run");
const EDIT_OPEN_UNTIL = new Date("2026-06-19T16:00:00Z"); // mismo deadline que el front y las reglas
const r1 = (n) => Math.round(n * 10) / 10;

const initAdmin = () => {
  let saFile = null;
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    saFile = readdirSync(".").find((f) => f.startsWith("prodetelco-firebase-adminsdk") && f.endsWith(".json"));
  }
  initializeApp({
    credential: saFile && existsSync(saFile)
      ? cert(JSON.parse(readFileSync(saFile, "utf8")))
      : applicationDefault(),
    projectId: "prodetelco",
  });
  return getFirestore();
};

const main = async () => {
  const db = initAdmin();

  // Puntajes en vivo (los que actualiza el cron); si no hay doc, el bundle.
  const pSnap = await db.collection("dt").doc("puntajes").get();
  const fromDb = pSnap.exists ? pSnap.data()?.matches : null;
  const matches = Array.isArray(fromDb) && fromDb.length
    ? fromDb
    : JSON.parse(readFileSync("src/data/puntajes.json", "utf8"));
  console.log(`Partidos en puntajes: ${matches.length}`);

  // Lo que ya estaba congelado.
  const cfgSnap = await db.collection("dt").doc("config").get();
  const already = new Set(cfgSnap.exists ? (cfgSnap.data()?.lockedMatchIds || []) : []);
  const newMatches = matches.filter((m) => !already.has(m.match_id));
  console.log(`Ya congelados: ${already.size} | nuevos a congelar: ${newMatches.length}`);
  if (!newMatches.length) { console.log("Nada nuevo para congelar."); return; }

  const newIndex = buildPointsIndex(newMatches);

  const squadsSnap = await db.collection("dtSquads").get();
  console.log(`Equipos DT: ${squadsSnap.size}`);
  const updates = [];
  squadsSnap.forEach((d) => {
    const s = d.data();
    const add = squadPoints(s, newIndex);
    const banked = r1((s.bankedPoints || 0) + add);
    updates.push({ uid: d.id, prev: s.bankedPoints || 0, add, banked });
  });

  updates.sort((a, b) => b.banked - a.banked);
  updates.forEach((u) => console.log(`  ${u.uid}: ${u.prev} + ${u.add} = ${u.banked}`));

  const lockedMatchIds = [...already, ...newMatches.map((m) => m.match_id)];

  if (DRY) { console.log("DRY-RUN: no se escribio nada."); return; }

  const batch = db.batch();
  updates.forEach((u) =>
    batch.set(db.collection("dtSquads").doc(u.uid), { bankedPoints: u.banked }, { merge: true })
  );
  batch.set(
    db.collection("dt").doc("config"),
    { lockedMatchIds, editOpenUntil: EDIT_OPEN_UNTIL, lockedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  await batch.commit();
  console.log(`Listo: ${updates.length} equipos congelados, ${lockedMatchIds.length} partidos en lockedMatchIds.`);
};

main().then(() => process.exit(0)).catch((e) => { console.error("Error:", e); process.exit(1); });
