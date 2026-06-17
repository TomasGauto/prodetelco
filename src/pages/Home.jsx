import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import RecentPostsPanel from '../components/RecentPostsPanel';

const WORLD_CUP_KICKOFF = new Date('2026-06-11T00:00:00-06:00');

const getTimeLeft = () => {
  const diff = WORLD_CUP_KICKOFF.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, started: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, started: false };
};

const pad = (n) => String(n).padStart(2, '0');

const Home = () => {
  const { currentUser } = useAuth();
  const [participantsCount, setParticipantsCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const snapshot = await getCountFromServer(collection(db, 'users'));
        setParticipantsCount(snapshot.data().count);
      } catch (error) {
        console.error("Error fetching users count:", error);
      }
    };
    fetchCount();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalPrize = participantsCount * 10000;
  const formattedPrize = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(totalPrize);

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <div className="relative bg-gray-950 text-white overflow-hidden">
        {/* Imagen de fondo (Messi) */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
          style={{ backgroundImage: "url('/messi.jpg')" }}
        />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 sm:py-28">
          <div className="lg:grid lg:grid-cols-3 lg:gap-10">
            <div className="lg:col-span-2">
          <p className="text-indigo-400 text-xs font-semibold tracking-[0.2em] uppercase mb-5">
            FIFA World Cup · USA · CAN · MEX · 2026
          </p>
          <h1 className="font-display text-[clamp(4rem,12vw,9rem)] leading-none text-white mb-6">
            PRODE<br className="sm:hidden" />{' '}
            <span className="text-indigo-400">MUNDIAL</span>
          </h1>

          {/* Countdown al inicio del Mundial */}
          <div className="mb-8 max-w-2xl">
            <div className="relative overflow-hidden bg-white/5 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <p className="text-indigo-300 text-xs font-semibold tracking-[0.18em] uppercase">
                  {timeLeft.started ? 'El Mundial ya arrancó' : 'Faltan para el Mundial'}
                </p>
                <p className="text-gray-400 text-xs font-medium tracking-wider">11 · 06 · 2026</p>
              </div>
              {timeLeft.started ? (
                <p className="font-display text-3xl sm:text-4xl text-white">¡A jugar!</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { label: 'Días', value: timeLeft.days },
                    { label: 'Horas', value: pad(timeLeft.hours) },
                    { label: 'Min', value: pad(timeLeft.minutes) },
                    { label: 'Seg', value: pad(timeLeft.seconds) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-center">
                      <p className="font-display text-3xl sm:text-5xl font-bold text-white leading-none tabular-nums">
                        {value}
                      </p>
                      <p className="text-indigo-200/80 text-[10px] sm:text-xs uppercase tracking-wider mt-2">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nuevas tarjetas de Estadísticas */}
          <div className="flex flex-col sm:flex-row gap-5 mb-8 max-w-2xl">
            {/* Tarjeta Participantes */}
            <div className="flex-1 relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all hover:bg-white/15 hover:-translate-y-1">
              <div className="absolute -top-4 -right-4 p-4 opacity-10 pointer-events-none">
                <svg className="w-32 h-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-indigo-200 text-sm font-semibold tracking-wider uppercase mb-2">Participantes</p>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="font-display text-5xl font-bold text-white drop-shadow-md">{participantsCount}</span>
                <span className="text-indigo-300 text-lg font-medium">jugadores</span>
              </div>
            </div>

            {/* Tarjeta Pozo Acumulado */}
            <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-indigo-600/90 to-purple-600/90 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-[0_8px_30px_rgb(79,70,229,0.3)] transition-all hover:shadow-[0_8px_40px_rgb(79,70,229,0.5)] hover:-translate-y-1">
              <div className="absolute -top-4 -right-4 p-4 opacity-10 pointer-events-none">
                <svg className="w-32 h-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-indigo-200 text-sm font-semibold tracking-wider uppercase mb-2 text-shadow-sm">Pozo Acumulado</p>
              <div className="flex items-baseline gap-2 relative z-10">
                <span className="font-display text-5xl font-bold text-white drop-shadow-md">{formattedPrize}</span>
                <span className="text-indigo-200 text-lg font-medium">ARS</span>
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-base sm:text-lg max-w-sm mb-10 leading-relaxed">
            Predecí resultados, acumulá puntos y quedate con la copa.
          </p>
          {currentUser ? (
            <Link
              to="/groups"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 transition-colors"
            >
              Ver mis pronósticos →
            </Link>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 transition-colors"
              >
                Entrar con Google
              </Link>
              <Link
                to="/login"
                className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-semibold px-8 py-3 transition-colors"
              >
                Ya tengo cuenta
              </Link>
            </div>
          )}
            </div>

            <aside className="lg:col-span-1 mt-12 lg:mt-0">
              <div className="lg:sticky lg:top-6">
                <RecentPostsPanel />
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Secciones */}
      <div className="max-w-4xl mx-auto px-6 py-14">
        <div className="grid sm:grid-cols-3 gap-px bg-gray-200 border border-gray-200">
          <Link
            to={currentUser ? '/groups' : '/login'}
            className="bg-white p-7 hover:bg-indigo-50 transition-colors group"
          >
            <p className="font-display text-5xl text-indigo-200 group-hover:text-indigo-400 transition-colors mb-4">72</p>
            <h2 className="font-display text-2xl tracking-wide text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">
              FASE DE GRUPOS
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              12 grupos, 48 equipos. Predecí todos los partidos antes de que arranquen.
            </p>
          </Link>

          <Link
            to={currentUser ? '/knockout' : '/login'}
            className="bg-white p-7 hover:bg-indigo-50 transition-colors group"
          >
            <p className="font-display text-5xl text-indigo-200 group-hover:text-indigo-400 transition-colors mb-4">32</p>
            <h2 className="font-display text-2xl tracking-wide text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">
              ELIMINATORIAS
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Desde octavos hasta la final. Cada acierto vale más a medida que avanza el torneo.
            </p>
          </Link>

          <Link
            to={currentUser ? '/ranking' : '/login'}
            className="bg-white p-7 hover:bg-indigo-50 transition-colors group"
          >
            <p className="font-display text-5xl text-indigo-200 group-hover:text-indigo-400 transition-colors mb-4">#1</p>
            <h2 className="font-display text-2xl tracking-wide text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">
              RANKING
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Tabla en tiempo real. Seguí quién va primero y cuánto te separa del podio.
            </p>
          </Link>
        </div>

        {/* Puntos */}
        <div className="mt-12 grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="font-display text-2xl tracking-wide text-gray-900 mb-4">FASE DE GRUPOS</h3>
            <table className="w-full text-sm text-gray-600 border-collapse">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5">Resultado exacto</td>
                  <td className="py-2.5 text-right font-semibold text-indigo-600">3 pts</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5">Ganador o empate correcto</td>
                  <td className="py-2.5 text-right font-semibold text-indigo-600">1 pt</td>
                </tr>
                <tr>
                  <td className="py-2.5">Diferencia de gol exacta</td>
                  <td className="py-2.5 text-right font-semibold text-indigo-600">+1 pt</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="font-display text-2xl tracking-wide text-gray-900 mb-4">ELIMINATORIAS</h3>
            <table className="w-full text-sm text-gray-600 border-collapse">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5">Ganador correcto</td>
                  <td className="py-2.5 text-right font-semibold text-indigo-600">3 pts</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2.5">Resultado exacto</td>
                  <td className="py-2.5 text-right font-semibold text-indigo-600">+2 pts</td>
                </tr>
                <tr>
                  <td className="py-2.5">Acertar al campeón</td>
                  <td className="py-2.5 text-right font-semibold text-indigo-600">+10 pts</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
