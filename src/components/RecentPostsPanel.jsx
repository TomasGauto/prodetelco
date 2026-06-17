import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';
import { timeAgo } from '../utils/timeAgo';

const RecentPostsPanel = () => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const fetchLatest = async () => {
      try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(4));
        const snap = await getDocs(q);
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error cargando feed preview:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();
  }, [currentUser]);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <p className="text-indigo-300 text-xs font-semibold tracking-[0.18em] uppercase">
          Últimas del feed
        </p>
        <Link
          to={currentUser ? '/feed' : '/login'}
          className="text-xs text-indigo-300 hover:text-white transition-colors font-medium"
        >
          Ver todo →
        </Link>
      </div>

      {!currentUser ? (
        <div className="px-5 py-10 text-center">
          <p className="text-gray-300 text-sm mb-4 leading-relaxed">
            Iniciá sesión para ver lo que está diciendo la comunidad.
          </p>
          <Link
            to="/login"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Entrar
          </Link>
        </div>
      ) : loading ? (
        <div className="px-5 py-10 text-center">
          <p className="text-gray-400 text-sm">Cargando...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-gray-300 text-sm mb-4">Todavía no hay publicaciones.</p>
          <Link
            to="/feed"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Hacé la primera
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-white/10">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                to="/feed"
                className="flex gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors"
              >
                <UserAvatar
                  user={{ displayName: post.authorNickname, photoURL: post.authorPhotoURL }}
                  userData={{
                    avatarEmoji: post.authorAvatarEmoji,
                    avatarColor: post.authorAvatarColor,
                    nickname: post.authorNickname,
                  }}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">
                      {post.authorNickname}
                    </p>
                    <p className="text-[11px] text-gray-400 shrink-0">{timeAgo(post.createdAt)}</p>
                  </div>
                  <p
                    className="text-sm text-gray-300 break-words mt-0.5 overflow-hidden"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {post.text}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8-2.83A4.5 4.5 0 0 1 19 11c0 5.65-7 10-7 10Z" />
                      </svg>
                      {post.likeCount || 0}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a8 8 0 0 1-11.5 7.18L4 21l1.82-5.5A8 8 0 1 1 21 12Z" />
                      </svg>
                      {post.commentCount || 0}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecentPostsPanel;
