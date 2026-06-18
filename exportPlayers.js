// Exporta la colección `players` de Firestore a src/data/players.json.
//
// Los planteles del Mundial son data estática (no cambian durante el torneo),
// así que en vez de que el front lea 1247 docs en cada visita a /dt y /ranking
// (lo que agota la cuota gratuita de Firestore y hace fallar los crons),
// los bundleamos como JSON y el front los importa con 0 lecturas.
//
// Uso:
//   node exportPlayers.js
//
// Credenciales admin: GOOGLE_APPLICATION_CREDENTIALS o la service account
// prodetelco-firebase-adminsdk-*.json en la raíz (igual que autoResults.js).
// Re-correr este script + rebuild + deploy solo si cambia algún plantel.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "prodetelco";
const OUT = "src/data/players.json";

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

const main = async () => {
  const db = initAdmin();
  console.log("Leyendo colección players...");
  const snap = await db.collection("players").get();
  const players = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(OUT, JSON.stringify(players, null, 0) + "\n", "utf8");
  console.log(`Listo: ${players.length} jugadores -> ${OUT}`);
};

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
