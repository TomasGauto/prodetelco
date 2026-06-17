import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const unsubUserRef = useRef(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubUserRef.current) {
        unsubUserRef.current();
        unsubUserRef.current = null;
      }

      setCurrentUser(user);

      if (user) {
        unsubUserRef.current = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          setUserData(snap.exists() ? snap.data() : {});
        });
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubUserRef.current) unsubUserRef.current();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
