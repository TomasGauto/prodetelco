import fs from 'fs';
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let app;
try {
  app = initializeApp({
    credential: applicationDefault(),
    projectId: "prodetelco",
  });
} catch (e) {
  console.error("❌ No se pudo inicializar con Application Default Credentials.", e);
  process.exit(1);
}

const db = getFirestore(app);

const matches = [
  { group: "B", round: 1, homeTeam: "Canadá",               homeTeamId: "CAN_B", awayTeam: "Bosnia y Herzegovina", awayTeamId: "BIH_B", date: "2026-06-12T16:00" },
  { group: "D", round: 1, homeTeam: "Estados Unidos", homeTeamId: "USA_D", awayTeam: "Paraguay",  awayTeamId: "PAR_D", date: "2026-06-12T22:00" },
  { group: "B", round: 1, homeTeam: "Qatar",                homeTeamId: "QAT_B", awayTeam: "Suiza",                awayTeamId: "SUI_B", date: "2026-06-13T16:00" },
  { group: "C", round: 1, homeTeam: "Brasil",    homeTeamId: "BRA_C", awayTeam: "Marruecos", awayTeamId: "MAR_C", date: "2026-06-13T19:00" },
  { group: "C", round: 1, homeTeam: "Haití",     homeTeamId: "HAI_C", awayTeam: "Escocia",   awayTeamId: "SCO_C", date: "2026-06-13T22:00" },
  { group: "D", round: 1, homeTeam: "Australia",      homeTeamId: "AUS_D", awayTeam: "Turquía",   awayTeamId: "TUR_D", date: "2026-06-14T01:00" },
  { group: "E", round: 1, homeTeam: "Alemania",        homeTeamId: "GER_E", awayTeam: "Curazao",         awayTeamId: "CUW_E", date: "2026-06-14T15:00" },
  { group: "F", round: 1, homeTeam: "Países Bajos", homeTeamId: "NED_F", awayTeam: "Japón",   awayTeamId: "JPN_F", date: "2026-06-14T17:00" },
  { group: "E", round: 1, homeTeam: "Costa de Marfil", homeTeamId: "CIV_E", awayTeam: "Ecuador",         awayTeamId: "ECU_E", date: "2026-06-14T20:00" },
  { group: "F", round: 1, homeTeam: "Suecia",        homeTeamId: "SWE_F", awayTeam: "Túnez",   awayTeamId: "TUN_F", date: "2026-06-14T23:00" },
  { group: "G", round: 1, homeTeam: "Bélgica",       homeTeamId: "BEL_G", awayTeam: "Egipto",        awayTeamId: "EGY_G", date: "2026-06-15T13:00" },
  { group: "H", round: 1, homeTeam: "España",         homeTeamId: "ESP_H", awayTeam: "Cabo Verde",     awayTeamId: "CPV_H", date: "2026-06-15T13:00" },
  { group: "H", round: 1, homeTeam: "Arabia Saudita", homeTeamId: "KSA_H", awayTeam: "Uruguay",        awayTeamId: "URU_H", date: "2026-06-15T19:00" },
  { group: "G", round: 1, homeTeam: "Irán",           homeTeamId: "IRN_G", awayTeam: "Nueva Zelanda", awayTeamId: "NZL_G", date: "2026-06-15T22:00" },
  { group: "I", round: 1, homeTeam: "Francia",  homeTeamId: "FRA_I", awayTeam: "Senegal", awayTeamId: "SEN_I", date: "2026-06-16T16:00" },
  { group: "I", round: 1, homeTeam: "Irak",     homeTeamId: "IRQ_I", awayTeam: "Noruega", awayTeamId: "NOR_I", date: "2026-06-16T19:00" },
  { group: "J", round: 1, homeTeam: "Argentina", homeTeamId: "ARG_J", awayTeam: "Argelia",  awayTeamId: "ALG_J", date: "2026-06-16T22:00" },
  { group: "J", round: 1, homeTeam: "Austria",   homeTeamId: "AUT_J", awayTeam: "Jordania", awayTeamId: "JOR_J", date: "2026-06-17T01:00" },
  { group: "K", round: 1, homeTeam: "Portugal",            homeTeamId: "POR_K", awayTeam: "Rep. Dem. del Congo", awayTeamId: "COD_K", date: "2026-06-17T15:00" },
  { group: "L", round: 1, homeTeam: "Inglaterra", homeTeamId: "ENG_L", awayTeam: "Croacia", awayTeamId: "CRO_L", date: "2026-06-17T17:00" },
  { group: "L", round: 1, homeTeam: "Ghana",      homeTeamId: "GHA_L", awayTeam: "Panamá",  awayTeamId: "PAN_L", date: "2026-06-17T20:00" },
  { group: "K", round: 1, homeTeam: "Uzbekistán",          homeTeamId: "UZB_K", awayTeam: "Colombia",            awayTeamId: "COL_K", date: "2026-06-17T23:00" },
];

const main = async () => {
  const playersSnap = await db.collection("players").get();
  const allPlayers = playersSnap.docs.map(d => ({id: d.id, ...d.data()}));
  
  const playersByCountry = {};
  for(const p of allPlayers) {
    if(!playersByCountry[p.country]) playersByCountry[p.country] = [];
    playersByCountry[p.country].push(p);
  }

  const jsonPath = './src/data/puntajes.json';
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  for(const match of matches) {
    const match_id = `${match.homeTeamId.split('_')[0]}_${match.awayTeamId.split('_')[0]}_${match.date.replace(/[-:T]/g, '').slice(0, 8)}`;
    if (data.find(d => d.match_id === match_id)) continue;

    const homeCode = match.homeTeamId.split('_')[0];
    const awayCode = match.awayTeamId.split('_')[0];

    const homePlayers = (playersByCountry[homeCode] || []).slice(0, 11);
    const awayPlayers = (playersByCountry[awayCode] || []).slice(0, 11);

    const homeGoals = Math.floor(Math.random() * 4);
    const awayGoals = Math.floor(Math.random() * 4);

    const matchStats = {
      match_id,
      home_team: match.homeTeam,
      away_team: match.awayTeam,
      score: `${homeGoals} - ${awayGoals}`,
      dt_stats: {
        tactical_analysis: `Partido de la primera fecha del Grupo ${match.group}. Un encuentro muy disputado donde el resultado final fue ${homeGoals}-${awayGoals}.`,
        players_performance: []
      }
    };

    let mvpIndex = Math.floor(Math.random() * 22);

    let count = 0;
    const addPlayer = (p, teamCode, teamGoals, oppGoals) => {
      let is_mvp = (count === mvpIndex);
      let rating = 5.0;
      let highlight = "Partido correcto.";
      if (is_mvp) {
        rating += 3.0;
        highlight = "Figura del partido, excelente rendimiento.";
      } else {
        rating += (Math.random() * 2) - 1; // 4.0 - 6.0
      }

      if (oppGoals === 0 && (p.position === 'GK' || p.position === 'DEF')) {
        rating += 1.5;
        highlight += " Valla invicta.";
      }
      
      if (Math.random() > 0.8 && p.position !== 'GK') {
        rating += 2.0;
        highlight += " Anotó un gol importante.";
      }

      rating = Math.max(1, Math.min(10, rating));

      matchStats.dt_stats.players_performance.push({
        player_id: p.id,
        name: p.name,
        team: teamCode,
        position: p.position,
        rating: Math.round(rating * 10) / 10,
        is_mvp,
        highlight
      });
      count++;
    };

    for(const p of homePlayers) addPlayer(p, homeCode, homeGoals, awayGoals);
    for(const p of awayPlayers) addPlayer(p, awayCode, awayGoals, homeGoals);

    data.push(matchStats);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log("Puntajes generados exitosamente para", matches.length, "partidos.");
  process.exit(0);
};

main();
