import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, deleteDoc,
  doc, serverTimestamp, updateDoc, increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';
import { timeAgo } from '../utils/timeAgo';

const PostComments = ({ postId, postAuthorId, onOpenProfile, onCountChange }) => {
  const { currentUser, userData } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        authorId: currentUser.uid,
        authorNickname: userData?.nickname || 'Jugador',
        authorAvatarEmoji: userData?.avatarEmoji || '',
        authorAvatarColor: userData?.avatarColor || '#6366f1',
        text: value,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'posts', postId), {
        commentCount: increment(1),
      });
      onCountChange?.(1);
      setText('');
    } catch (err) {
      console.error('Error al comentar:', err);
      alert('No se pudo enviar el comentario.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (comment) => {
    if (!confirm('¿Borrar este comentario?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId, 'comments', comment.id));
      await updateDoc(doc(db, 'posts', postId), {
        commentCount: increment(-1),
      });
      onCountChange?.(-1);
    } catch (err) {
      console.error('Error al borrar:', err);
      alert('No se pudo borrar.');
    }
  };

  return (
    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
      {comments.length > 0 && (
        <ul className="space-y-3 mb-3">
          {comments.map((c) => {
            const canDelete = c.authorId === currentUser.uid || postAuthorId === currentUser.uid;
            return (
              <li key={c.id} className="flex gap-2.5">
                <button
                  onClick={() => onOpenProfile?.(c.authorId)}
                  className="shrink-0 hover:opacity-80 transition-opacity"
                  title="Ver perfil"
                >
                  <UserAvatar
                    user={{ displayName: c.authorNickname, photoURL: c.authorPhotoURL }}
                    userData={{
                      avatarEmoji: c.authorAvatarEmoji,
                      avatarColor: c.authorAvatarColor,
                      nickname: c.authorNickname,
                    }}
                    size="xs"
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2">
                    <button
                      onClick={() => onOpenProfile?.(c.authorId)}
                      className="text-xs font-semibold text-gray-800 hover:text-indigo-600 transition-colors"
                    >
                      {c.authorNickname}
                    </button>
                    <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">{c.text}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 px-2">
                    <span className="text-[11px] text-gray-400">{timeAgo(c.createdAt)}</span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Borrar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <UserAvatar user={currentUser} userData={userData} size="xs" />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí un comentario..."
          maxLength={500}
          className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 disabled:text-gray-300 transition-colors px-2"
        >
          Enviar
        </button>
      </form>
    </div>
  );
};

export default PostComments;
