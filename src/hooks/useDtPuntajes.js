import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import bundled from '../data/puntajes.json';
import { buildPointsIndex } from '../utils/dtPoints';

/**
 * Puntajes del DT. Prefiere el doc dt/puntajes de Firestore (que actualiza el
 * cron diario); si no existe o falla (ej. cuota), usa el JSON bundleado.
 * Devuelve { matches, index }.
 */
export const useDtPuntajes = () => {
  const [matches, setMatches] = useState(bundled);

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

  const index = useMemo(() => buildPointsIndex(matches), [matches]);
  return { matches, index };
};
