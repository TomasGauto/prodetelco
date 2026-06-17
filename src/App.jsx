import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Groups from './pages/Groups';
import Knockout from './pages/Knockout';
import Ranking from './pages/Ranking';
import Profile from './pages/Profile';
import Logs from './pages/Logs';
import Results from './pages/Results';
import Feed from './pages/Feed';
import DT from './pages/DT';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';
import NicknameGate from './components/NicknameGate';
import Admins from './pages/Admins';

function App() {
  const { loading, currentUser, userData } = useAuth();
  const needsNickname = !!currentUser && userData != null && !userData.nickname;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⚽</div>
          <p className="text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

    return (
      <BrowserRouter>
        <Navbar />
        {!needsNickname && <ChatWidget />}
        {needsNickname && <NicknameGate />}
        <main className={currentUser ? 'pb-20 sm:pb-0' : ''}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/groups"    element={<PrivateRoute><Groups /></PrivateRoute>} />
            <Route path="/knockout"  element={<PrivateRoute><Knockout /></PrivateRoute>} />
            <Route path="/ranking"   element={<PrivateRoute><Ranking /></PrivateRoute>} />
            <Route path="/results"   element={<PrivateRoute><Results /></PrivateRoute>} />
            <Route path="/feed"      element={<PrivateRoute><Feed /></PrivateRoute>} />
            <Route path="/dt"        element={<PrivateRoute><DT /></PrivateRoute>} />
            <Route path="/admins"    element={<PrivateRoute><Admins /></PrivateRoute>} />
            <Route path="/profile"   element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/logs"      element={<PrivateRoute><Logs /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    );
}

export default App;
