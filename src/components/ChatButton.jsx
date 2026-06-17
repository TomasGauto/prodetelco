import { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const ChatButton = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'chat_messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgs);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentUser || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'chat_messages'), {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Usuario Anonimo',
        text: inputValue.trim(),
        timestamp: serverTimestamp(),
      });
      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading || !currentUser) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-[70] w-[min(92vw,32rem)] h-[min(78vh,44rem)] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold">Chat Global</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-full hover:bg-indigo-500 transition-colors flex items-center justify-center"
              aria-label="Cerrar chat"
            >
              X
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-center text-gray-500 italic mt-8">Sin mensajes aun</p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.userId === currentUser.uid;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[78%] px-3 py-2 rounded-2xl ${
                        isMine ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                      <p className={`text-[11px] mt-1 ${isMine ? 'text-indigo-100' : 'text-gray-500'}`}>
                        {msg.userName} {msg.timestamp ? `- ${formatTime(msg.timestamp)}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="px-4 py-3 border-t border-gray-200 flex gap-2 bg-white">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || sending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-5 right-4 sm:right-6 z-[80] bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:bg-indigo-700 transition-colors"
        aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
      >
        {isOpen ? (
          <span className="text-lg font-semibold leading-none">X</span>
        ) : (
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M8 10H16M8 14H13M7 4H17C18.657 4 20 5.343 20 7V15C20 16.657 18.657 18 17 18H12L8 21V18H7C5.343 18 4 16.657 4 15V7C4 5.343 5.343 4 7 4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </>
  );
};

export default ChatButton;
