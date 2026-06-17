import { useState, useEffect } from 'react';
import {
  doc, getDoc, deleteDoc, runTransaction, serverTimestamp,
  collection, getDocs, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';
import PostComments from './PostComments';
import { timeAgo } from '../utils/timeAgo';
import { optimized } from '../lib/cloudinary';

const HeartIcon = ({ filled, className }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.8"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8-2.83A4.5 4.5 0 0 1 19 11c0 5.65-7 10-7 10Z"
    />
  </svg>
);

const CommentIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a8 8 0 0 1-11.5 7.18L4 21l1.82-5.5A8 8 0 1 1 21 12Z"
    />
  </svg>
);

const PostCard = ({ post, onDelete, onOpenProfile }) => {
  const { currentUser } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [busyLike, setBusyLike] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = post.authorId === currentUser?.uid;

  useEffect(() => {
    let active = true;
    const checkLike = async () => {
      if (!currentUser) return;
      try {
        const snap = await getDoc(doc(db, 'posts', post.id, 'likes', currentUser.uid));
        if (active) setLiked(snap.exists());
      } catch (err) {
        console.error('Error verificando like:', err);
      }
    };
    checkLike();
    return () => { active = false; };
  }, [currentUser, post.id]);

  const handleToggleLike = async () => {
    if (busyLike || !currentUser) return;
    setBusyLike(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));
    try {
      const postRef = doc(db, 'posts', post.id);
      const likeRef = doc(db, 'posts', post.id, 'likes', currentUser.uid);
      await runTransaction(db, async (tx) => {
        const likeSnap = await tx.get(likeRef);
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists()) throw new Error('Post no existe');
        const currentLikes = postSnap.data().likeCount || 0;
        if (likeSnap.exists()) {
          tx.delete(likeRef);
          tx.update(postRef, { likeCount: Math.max(0, currentLikes - 1) });
        } else {
          tx.set(likeRef, { createdAt: serverTimestamp() });
          tx.update(postRef, { likeCount: currentLikes + 1 });
        }
      });
    } catch (err) {
      console.error('Error en like:', err);
      setLiked(wasLiked);
      setLikeCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
    } finally {
      setBusyLike(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Borrar esta publicación? También se borran los comentarios y likes.')) return;
    setDeleting(true);
    try {
      const likesSnap = await getDocs(collection(db, 'posts', post.id, 'likes'));
      const commentsSnap = await getDocs(collection(db, 'posts', post.id, 'comments'));
      const batch = writeBatch(db);
      likesSnap.docs.forEach((d) => batch.delete(d.ref));
      commentsSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      await deleteDoc(doc(db, 'posts', post.id));
      onDelete?.(post.id);
    } catch (err) {
      console.error('Error al borrar post:', err);
      alert('No se pudo borrar la publicación.');
      setDeleting(false);
    }
  };

  return (
    <article className="bg-white border border-gray-200 rounded-2xl mb-4 shadow-sm overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => onOpenProfile?.(post.authorId)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <UserAvatar
            user={{ displayName: post.authorNickname }}
            userData={{
              avatarEmoji: post.authorAvatarEmoji,
              avatarColor: post.authorAvatarColor,
              nickname: post.authorNickname,
            }}
            size="sm"
          />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{post.authorNickname}</p>
            <p className="text-xs text-gray-400 leading-tight">{timeAgo(post.createdAt)}</p>
          </div>
        </button>

        {isAuthor && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors px-2 py-1"
          >
            {deleting ? 'Borrando...' : 'Borrar'}
          </button>
        )}
      </header>

      {/* Text */}
      {post.text && (
        <div className="px-4 pb-3">
          <p className="text-gray-800 whitespace-pre-wrap break-words">{post.text}</p>
        </div>
      )}

      {/* Image */}
      {post.imageUrl && (
        <div className="bg-gray-950">
          <img
            src={optimized(post.imageUrl, 1000)}
            alt="Imagen de la publicación"
            loading="lazy"
            className="w-full max-h-[600px] object-contain mx-auto"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-1 border-t border-gray-100">
        <button
          onClick={handleToggleLike}
          disabled={busyLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            liked ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <HeartIcon filled={liked} className="w-5 h-5" />
          <span className="tabular-nums">{likeCount}</span>
        </button>

        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <CommentIcon className="w-5 h-5" />
          <span className="tabular-nums">{commentCount}</span>
        </button>
      </div>

      {showComments && (
        <PostComments
          postId={post.id}
          postAuthorId={post.authorId}
          onOpenProfile={onOpenProfile}
          onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
        />
      )}
    </article>
  );
};

export default PostCard;
