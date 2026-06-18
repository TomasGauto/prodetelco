import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import bundled from '../data/puntajes.json';
import { buildPointsIndex } from '../utils/dtPoints';

/**
 * Puntajes del DT. Prefiere el doc dt/puntajes de Firestore (que actualiza el
 * cron diario); si no existe o falla (ej. cuota), usa el JSON bundleado.
 *
 * Además lee dt/config.lockedMatchIds: los partidos de fechas ya cerradas, cuyos
 * puntos quedaron congelados (bankedPoints) por usuario. El `liveIndex` excluye
 * esos partidos, así editar el equipo nunca recalcula las fechas guardadas.
 *
 * Devuelve { matches, index, liveIndex, lockedMatchIds }.
 */
export const useDtPuntajes = () => {
  const [matches, setMatches] = useState(bundled);
  const [lockedMatchIds, setLockedMatchIds] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'dt', 'puntajes'),
      (snap) => {
        const data = snap.exists() ? snap.data()?.matches : null;
        if (Array.isArray(data) && data.length) setMatches(data);
        // si no existe el doc, se mantiene el bundled
      },
      () => { /* error (cuota / permisos): se mantiene el bundled */ }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'dt', 'config'),
      (snap) => {
        const ids = snap.exists() ? snap.data()?.lockedMatchIds : null;
        setLockedMatchIds(Array.isArray(ids) ? ids : []);
      },
      () => { /* sin config: nada congelado */ }
    );
    return () => unsub();
  }, []);

  const index = useMemo(() => buildPointsIndex(matches), [matches]);

  // Índice en vivo: solo partidos NO congelados. Si no hay nada congelado,
  // es igual al índice completo.
  const liveIndex = useMemo(() => {
    if (!lockedMatchIds.length) return index;
    const locked = new Set(lockedMatchIds);
    return buildPointsIndex((matches || []).filter((m) => !locked.has(m.match_id)));
  }, [matches, lockedMatchIds, index]);

  return { matches, index, liveIndex, lockedMatchIds };
};
