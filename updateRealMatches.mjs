import fs from 'fs';
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from './prodetelco-firebase-adminsdk-fbsvc-2656dc2f8a.json' with { type: 'json' };

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

const matchesData = [
  // June 12
  {
    match_id: "USA_PAR_20260612", home_team: "Estados Unidos", away_team: "Paraguay", score: "4 - 1",
    tactical_analysis: "Contundente victoria de Estados Unidos por 4-1. Folarin Balogun brilló con un doblete y Giovanni Reyna también aportó.",
    home_code: "USA", away_code: "PAR", home_scorers: ["Folarin Balogun", "Giovanni Reyna"], away_scorers: ["Mauricio"], mvp: "Folarin Balogun"
  },
  {
    match_id: "CAN_BIH_20260612", home_team: "Canadá", away_team: "Bosnia y Herzegovina", score: "1 - 1",
    tactical_analysis: "Empate 1-1. Bosnia se adelantó mediante Jovo Lukić, pero Cyle Larin logró el empate para los anfitriones.",
    home_code: "CAN", away_code: "BIH", home_scorers: ["Cyle Larin"], away_scorers: ["Jovo Lukić", "Jovo Lukic"], mvp: "Cyle Larin"
  },
  // June 13
  {
    match_id: "QAT_SUI_20260613", home_team: "Qatar", away_team: "Suiza", score: "1 - 1",
    tactical_analysis: "Suiza abrió con gol de Embolo. Qatar lo empató agónicamente mediante Boualem Khoukhi.",
    home_code: "QAT", away_code: "SUI", home_scorers: ["Boualem Khoukhi"], away_scorers: ["Breel Embolo"], mvp: "Breel Embolo"
  },
  {
    match_id: "BRA_MAR_20260613", home_team: "Brasil", away_team: "Marruecos", score: "1 - 1",
    tactical_analysis: "Marruecos sorprendió adelantándose con Saibari, pero Vinícius Júnior empató para la verdeamarela.",
    home_code: "BRA", away_code: "MAR", home_scorers: ["Vinícius Júnior", "Vinicius Junior"], away_scorers: ["Ismael Saibari"], mvp: "Vinícius Júnior"
  },
  {
    match_id: "HAI_SCO_20260613", home_team: "Haití", away_team: "Escocia", score: "0 - 1",
    tactical_analysis: "Escocia se llevó un triunfo ajustado gracias al tanto de John McGinn.",
    home_code: "HAI", away_code: "SCO", home_scorers: [], away_scorers: ["John McGinn"], mvp: "John McGinn"
  },
  // June 14
  {
    match_id: "AUS_TUR_20260614", home_team: "Australia", away_team: "Turquía", score: "2 - 0",
    tactical_analysis: "Gran victoria australiana con goles de Irankunda y Metcalfe. El arquero Patrick Beach fue la figura.",
    home_code: "AUS", away_code: "TUR", home_scorers: ["Nestory Irankunda", "Connor Metcalfe"], away_scorers: [], mvp: "Patrick Beach"
  },
  {
    match_id: "GER_CUW_20260614", home_team: "Alemania", away_team: "Curazao", score: "7 - 1",
    tactical_analysis: "Goleada histórica alemana con doblete de Havertz y tantos de Musiala, Nmecha, Schlotterbeck, Brown y Undav.",
    home_code: "GER", away_code: "CUW", home_scorers: ["Kai Havertz", "Jamal Musiala", "Felix Nmecha", "Nico Schlotterbeck", "Nathaniel Brown", "Deniz Undav"], away_scorers: ["Livano Comenencia"], mvp: "Kai Havertz"
  },
  {
    match_id: "CIV_ECU_20260614", home_team: "Costa de Marfil", away_team: "Ecuador", score: "1 - 0",
    tactical_analysis: "Ajustada victoria marfileña con gol sobre la hora de Amad Diallo.",
    home_code: "CIV", away_code: "ECU", home_scorers: ["Amad Diallo"], away_scorers: [], mvp: "Amad Diallo"
  },
  {
    match_id: "NED_JPN_20260614", home_team: "Países Bajos", away_team: "Japón", score: "2 - 2",
    tactical_analysis: "Partidazo. Japón remontó dos veces los goles de Van Dijk y Summerville con anotaciones de Nakamura y Kamada.",
    home_code: "NED", away_code: "JPN", home_scorers: ["Virgil van Dijk", "Crysencio Summerville"], away_scorers: ["Keito Nakamura", "Daichi Kamada"], mvp: "Keito Nakamura"
  },
  {
    match_id: "SWE_TUN_20260614", home_team: "Suecia", away_team: "Túnez", score: "5 - 1",
    tactical_analysis: "Victoria cómoda de Suecia con doblete de Yasin Ayari y tantos de Isak, Gyökeres y Svanberg.",
    home_code: "SWE", away_code: "TUN", home_scorers: ["Yasin Ayari", "Alexander Isak", "Viktor Gyökeres", "Mattias Svanberg"], away_scorers: ["Omar Rekik"], mvp: "Yasin Ayari"
  },
  // June 15
  {
    match_id: "BEL_EGY_20260615", home_team: "Bélgica", away_team: "Egipto", score: "1 - 1",
    tactical_analysis: "Empate 1-1. Egipto se adelantó con gol de Emam Ashour, pero Bélgica empató gracias a un gol en contra de Mohamed Hany.",
    home_code: "BEL", away_code: "EGY", home_scorers: [], away_scorers: ["Emam Ashour"], mvp: "Emam Ashour"
  },
  {
    match_id: "ESP_CPV_20260615", home_team: "España", away_team: "Cabo Verde", score: "0 - 0",
    tactical_analysis: "Histórico empate 0-0. Cabo Verde, debutante absoluto, logró resistir el dominio español gracias a una actuación consagratoria de su arquero Vozinha.",
    home_code: "ESP", away_code: "CPV", home_scorers: [], away_scorers: [], mvp: "Vozinha"
  },
  {
    match_id: "KSA_URU_20260615", home_team: "Arabia Saudita", away_team: "Uruguay", score: "1 - 1",
    tactical_analysis: "Sorpresivo 1-1. Abdulelah Al-Amri anotó primero. Maxi Araujo logró el empate para Uruguay, pero Mohammed Al-Owais fue la figura con atajadas clave.",
    home_code: "KSA", away_code: "URU", home_scorers: ["Abdulelah Al-Amri"], away_scorers: ["Maximiliano Araújo", "Maxi Araujo"], mvp: "Mohammed Al-Owais"
  },
  {
    match_id: "IRN_NZL_20260615", home_team: "Irán", away_team: "Nueva Zelanda", score: "2 - 2",
    tactical_analysis: "Emocionante empate 2-2. Elijah Just marcó un doblete para poner arriba a Nueva Zelanda en dos ocasiones, pero Irán respondió ambas veces.",
    home_code: "IRN", away_code: "NZL", home_scorers: ["Ramin Rezaeian", "Mohammad Mohebbi"], away_scorers: ["Elijah Just"], mvp: "Elijah Just"
  },
  // June 16
  {
    match_id: "FRA_SEN_20260616", home_team: "Francia", away_team: "Senegal", score: "3 - 1",
    tactical_analysis: "Sólida victoria francesa 3-1. Kylian Mbappé brilló con un doblete para encaminar el triunfo.",
    home_code: "FRA", away_code: "SEN", home_scorers: ["Kylian Mbappé"], away_scorers: [], mvp: "Kylian Mbappé"
  },
  {
    match_id: "IRQ_NOR_20260616", home_team: "Irak", away_team: "Noruega", score: "1 - 4",
    tactical_analysis: "Contundente 4-1 de Noruega. Erling Haaland anotó un doblete rápido en el primer tiempo. Leo Østigård también anotó.",
    home_code: "IRQ", away_code: "NOR", home_scorers: ["Aymen Hussein"], away_scorers: ["Erling Haaland", "Leo Østigård"], mvp: "Erling Haaland"
  },
  {
    match_id: "ARG_ALG_20260616", home_team: "Argentina", away_team: "Argelia", score: "3 - 0",
    tactical_analysis: "Triunfo 3-0 de Argentina con una actuación histórica de Lionel Messi, quien anotó un hat-trick para igualar el récord de Klose.",
    home_code: "ARG", away_code: "ALG", home_scorers: ["Lionel Messi"], away_scorers: [], mvp: "Lionel Messi"
  },
  // June 17
  {
    match_id: "AUT_JOR_20260617", home_team: "Austria", away_team: "Jordania", score: "3 - 1",
    tactical_analysis: "Victoria austríaca 3-1. Romano Schmid abrió el marcador y Arnautovic lo cerró de penal.",
    home_code: "AUT", away_code: "JOR", home_scorers: ["Romano Schmid", "Marko Arnautović"], away_scorers: ["Ali Olwan"], mvp: "Marko Arnautović"
  }
];

const normalize = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const isMatch = (playerName, targetName) => {
  const p = normalize(playerName);
  const t = normalize(targetName);
  // Match if exact, or if one includes the other (e.g. "Lionel Messi" includes "Messi", "Lionel Andres Messi" includes "Lionel Messi" - wait, "Lionel Andres Messi".includes("Lionel Messi") is false.
  // We can check if all words of target are in player name
  const tWords = t.split(' ');
  const pWords = p.split(' ');
  return tWords.every(w => pWords.includes(w)) || pWords.every(w => tWords.includes(w));
};

const main = async () => {
  const playersSnap = await db.collection("players").get();
  const players = playersSnap.docs.map(d => ({id: d.id, ...d.data()}));
  
  let puntajes = JSON.parse(fs.readFileSync('./src/data/puntajes.json', 'utf8'));

  for (const m of matchesData) {
    // Remove the match so we completely overwrite it
    puntajes = puntajes.filter(p => p.match_id !== m.match_id);

    const get11Players = (countryCode, scorers, mvp) => {
      const allPlayers = players.filter(p => p.country === countryCode);
      const selected = new Set();
      
      // Select MVP
      const mvpPlayer = allPlayers.find(p => isMatch(p.name, mvp));
      if (mvpPlayer) selected.add(mvpPlayer.id);

      // Select Scorers
      for (const scorer of scorers) {
        const scorerPlayer = allPlayers.find(p => isMatch(p.name, scorer));
        if (scorerPlayer) selected.add(scorerPlayer.id);
      }

      // Fill up to 11
      for (const p of allPlayers) {
        if (selected.size >= 11) break;
        selected.add(p.id);
      }

      return Array.from(selected).map(id => allPlayers.find(p => p.id === id));
    };

    const homePlayers = get11Players(m.home_code, m.home_scorers, m.mvp);
    const awayPlayers = get11Players(m.away_code, m.away_scorers, m.mvp);

    const players_performance = [];

    const addPerformance = (p, isHome) => {
      const isMvp = isMatch(p.name, m.mvp);
      const scorers = isHome ? m.home_scorers : m.away_scorers;
      const hasScored = scorers.some(s => isMatch(p.name, s));
      
      let rating = 5.0;
      let highlight = "Partido correcto.";
      if (isMvp) {
        rating = 10.0;
        highlight = "Figura indiscutida del partido, excelente rendimiento.";
      } else if (hasScored) {
        rating = 8.5;
        highlight = "Importante contribución goleadora.";
      } else {
        rating = 4.0 + (Math.random() * 3);
      }

      players_performance.push({
        player_id: p.id,
        name: p.name,
        team: p.country,
        position: p.position,
        rating: parseFloat(rating.toFixed(1)),
        is_mvp: isMvp,
        highlight
      });
    };

    homePlayers.forEach(p => addPerformance(p, true));
    awayPlayers.forEach(p => addPerformance(p, false));

    puntajes.push({
      match_id: m.match_id,
      home_team: m.home_team,
      away_team: m.away_team,
      score: m.score,
      dt_stats: {
        tactical_analysis: m.tactical_analysis,
        players_performance
      }
    });
  }

  puntajes.sort((a,b) => {
    return a.match_id.localeCompare(b.match_id);
  });

  fs.writeFileSync('./src/data/puntajes.json', JSON.stringify(puntajes, null, 2));
  console.log("Updated matches ensuring MVPs and scorers are correctly included.");
  process.exit(0);
};

main();
