import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD38FhhESQw0X-8INZ7AGsqjOROlRF5Azg",
  authDomain: "prodetelco.firebaseapp.com",
  projectId: "prodetelco",
  storageBucket: "prodetelco.firebasestorage.app",
  messagingSenderId: "409928441490",
  appId: "1:409928441490:web:b9154006e25ef7544e504b",
  measurementId: "G-HDTFX927L5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
  console.log("Verificando datos en Firestore...");

  // Check teams
  const teamsSnap = await getDocs(collection(db, "teams"));
  console.log(`Equipos encontrados: ${teamsSnap.size}`);
  teamsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`${data.id}: ${data.name} (${data.fifaCode})`);
  });

  // Check matches for group A
  const matchesSnap = await getDocs(collection(db, "matches"));
  console.log(`\nPartidos encontrados: ${matchesSnap.size}`);
  const groupAMatches = matchesSnap.docs.filter(doc => doc.data().group === 'A');
  console.log(`Partidos del Grupo A: ${groupAMatches.length}`);
  groupAMatches.forEach(doc => {
    const data = doc.data();
    console.log(`${data.id}: ${data.homeTeam} vs ${data.awayTeam}`);
  });
}

checkData();