import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  orderBy,
  query,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';
import UserProfileModal from './UserProfileModal';
import { uploadImage, optimized, MAX_IMAGE_BYTES } from '../lib/cloudinary';

const MAX_MESSAGE_LENGTH = 10000;
const MIN_INTERVAL_MS = 3000;
const MAX_MESSAGES_PER_MINUTE = 12;
const DUPLICATE_WINDOW_MS = 30000;

const toHandle = (name) => name.replace(/\s+/g, '_');

const getMentionQuery = (text, pos) => {
  const m = text.slice(0, pos).match(/@(\w*)$/);
  return m ? m[1] : null;
};

const buildTextWithMention = (text, pos, nickname) => {
  const handle = toHandle(nickname);
  const before = text.slice(0, pos).replace(/@\w*$/, `@${handle} `);
  return { newText: before + text.slice(pos), newCursor: before.length };
};

const fmtShort = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const toMillis = (ts) => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.toDate) return ts.toDate().getTime();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
};

const sanitizeMessage = (value) => {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const renderText = (text) =>
  text.split(/(@\S+)/).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="font-semibold text-indigo-400 bg-indigo-50 rounded px-0.5">{part}</span>
      : part
  );

const ChatWidget = () => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [users, setUsers] = useState({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [unread, setUnread] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [reads, setReads] = useState({});
  const lastSeenRef = useRef(0);
  const lastSentAtRef = useRef(0);
  const lastSentTextRef = useRef('');
  const lastReadWriteRef = useRef('');

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const setImage = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setChatError('La imagen supera los 8MB.');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setChatError('');
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) =>
      i.type.startsWith('image/')
    );
    if (item) {
      e.preventDefault();
      setImage(item.getAsFile());
    }
  };

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = d.data(); });
      setUsers(m);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'comments'), orderBy('createdAt', 'asc'), limit(300));
    return onSnapshot(q, (snap) => {
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setComments(items);
    });
  }, []);

  useEffect(() => {
    if (!open) {
      const count = comments.filter(
        (c) => (c.createdAt?.seconds || 0) > lastSeenRef.current && c.userId !== currentUser?.uid
      ).length;
      setUnread(count);
    }
  }, [comments, open, currentUser?.uid]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      const last = comments[comments.length - 1]?.createdAt?.seconds || 0;
      lastSeenRef.current = last;
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open, comments]);

  // Suscripción a "visto por": último timestamp de lectura de cada usuario.
  useEffect(() => {
    return onSnapshot(collection(db, 'chat_reads'), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = toMillis(d.data().lastReadAt); });
      setReads(m);
    });
  }, []);

  // Marca como leído el último mensaje cuando el chat está abierto.
  useEffect(() => {
    if (!open || !currentUser) return;
    const lastId = comments[comments.length - 1]?.id;
    if (!lastId || lastReadWriteRef.current === lastId) return;
    lastReadWriteRef.current = lastId;
    setDoc(
      doc(db, 'chat_reads', currentUser.uid),
      { lastReadAt: serverTimestamp() },
      { merge: true }
    ).catch((e) => console.error('Error marcando visto:', e));
  }, [open, comments, currentUser]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments, open]);

  useEffect(() => {
    setMentionIdx(0);
  }, [mentionQuery]);

  if (!currentUser) return null;

  const userList = Object.entries(users)
    .map(([id, u]) => ({ id, name: u.nickname || 'Jugador', ...u }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const lastMessage = comments[comments.length - 1];
  const lastMessageMs = toMillis(lastMessage?.createdAt);
  const seenByNames = lastMessage
    ? Object.entries(reads)
        .filter(([uid, readMs]) =>
          uid !== lastMessage.userId &&
          uid !== currentUser.uid &&
          readMs >= lastMessageMs
        )
        .map(([uid]) => users[uid]?.nickname || 'Jugador')
        .sort((a, b) => a.localeCompare(b))
    : [];

  const mentionMatches = mentionQuery !== null
    ? userList.filter((u) => toHandle(u.name).toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 7)
    : [];

  const handleChange = (e) => {
    setText(e.target.value);
    setMentionQuery(getMentionQuery(e.target.value, e.target.selectionStart));
    if (chatError) setChatError('');
  };

  const applyMention = (name) => {
    const pos = textareaRef.current.selectionStart;
    const { newText, newCursor } = buildTextWithMention(text, pos, name);
    setText(newText);
    setMentionQuery(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => Math.min(i + 1, mentionMatches.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); applyMention(mentionMatches[mentionIdx]?.name); return; }
      if (e.key === 'Escape') { e.preventDefault(); setMentionQuery(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const throwCode = (code) => {
    const err = new Error(code);
    err.code = code;
    throw err;
  };

  const handleSend = async () => {
    const cleaned = sanitizeMessage(text);
    if ((!cleaned && !imageFile) || sending) return;

    if (cleaned.length > MAX_MESSAGE_LENGTH) {
      setChatError(`El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres.`);
      return;
    }

    const now = Date.now();
    if (now - lastSentAtRef.current < MIN_INTERVAL_MS) {
      setChatError('Espera unos segundos antes de enviar otro mensaje.');
      return;
    }

    if (!imageFile && cleaned === lastSentTextRef.current && now - lastSentAtRef.current < DUPLICATE_WINDOW_MS) {
      setChatError('No repitas el mismo mensaje de forma consecutiva.');
      return;
    }

    setSending(true);
    setChatError('');

    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      const signature = cleaned || imageUrl;

      const limitRef = doc(db, 'chat_limits', currentUser.uid);
      const limitSnap = await getDoc(limitRef);

      let nextWindowStart = serverTimestamp();
      let nextCount = 1;

      if (limitSnap.exists()) {
        const limitData = limitSnap.data();
        const lastMessageAtMs = toMillis(limitData.lastMessageAt);
        const windowStartMs = toMillis(limitData.windowStart || limitData.lastMessageAt);
        const currentCount = Number.isInteger(limitData.count) ? limitData.count : 0;

        if (lastMessageAtMs && now - lastMessageAtMs < MIN_INTERVAL_MS) {
          throwCode('cooldown');
        }

        if (limitData.lastMessageText === signature) {
          throwCode('duplicate');
        }

        if (windowStartMs && now - windowStartMs < 60000) {
          if (currentCount >= MAX_MESSAGES_PER_MINUTE) {
            throwCode('window_limit');
          }
          nextWindowStart = limitData.windowStart || limitData.lastMessageAt || serverTimestamp();
          nextCount = currentCount + 1;
        } else {
          nextWindowStart = serverTimestamp();
          nextCount = 1;
        }
      }

      const commentRef = doc(collection(db, 'comments'));
      const batch = writeBatch(db);

      batch.set(commentRef, {
        userId: currentUser.uid,
        text: cleaned,
        createdAt: serverTimestamp(),
        ...(imageUrl ? { imageUrl } : {}),
      });

      batch.set(limitRef, {
        lastMessageAt: serverTimestamp(),
        lastMessageText: signature,
        windowStart: nextWindowStart,
        count: nextCount,
        lastCommentId: commentRef.id,
      }, { merge: true });

      await batch.commit();

      setText('');
      clearImage();
      setMentionQuery(null);
      lastSentAtRef.current = Date.now();
      lastSentTextRef.current = signature;
      textareaRef.current?.focus();
    } catch (error) {
      if (error?.code === 'cooldown') {
        setChatError('Espera unos segundos antes de enviar otro mensaje.');
      } else if (error?.code === 'duplicate') {
        setChatError('No repitas el mismo mensaje de forma consecutiva.');
      } else if (error?.code === 'window_limit') {
        setChatError(`Limite alcanzado: maximo ${MAX_MESSAGES_PER_MINUTE} mensajes por minuto.`);
      } else if (error?.code === 'permission-denied') {
        setChatError('Mensaje bloqueado por reglas de seguridad. Espera unos segundos e intenta de nuevo.');
      } else if (error?.message?.includes('Cloudinary') || error?.message?.includes('imagen')) {
        setChatError('No se pudo subir la imagen. Intenta nuevamente.');
      } else {
        setChatError('No se pudo enviar el mensaje. Intenta nuevamente.');
      }
      console.error('Error sending chat message:', error);
    } finally {
      setSending(false);
    }
  };

  const openProfile = (userId, userData) => {
    setSelected({
      userId,
      userData,
      user: { displayName: userData.nickname, photoURL: userData.photoURL },
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 right-4 sm:bottom-5 sm:right-6 z-[90] h-12 px-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center gap-2 text-sm font-semibold tracking-wide transition-all"
        aria-label={open ? 'Cerrar chat' : 'Abrir chat'}
      >
        {open ? (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
            CERRAR
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a8 8 0 0 1-11.5 7.18L4 21l1.82-5.5A8 8 0 1 1 21 12Z" />
            </svg>
            CHAT
          </>
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed bottom-28 right-4 sm:bottom-24 sm:right-6 z-[90] w-[min(92vw,34rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: 'min(80vh, 48rem)' }}
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-indigo-600 text-white">
            <span className="font-semibold text-sm flex items-center gap-2">
              Chat
              <span className="text-xs font-normal text-indigo-200">{comments.length} mensajes</span>
            </span>
            <button onClick={() => setOpen(false)} className="text-indigo-200 hover:text-white leading-none text-sm">X</button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {comments.length === 0 && (
              <p className="text-xs text-center text-gray-400 mt-8 leading-relaxed">
                Se el primero en comentar.<br />
                Escribe <span className="text-indigo-500 font-semibold">@</span> para etiquetar.
              </p>
            )}
            {comments.map((c) => {
              const u = users[c.userId] || {};
              const name = u.nickname || 'Jugador';
              const isMe = c.userId === currentUser?.uid;
              return (
                <div key={c.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={() => openProfile(c.userId, u)}
                    className="shrink-0 hover:opacity-80 transition-opacity focus:outline-none"
                  >
                    <UserAvatar
                      user={{ displayName: u.nickname, photoURL: u.photoURL }}
                      userData={u}
                      size="xs"
                    />
                  </button>
                  <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <button
                        onClick={() => openProfile(c.userId, u)}
                        className="text-[10px] text-indigo-500 hover:text-indigo-700 mb-0.5 ml-1 font-medium focus:outline-none"
                      >
                        {name}
                      </button>
                    )}
                    {c.text && (
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-snug break-words ${
                        isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                      }`}>
                        {renderText(c.text)}
                      </div>
                    )}
                    {c.imageUrl && (
                      <a
                        href={c.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={c.text ? 'mt-1' : ''}
                      >
                        <img
                          src={optimized(c.imageUrl, 400)}
                          alt="Imagen del mensaje"
                          loading="lazy"
                          className="rounded-xl max-h-60 w-auto border border-gray-200"
                        />
                      </a>
                    )}
                    <span className="text-[10px] text-gray-300 mt-0.5 mx-1">{fmtShort(c.createdAt)}</span>
                  </div>
                </div>
              );
            })}
            {seenByNames.length > 0 && (
              <p className="text-[10px] text-gray-400 text-right pr-1 pt-1">
                Visto por {seenByNames.join(', ')}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 pb-3 pt-2 border-t border-gray-100 shrink-0 relative">
            {mentionQuery !== null && mentionMatches.length > 0 && (
              <div className="absolute left-3 right-3 bottom-full mb-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-20">
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                  <p className="text-[10px] text-gray-400 font-medium">Arriba/abajo navegar - Tab/Enter seleccionar - Esc cerrar</p>
                </div>
                {mentionMatches.map((u, i) => (
                  <button
                    key={u.id}
                    onMouseDown={(e) => { e.preventDefault(); applyMention(u.name); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      i === mentionIdx ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                  >
                    <UserAvatar
                      user={{ displayName: u.nickname, photoURL: u.photoURL }}
                      userData={u}
                      size="xs"
                    />
                    <span className="text-sm font-semibold text-gray-800">@{toHandle(u.name)}</span>
                    {i === mentionIdx && <span className="text-[10px] text-indigo-400 ml-auto shrink-0">OK</span>}
                  </button>
                ))}
              </div>
            )}
            {mentionQuery !== null && mentionQuery.length > 0 && mentionMatches.length === 0 && (
              <div className="absolute left-3 right-3 bottom-full mb-2 bg-white rounded-xl border border-gray-200 shadow-lg px-3 py-2.5 z-20">
                <p className="text-xs text-gray-400">No se encontro <span className="font-semibold">@{mentionQuery}</span></p>
              </div>
            )}

            {imagePreview && (
              <div className="relative inline-block mb-2">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="max-h-28 w-auto rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-gray-900/80 hover:bg-gray-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs"
                  aria-label="Quitar imagen"
                >
                  ✕
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0])}
              className="hidden"
            />

            <div className="flex gap-2 items-end">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-indigo-600 transition-colors shrink-0 p-2"
                aria-label="Adjuntar imagen"
                title="Adjuntar imagen"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.5-4.5a2 2 0 0 1 2.8 0L16 16m-2-2 1.5-1.5a2 2 0 0 1 2.8 0L20 14M4 6h16v12H4zM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                </svg>
              </button>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Comenta... @ para etiquetar (podés pegar una imagen)"
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={handleSend}
                disabled={(!sanitizeMessage(text) && !imageFile) || sending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl px-3 py-2 text-sm font-medium transition-colors shrink-0"
              >
                {sending ? '...' : 'Enviar'}
              </button>
            </div>

            <div className="mt-1 flex items-center justify-between">
              <p className="text-[10px] text-gray-300">Enter - Shift+Enter nueva linea</p>
              <p className="text-[10px] text-gray-300">{sanitizeMessage(text).length}/{MAX_MESSAGE_LENGTH}</p>
            </div>

            {chatError && (
              <p className="mt-1 text-xs text-red-600">{chatError}</p>
            )}
          </div>
        </div>
      )}

      {selected && (
        <UserProfileModal
          userId={selected.userId}
          userData={selected.userData}
          user={selected.user}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};

export default ChatWidget;
