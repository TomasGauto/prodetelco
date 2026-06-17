import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const NICKNAME_RE = /^[a-zA-Z0-9 _.\-]{3,20}$/;

const validate = (value) => {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 3) return { ok: false, error: 'Mínimo 3 caracteres.' };
  if (trimmed.length > 20) return { ok: false, error: 'Máximo 20 caracteres.' };
  if (!NICKNAME_RE.test(trimmed)) {
    return { ok: false, error: 'Solo letras, números, espacios y _ . -' };
  }
  return { ok: true, value: trimmed };
};

const randomNickname = () =>
  `Jugador-${Math.floor(1000 + Math.random() * 9000)}`;

const NicknameGate = () => {
  const { currentUser } = useAuth();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (nickname) => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', currentUser.uid),
        { nickname },
        { merge: true }
      );
    } catch (err) {
      console.error('Error guardando nickname:', err);
      setError('No se pudo guardar. Probá de nuevo.');
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = validate(value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await save(result.value);
  };

  const handleRandom = async () => {
    await save(randomNickname());
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 px-6 py-8 text-white text-center">
          <p className="text-indigo-200 text-xs font-semibold tracking-[0.18em] uppercase mb-2">
            Último paso
          </p>
          <h2 className="font-display text-3xl tracking-wide">Elegí tu nickname</h2>
          <p className="text-indigo-100 text-sm mt-3 leading-relaxed">
            Es tu identidad pública en el ranking, chat y feed. Nadie verá tu mail.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Nickname
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ej: messi10"
              autoFocus
              maxLength={20}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              3 a 20 caracteres. Letras, números, espacios y _ . -
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !value.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {saving ? 'Guardando...' : 'Confirmar y entrar'}
          </button>

          <button
            type="button"
            onClick={handleRandom}
            disabled={saving}
            className="w-full text-sm text-gray-500 hover:text-indigo-600 disabled:text-gray-300 transition-colors"
          >
            No quiero elegir, asigname uno aleatorio
          </button>
        </form>
      </div>
    </div>
  );
};

export default NicknameGate;
