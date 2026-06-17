import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const Admins = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setUsers(data.sort((a,b) => (b.totalPoints||0) - (a.totalPoints||0)));
    });
    return () => unsub();
  }, []);

  if (!userData?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Acceso denegado. Sólo administradores.</p>
      </div>
    );
  }

  const toggleAdmin = async (u) => {
    try {
      await updateDoc(doc(db, 'users', u.id), { isAdmin: !u.isAdmin });
    } catch (err) {
      console.error('Error updating admin', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Administración de usuarios</h1>
        <div className="bg-white rounded shadow p-4">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left py-2">Nickname</th>
                <th className="text-left py-2">Puntos</th>
                <th className="text-left py-2">Admin</th>
                <th className="text-left py-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="py-2">{u.nickname || '—'}</td>
                  <td className="py-2">{u.totalPoints || 0}</td>
                  <td className="py-2">{u.isAdmin ? 'Sí' : 'No'}</td>
                  <td className="py-2">
                    <button onClick={() => toggleAdmin(u)} className="px-3 py-1 bg-indigo-600 text-white rounded">
                      {u.isAdmin ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-3">
            Para buscar por email, usá la consola de Firebase Auth.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Admins;
