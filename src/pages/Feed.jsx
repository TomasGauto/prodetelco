import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, orderBy, limit, startAfter, getDocs,
  addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/UserAvatar';
import PostCard from '../components/PostCard';
import UserProfileModal from '../components/UserProfileModal';
import { uploadImage, MAX_IMAGE_BYTES } from '../lib/cloudinary';

const POSTS_PER_PAGE = 20;

const Feed = () => {
  const { currentUser, userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');

  const [profileUserId, setProfileUserId] = useState(null);

  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);
  const fileInputRef = useRef(null);

  const fetchPosts = useCallback(async (cursor) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const baseQ = cursor
        ? query(collection(db, 'posts'), orderBy('createdAt', 'desc'), startAfter(cursor), limit(POSTS_PER_PAGE))
        : query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(POSTS_PER_PAGE));
      const snap = await getDocs(baseQ);
      if (snap.empty) {
        setHasMore(false);
      } else {
        const newPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...newPosts.filter((p) => !seen.has(p.id))];
        });
        setLastDoc(snap.docs[snap.docs.length - 1]);
        if (snap.size < POSTS_PER_PAGE) setHasMore(false);
      }
    } catch (err) {
      console.error('Error cargando posts:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    fetchPosts(null);
  }, [fetchPosts]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingRef.current && hasMore && lastDoc) {
          fetchPosts(lastDoc);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchPosts, hasMore, lastDoc]);

  const setImage = (file) => {
    setImageError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('El archivo no es una imagen.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('La imagen supera los 8MB.');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => setImage(e.target.files?.[0]);

  const handlePaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) =>
      i.type.startsWith('image/')
    );
    if (item) {
      e.preventDefault();
      setImage(item.getAsFile());
    }
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if ((!value && !imageFile) || posting) return;
    setPosting(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const payload = {
        authorId: currentUser.uid,
        authorNickname: userData?.nickname || 'Jugador',
        authorAvatarEmoji: userData?.avatarEmoji || '',
        authorAvatarColor: userData?.avatarColor || '#6366f1',
        text: value,
        createdAt: serverTimestamp(),
        likeCount: 0,
        commentCount: 0,
        ...(imageUrl ? { imageUrl } : {}),
      };
      const docRef = await addDoc(collection(db, 'posts'), payload);
      setPosts((prev) => [
        {
          id: docRef.id,
          ...payload,
          createdAt: { seconds: Math.floor(Date.now() / 1000) },
        },
        ...prev,
      ]);
      setText('');
      clearImage();
    } catch (err) {
      console.error('Error publicando:', err);
      alert(err.message || 'No se pudo publicar.');
    } finally {
      setPosting(false);
    }
  };

  const handleRemovePost = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl tracking-wide text-gray-900">FEED</h1>
          <p className="text-sm text-gray-500 mt-1">Compartí lo que pensás del Mundial con el resto.</p>
        </header>

        {/* Composer */}
        <form
          onSubmit={handlePost}
          className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm"
        >
          <div className="flex gap-3">
            <UserAvatar user={currentUser} userData={userData} size="md" />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePaste}
              placeholder="¿Qué estás pensando del Mundial? (podés pegar una imagen)"
              maxLength={1000}
              rows={3}
              className="flex-1 resize-none border-0 focus:ring-0 focus:outline-none text-gray-800 placeholder-gray-400"
            />
          </div>

          {imagePreview && (
            <div className="relative mt-3 ml-12">
              <img
                src={imagePreview}
                alt="Vista previa"
                className="max-h-72 w-auto rounded-xl border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 bg-gray-900/70 hover:bg-gray-900 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm"
                aria-label="Quitar imagen"
              >
                ✕
              </button>
            </div>
          )}

          {imageError && (
            <p className="text-xs text-red-600 mt-2 ml-12">{imageError}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.5-4.5a2 2 0 0 1 2.8 0L16 16m-2-2 1.5-1.5a2 2 0 0 1 2.8 0L20 14M4 6h16v12H4zM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                </svg>
                Foto
              </button>
              <span className="text-xs text-gray-400">{text.length}/1000</span>
            </div>
            <button
              type="submit"
              disabled={(!text.trim() && !imageFile) || posting}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {posting ? (imageFile ? 'Subiendo...' : 'Publicando...') : 'Publicar'}
            </button>
          </div>
        </form>

        {/* Lista de posts */}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onDelete={handleRemovePost}
            onOpenProfile={setProfileUserId}
          />
        ))}

        {/* Estado */}
        <div ref={sentinelRef} className="py-8 text-center text-gray-400 text-sm">
          {loading && 'Cargando...'}
          {!loading && initialized && posts.length === 0 && 'Todavía no hay publicaciones. ¡Sé el primero!'}
          {!loading && initialized && posts.length > 0 && !hasMore && '— Fin del feed —'}
        </div>
      </div>

      {profileUserId && (
        <UserProfileModal
          userId={profileUserId}
          onClose={() => setProfileUserId(null)}
        />
      )}
    </div>
  );
};

export default Feed;
