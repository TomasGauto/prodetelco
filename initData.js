// Initialize Firebase data for PRODE Mundial 2026
// Run with: node initData.js
//
// REQUIRES: GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON,
// OR run "firebase login" + "gcloud auth application-default login" first.
// Alternative: download service account from Firebase Console > Project Settings > Service Accounts.

import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Try to initialize with applicationDefault (works if you have gcloud ADC or GOOGLE_APPLICATION_CREDENTIALS set)
let app;
try {
  app = initializeApp({
    credential: applicationDefault(),
    projectId: "prodetelco",
  });
} catch (e) {
  console.error("❌ No se pudo inicializar con Application Default Credentials.");
  console.error("   Opciones:");
  console.error("   1. Descargá la service account key desde Firebase Console > Project Settings > Service Accounts");
  console.error("      y ejecutá: set GOOGLE_APPLICATION_CREDENTIALS=C:\\ruta\\a\\serviceAccount.json");
  console.error("   2. O ejecutá: gcloud auth application-default login");
  process.exit(1);
}

const db = getFirestore(app);

// 48 equipos reales del Mundial 2026
const teams = [
  // Grupo A
  { name: "México",          fifaCode: "MEX", group: "A" },
  { name: "Sudáfrica",       fifaCode: "RSA", group: "A" },
  { name: "Corea del Sur",   fifaCode: "KOR", group: "A" },
  { name: "Chequia",         fifaCode: "CZE", group: "A" },
  // Grupo B
  { name: "Canadá",                  fifaCode: "CAN", group: "B" },
  { name: "Bosnia y Herzegovina",    fifaCode: "BIH", group: "B" },
  { name: "Qatar",                   fifaCode: "QAT", group: "B" },
  { name: "Suiza",                   fifaCode: "SUI", group: "B" },
  // Grupo C
  { name: "Brasil",    fifaCode: "BRA", group: "C" },
  { name: "Marruecos", fifaCode: "MAR", group: "C" },
  { name: "Haití",     fifaCode: "HAI", group: "C" },
  { name: "Escocia",   fifaCode: "SCO", group: "C" },
  // Grupo D
  { name: "Estados Unidos", fifaCode: "USA", group: "D" },
  { name: "Paraguay",       fifaCode: "PAR", group: "D" },
  { name: "Australia",      fifaCode: "AUS", group: "D" },
  { name: "Turquía",        fifaCode: "TUR", group: "D" },
  // Grupo E
  { name: "Alemania",        fifaCode: "GER", group: "E" },
  { name: "Curazao",         fifaCode: "CUW", group: "E" },
  { name: "Costa de Marfil", fifaCode: "CIV", group: "E" },
  { name: "Ecuador",         fifaCode: "ECU", group: "E" },
  // Grupo F
  { name: "Países Bajos", fifaCode: "NED", group: "F" },
  { name: "Japón",        fifaCode: "JPN", group: "F" },
  { name: "Suecia",       fifaCode: "SWE", group: "F" },
  { name: "Túnez",        fifaCode: "TUN", group: "F" },
  // Grupo G
  { name: "Bélgica",       fifaCode: "BEL", group: "G" },
  { name: "Egipto",        fifaCode: "EGY", group: "G" },
  { name: "Irán",          fifaCode: "IRN", group: "G" },
  { name: "Nueva Zelanda", fifaCode: "NZL", group: "G" },
  // Grupo H
  { name: "España",         fifaCode: "ESP", group: "H" },
  { name: "Cabo Verde",     fifaCode: "CPV", group: "H" },
  { name: "Arabia Saudita", fifaCode: "KSA", group: "H" },
  { name: "Uruguay",        fifaCode: "URU", group: "H" },
  // Grupo I
  { name: "Francia",  fifaCode: "FRA", group: "I" },
  { name: "Senegal",  fifaCode: "SEN", group: "I" },
  { name: "Irak",     fifaCode: "IRQ", group: "I" },
  { name: "Noruega",  fifaCode: "NOR", group: "I" },
  // Grupo J
  { name: "Argentina", fifaCode: "ARG", group: "J" },
  { name: "Argelia",   fifaCode: "ALG", group: "J" },
  { name: "Austria",   fifaCode: "AUT", group: "J" },
  { name: "Jordania",  fifaCode: "JOR", group: "J" },
  // Grupo K
  { name: "Portugal",                      fifaCode: "POR", group: "K" },
  { name: "Rep. Dem. del Congo",           fifaCode: "COD", group: "K" },
  { name: "Uzbekistán",                    fifaCode: "UZB", group: "K" },
  { name: "Colombia",                      fifaCode: "COL", group: "K" },
  // Grupo L
  { name: "Inglaterra", fifaCode: "ENG", group: "L" },
  { name: "Croacia",    fifaCode: "CRO", group: "L" },
  { name: "Ghana",      fifaCode: "GHA", group: "L" },
  { name: "Panamá",     fifaCode: "PAN", group: "L" },
];

// Convierte fecha ART (UTC-3) a Timestamp de Firestore
const art = (dateStr) => {
  const [date, time] = dateStr.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours + 3, minutes));
  return Timestamp.fromDate(utcDate);
};

// 72 partidos de fase de grupos — fixture oficial Mundial 2026
const matches = [
  // ── GRUPO A ──────────────────────────────────────────────────────
  { group: "A", round: 1, homeTeam: "México",        homeTeamId: "MEX_A", awayTeam: "Sudáfrica",     awayTeamId: "RSA_A", date: art("2026-06-11T16:00"), venue: "Ciudad de México" },
  { group: "A", round: 1, homeTeam: "Corea del Sur", homeTeamId: "KOR_A", awayTeam: "Chequia",       awayTeamId: "CZE_A", date: art("2026-06-11T23:00"), venue: "Guadalajara" },
  { group: "A", round: 2, homeTeam: "Chequia",       homeTeamId: "CZE_A", awayTeam: "Sudáfrica",     awayTeamId: "RSA_A", date: art("2026-06-18T13:00"), venue: "Atlanta" },
  { group: "A", round: 2, homeTeam: "México",        homeTeamId: "MEX_A", awayTeam: "Corea del Sur", awayTeamId: "KOR_A", date: art("2026-06-18T22:00"), venue: "Guadalajara" },
  { group: "A", round: 3, homeTeam: "Chequia",       homeTeamId: "CZE_A", awayTeam: "México",        awayTeamId: "MEX_A", date: art("2026-06-24T22:00"), venue: "Ciudad de México" },
  { group: "A", round: 3, homeTeam: "Sudáfrica",     homeTeamId: "RSA_A", awayTeam: "Corea del Sur", awayTeamId: "KOR_A", date: art("2026-06-24T22:00"), venue: "Monterrey" },

  // ── GRUPO B ──────────────────────────────────────────────────────
  { group: "B", round: 1, homeTeam: "Canadá",               homeTeamId: "CAN_B", awayTeam: "Bosnia y Herzegovina", awayTeamId: "BIH_B", date: art("2026-06-12T16:00"), venue: "Toronto" },
  { group: "B", round: 1, homeTeam: "Qatar",                homeTeamId: "QAT_B", awayTeam: "Suiza",                awayTeamId: "SUI_B", date: art("2026-06-13T16:00"), venue: "San Francisco" },
  { group: "B", round: 2, homeTeam: "Suiza",                homeTeamId: "SUI_B", awayTeam: "Bosnia y Herzegovina", awayTeamId: "BIH_B", date: art("2026-06-18T16:00"), venue: "Los Ángeles" },
  { group: "B", round: 2, homeTeam: "Canadá",               homeTeamId: "CAN_B", awayTeam: "Qatar",                awayTeamId: "QAT_B", date: art("2026-06-18T19:00"), venue: "Vancouver" },
  { group: "B", round: 3, homeTeam: "Suiza",                homeTeamId: "SUI_B", awayTeam: "Canadá",               awayTeamId: "CAN_B", date: art("2026-06-24T16:00"), venue: "Vancouver" },
  { group: "B", round: 3, homeTeam: "Bosnia y Herzegovina", homeTeamId: "BIH_B", awayTeam: "Qatar",                awayTeamId: "QAT_B", date: art("2026-06-24T16:00"), venue: "Seattle" },

  // ── GRUPO C ──────────────────────────────────────────────────────
  { group: "C", round: 1, homeTeam: "Brasil",    homeTeamId: "BRA_C", awayTeam: "Marruecos", awayTeamId: "MAR_C", date: art("2026-06-13T19:00"), venue: "Nueva York/Nueva Jersey" },
  { group: "C", round: 1, homeTeam: "Haití",     homeTeamId: "HAI_C", awayTeam: "Escocia",   awayTeamId: "SCO_C", date: art("2026-06-13T22:00"), venue: "Boston" },
  { group: "C", round: 2, homeTeam: "Escocia",   homeTeamId: "SCO_C", awayTeam: "Marruecos", awayTeamId: "MAR_C", date: art("2026-06-19T19:00"), venue: "Boston" },
  { group: "C", round: 2, homeTeam: "Brasil",    homeTeamId: "BRA_C", awayTeam: "Haití",     awayTeamId: "HAI_C", date: art("2026-06-19T22:00"), venue: "Filadelfia" },
  { group: "C", round: 3, homeTeam: "Escocia",   homeTeamId: "SCO_C", awayTeam: "Brasil",    awayTeamId: "BRA_C", date: art("2026-06-24T19:00"), venue: "Miami" },
  { group: "C", round: 3, homeTeam: "Marruecos", homeTeamId: "MAR_C", awayTeam: "Haití",     awayTeamId: "HAI_C", date: art("2026-06-24T19:00"), venue: "Atlanta" },

  // ── GRUPO D ──────────────────────────────────────────────────────
  { group: "D", round: 1, homeTeam: "Estados Unidos", homeTeamId: "USA_D", awayTeam: "Paraguay",  awayTeamId: "PAR_D", date: art("2026-06-12T22:00"), venue: "Los Ángeles" },
  { group: "D", round: 1, homeTeam: "Australia",      homeTeamId: "AUS_D", awayTeam: "Turquía",   awayTeamId: "TUR_D", date: art("2026-06-14T01:00"), venue: "Vancouver" },
  { group: "D", round: 2, homeTeam: "Estados Unidos", homeTeamId: "USA_D", awayTeam: "Australia", awayTeamId: "AUS_D", date: art("2026-06-19T16:00"), venue: "Seattle" },
  { group: "D", round: 2, homeTeam: "Turquía",        homeTeamId: "TUR_D", awayTeam: "Paraguay",  awayTeamId: "PAR_D", date: art("2026-06-20T01:00"), venue: "San Francisco" },
  { group: "D", round: 3, homeTeam: "Turquía",        homeTeamId: "TUR_D", awayTeam: "Estados Unidos", awayTeamId: "USA_D", date: art("2026-06-25T23:00"), venue: "Los Ángeles" },
  { group: "D", round: 3, homeTeam: "Paraguay",       homeTeamId: "PAR_D", awayTeam: "Australia",      awayTeamId: "AUS_D", date: art("2026-06-25T23:00"), venue: "San Francisco" },

  // ── GRUPO E ──────────────────────────────────────────────────────
  { group: "E", round: 1, homeTeam: "Alemania",        homeTeamId: "GER_E", awayTeam: "Curazao",         awayTeamId: "CUW_E", date: art("2026-06-14T15:00"), venue: "Houston" },
  { group: "E", round: 1, homeTeam: "Costa de Marfil", homeTeamId: "CIV_E", awayTeam: "Ecuador",         awayTeamId: "ECU_E", date: art("2026-06-14T20:00"), venue: "Filadelfia" },
  { group: "E", round: 2, homeTeam: "Alemania",        homeTeamId: "GER_E", awayTeam: "Costa de Marfil", awayTeamId: "CIV_E", date: art("2026-06-20T17:00"), venue: "Toronto" },
  { group: "E", round: 2, homeTeam: "Ecuador",         homeTeamId: "ECU_E", awayTeam: "Curazao",         awayTeamId: "CUW_E", date: art("2026-06-20T21:00"), venue: "Kansas City" },
  { group: "E", round: 3, homeTeam: "Ecuador",         homeTeamId: "ECU_E", awayTeam: "Alemania",        awayTeamId: "GER_E", date: art("2026-06-25T17:00"), venue: "Nueva York/Nueva Jersey" },
  { group: "E", round: 3, homeTeam: "Curazao",         homeTeamId: "CUW_E", awayTeam: "Costa de Marfil", awayTeamId: "CIV_E", date: art("2026-06-25T17:00"), venue: "Filadelfia" },

  // ── GRUPO F ──────────────────────────────────────────────────────
  { group: "F", round: 1, homeTeam: "Países Bajos", homeTeamId: "NED_F", awayTeam: "Japón",   awayTeamId: "JPN_F", date: art("2026-06-14T17:00"), venue: "Dallas" },
  { group: "F", round: 1, homeTeam: "Suecia",        homeTeamId: "SWE_F", awayTeam: "Túnez",   awayTeamId: "TUN_F", date: art("2026-06-14T23:00"), venue: "Monterrey" },
  { group: "F", round: 2, homeTeam: "Países Bajos", homeTeamId: "NED_F", awayTeam: "Suecia",   awayTeamId: "SWE_F", date: art("2026-06-20T15:00"), venue: "Houston" },
  { group: "F", round: 2, homeTeam: "Túnez",         homeTeamId: "TUN_F", awayTeam: "Japón",   awayTeamId: "JPN_F", date: art("2026-06-21T01:00"), venue: "Guadalajara" },
  { group: "F", round: 3, homeTeam: "Japón",          homeTeamId: "JPN_F", awayTeam: "Suecia",  awayTeamId: "SWE_F", date: art("2026-06-25T20:00"), venue: "Dallas" },
  { group: "F", round: 3, homeTeam: "Túnez",          homeTeamId: "TUN_F", awayTeam: "Países Bajos", awayTeamId: "NED_F", date: art("2026-06-25T20:00"), venue: "Kansas City" },

  // ── GRUPO G ──────────────────────────────────────────────────────
  { group: "G", round: 1, homeTeam: "Bélgica",       homeTeamId: "BEL_G", awayTeam: "Egipto",        awayTeamId: "EGY_G", date: art("2026-06-15T13:00"), venue: "Seattle" },
  { group: "G", round: 1, homeTeam: "Irán",           homeTeamId: "IRN_G", awayTeam: "Nueva Zelanda", awayTeamId: "NZL_G", date: art("2026-06-15T22:00"), venue: "Los Ángeles" },
  { group: "G", round: 2, homeTeam: "Bélgica",       homeTeamId: "BEL_G", awayTeam: "Irán",          awayTeamId: "IRN_G", date: art("2026-06-21T16:00"), venue: "Los Ángeles" },
  { group: "G", round: 2, homeTeam: "Nueva Zelanda", homeTeamId: "NZL_G", awayTeam: "Egipto",        awayTeamId: "EGY_G", date: art("2026-06-21T22:00"), venue: "Vancouver" },
  { group: "G", round: 3, homeTeam: "Egipto",        homeTeamId: "EGY_G", awayTeam: "Irán",          awayTeamId: "IRN_G", date: art("2026-06-27T00:00"), venue: "Seattle" },
  { group: "G", round: 3, homeTeam: "Nueva Zelanda", homeTeamId: "NZL_G", awayTeam: "Bélgica",       awayTeamId: "BEL_G", date: art("2026-06-27T00:00"), venue: "Vancouver" },

  // ── GRUPO H ──────────────────────────────────────────────────────
  { group: "H", round: 1, homeTeam: "España",         homeTeamId: "ESP_H", awayTeam: "Cabo Verde",     awayTeamId: "CPV_H", date: art("2026-06-15T13:00"), venue: "Atlanta" },
  { group: "H", round: 1, homeTeam: "Arabia Saudita", homeTeamId: "KSA_H", awayTeam: "Uruguay",        awayTeamId: "URU_H", date: art("2026-06-15T19:00"), venue: "Miami" },
  { group: "H", round: 2, homeTeam: "España",         homeTeamId: "ESP_H", awayTeam: "Arabia Saudita", awayTeamId: "KSA_H", date: art("2026-06-21T13:00"), venue: "Atlanta" },
  { group: "H", round: 2, homeTeam: "Uruguay",        homeTeamId: "URU_H", awayTeam: "Cabo Verde",     awayTeamId: "CPV_H", date: art("2026-06-21T19:00"), venue: "Miami" },
  { group: "H", round: 3, homeTeam: "Cabo Verde",     homeTeamId: "CPV_H", awayTeam: "Arabia Saudita", awayTeamId: "KSA_H", date: art("2026-06-26T21:00"), venue: "Houston" },
  { group: "H", round: 3, homeTeam: "Uruguay",        homeTeamId: "URU_H", awayTeam: "España",         awayTeamId: "ESP_H", date: art("2026-06-26T21:00"), venue: "Guadalajara" },

  // ── GRUPO I ──────────────────────────────────────────────────────
  { group: "I", round: 1, homeTeam: "Francia",  homeTeamId: "FRA_I", awayTeam: "Senegal", awayTeamId: "SEN_I", date: art("2026-06-16T16:00"), venue: "Nueva York/Nueva Jersey" },
  { group: "I", round: 1, homeTeam: "Irak",     homeTeamId: "IRQ_I", awayTeam: "Noruega", awayTeamId: "NOR_I", date: art("2026-06-16T19:00"), venue: "Boston" },
  { group: "I", round: 2, homeTeam: "Francia",  homeTeamId: "FRA_I", awayTeam: "Irak",    awayTeamId: "IRQ_I", date: art("2026-06-22T17:00"), venue: "Filadelfia" },
  { group: "I", round: 2, homeTeam: "Noruega",  homeTeamId: "NOR_I", awayTeam: "Senegal", awayTeamId: "SEN_I", date: art("2026-06-22T21:00"), venue: "Nueva York/Nueva Jersey" },
  { group: "I", round: 3, homeTeam: "Noruega",  homeTeamId: "NOR_I", awayTeam: "Francia", awayTeamId: "FRA_I", date: art("2026-06-26T16:00"), venue: "Boston" },
  { group: "I", round: 3, homeTeam: "Senegal",  homeTeamId: "SEN_I", awayTeam: "Irak",    awayTeamId: "IRQ_I", date: art("2026-06-26T16:00"), venue: "Toronto" },

  // ── GRUPO J ──────────────────────────────────────────────────────
  { group: "J", round: 1, homeTeam: "Argentina", homeTeamId: "ARG_J", awayTeam: "Argelia",  awayTeamId: "ALG_J", date: art("2026-06-16T22:00"), venue: "Kansas City" },
  { group: "J", round: 1, homeTeam: "Austria",   homeTeamId: "AUT_J", awayTeam: "Jordania", awayTeamId: "JOR_J", date: art("2026-06-17T01:00"), venue: "San Francisco" },
  { group: "J", round: 2, homeTeam: "Argentina", homeTeamId: "ARG_J", awayTeam: "Austria",  awayTeamId: "AUT_J", date: art("2026-06-22T15:00"), venue: "Dallas" },
  { group: "J", round: 2, homeTeam: "Jordania",  homeTeamId: "JOR_J", awayTeam: "Argelia",  awayTeamId: "ALG_J", date: art("2026-06-23T00:00"), venue: "San Francisco" },
  { group: "J", round: 3, homeTeam: "Argelia",   homeTeamId: "ALG_J", awayTeam: "Austria",  awayTeamId: "AUT_J", date: art("2026-06-27T23:00"), venue: "Kansas City" },
  { group: "J", round: 3, homeTeam: "Jordania",  homeTeamId: "JOR_J", awayTeam: "Argentina", awayTeamId: "ARG_J", date: art("2026-06-27T23:00"), venue: "Dallas" },

  // ── GRUPO K ──────────────────────────────────────────────────────
  { group: "K", round: 1, homeTeam: "Portugal",            homeTeamId: "POR_K", awayTeam: "Rep. Dem. del Congo", awayTeamId: "COD_K", date: art("2026-06-17T15:00"), venue: "Houston" },
  { group: "K", round: 1, homeTeam: "Uzbekistán",          homeTeamId: "UZB_K", awayTeam: "Colombia",            awayTeamId: "COL_K", date: art("2026-06-17T23:00"), venue: "Ciudad de México" },
  { group: "K", round: 2, homeTeam: "Portugal",            homeTeamId: "POR_K", awayTeam: "Uzbekistán",          awayTeamId: "UZB_K", date: art("2026-06-23T15:00"), venue: "Houston" },
  { group: "K", round: 2, homeTeam: "Colombia",            homeTeamId: "COL_K", awayTeam: "Rep. Dem. del Congo", awayTeamId: "COD_K", date: art("2026-06-23T23:00"), venue: "Guadalajara" },
  { group: "K", round: 3, homeTeam: "Colombia",            homeTeamId: "COL_K", awayTeam: "Portugal",            awayTeamId: "POR_K", date: art("2026-06-27T20:30"), venue: "Miami" },
  { group: "K", round: 3, homeTeam: "Rep. Dem. del Congo", homeTeamId: "COD_K", awayTeam: "Uzbekistán",          awayTeamId: "UZB_K", date: art("2026-06-27T20:30"), venue: "Atlanta" },

  // ── GRUPO L ──────────────────────────────────────────────────────
  { group: "L", round: 1, homeTeam: "Inglaterra", homeTeamId: "ENG_L", awayTeam: "Croacia", awayTeamId: "CRO_L", date: art("2026-06-17T17:00"), venue: "Dallas" },
  { group: "L", round: 1, homeTeam: "Ghana",      homeTeamId: "GHA_L", awayTeam: "Panamá",  awayTeamId: "PAN_L", date: art("2026-06-17T20:00"), venue: "Toronto" },
  { group: "L", round: 2, homeTeam: "Inglaterra", homeTeamId: "ENG_L", awayTeam: "Ghana",   awayTeamId: "GHA_L", date: art("2026-06-23T17:00"), venue: "Boston" },
  { group: "L", round: 2, homeTeam: "Panamá",     homeTeamId: "PAN_L", awayTeam: "Croacia", awayTeamId: "CRO_L", date: art("2026-06-23T20:00"), venue: "Toronto" },
  { group: "L", round: 3, homeTeam: "Panamá",     homeTeamId: "PAN_L", awayTeam: "Inglaterra", awayTeamId: "ENG_L", date: art("2026-06-27T17:00"), venue: "Nueva York/Nueva Jersey" },
  { group: "L", round: 3, homeTeam: "Croacia",    homeTeamId: "CRO_L", awayTeam: "Ghana",      awayTeamId: "GHA_L", date: art("2026-06-27T17:00"), venue: "Filadelfia" },
];

const initializeData = async () => {
  try {
    console.log("Iniciando la carga de datos para PRODE Mundial 2026...\n");

    console.log("Agregando equipos...");
    const teamsBatch = db.batch();
    for (const team of teams) {
      const teamId = `${team.fifaCode}_${team.group}`;
      const ref = db.collection("teams").doc(teamId);
      teamsBatch.set(ref, {
        ...team,
        id: teamId,
        createdAt: Timestamp.now()
      });
    }
    await teamsBatch.commit();
    console.log(`✅ ${teams.length} equipos agregados\n`);

    console.log("Agregando partidos...");
    // Firestore batch limit is 500 ops, 72 matches is fine
    const matchesBatch = db.batch();
    for (const match of matches) {
      const matchId = `${match.homeTeamId}_vs_${match.awayTeamId}`;
      const ref = db.collection("matches").doc(matchId);
      matchesBatch.set(ref, {
        ...match,
        id: matchId,
        homeScore: null,
        awayScore: null,
        createdAt: Timestamp.now()
      });
    }
    await matchesBatch.commit();
    console.log(`✅ ${matches.length} partidos agregados\n`);

    console.log("🎉 Inicialización completada! Ya podés cargar predicciones.");
    process.exit(0);
  } catch (error) {
    console.error("Error al inicializar los datos:", error);
    process.exit(1);
  }
};

initializeData();
