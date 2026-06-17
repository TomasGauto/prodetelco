import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from './UserAvatar';

const GroupsIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 8v-1a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v1m14 0v-1a3 3 0 0 0-2-2.83" />
  </svg>
);

const BracketIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h6v4H7v6h3v4H4m16-14h-6v4h3v6h-3v4h6" />
  </svg>
);

const PodiumIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4v-6H4v6Zm6 0h4V10h-4v10Zm6 0h4V6h-4v14Z" />
  </svg>
);

const ResultsIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM8 9h2m4 0h2M8 15h2m4 0h2" />
  </svg>
);

const ActivityIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const FeedIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
  </svg>
);

const DTIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2 4 7v6c0 5 4 8 8 9 4-1 8-4 8-9V7l-8-5Zm0 5v8m-3-4h6" />
  </svg>
);

const AdminIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v6c0 5 3 8 7 9 4-1 7-4 7-9V6l-7-3Z" />
  </svg>
);

const ProfileIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />
  </svg>
);

const Navbar = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const active = (path) =>
    location.pathname === path
      ? 'text-white border-b-2 border-white pb-0.5'
      : 'text-indigo-200 hover:text-white transition-colors';

  const mobileItems = [
    { to: '/feed', label: 'Feed', icon: FeedIcon },
    { to: '/dt', label: 'DT', icon: DTIcon },
    { to: '/groups', label: 'Grupos', icon: GroupsIcon },
    { to: '/knockout', label: 'Llaves', icon: BracketIcon },
    { to: '/ranking', label: 'Ranking', icon: PodiumIcon },
    { to: '/results', label: 'Resultados', icon: ResultsIcon },
    { to: '/logs', label: 'Actividad', icon: ActivityIcon },
    ...(userData?.isAdmin ? [{ to: '/admins', label: 'Admin', icon: AdminIcon }] : []),
    { to: '/profile', label: 'Perfil', icon: ProfileIcon },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <nav className="bg-indigo-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="font-display text-2xl tracking-widest hover:text-indigo-200 transition-colors">
            PRODE MUNDIAL
          </Link>

          {currentUser ? (
            <div className="flex items-center gap-5">
              <Link to="/feed" className={`text-sm font-medium hidden sm:block ${active('/feed')}`}>Feed</Link>
              <Link to="/dt" className={`text-sm font-medium hidden sm:block ${active('/dt')}`}>DT</Link>
              <Link to="/groups" className={`text-sm font-medium hidden sm:block ${active('/groups')}`}>Grupos</Link>
              <Link to="/knockout" className={`text-sm font-medium hidden sm:block ${active('/knockout')}`}>Eliminatorias</Link>
              <Link to="/ranking" className={`text-sm font-medium hidden sm:block ${active('/ranking')}`}>Ranking</Link>
              <Link to="/results" className={`text-sm font-medium hidden sm:block ${active('/results')}`}>Resultados</Link>
              {userData?.isAdmin && (
                <Link to="/admins" className={`text-sm font-medium hidden sm:block ${active('/admins')}`}>Admin</Link>
              )}
              <Link to="/logs" className={`text-sm font-medium hidden sm:block ${active('/logs')}`}>Actividad</Link>

              <div className="flex items-center gap-3 border-l border-indigo-500 pl-5">
                <Link to="/profile" className="hover:opacity-80 transition-opacity" title="Mi perfil">
                  <UserAvatar user={currentUser} userData={userData} size="sm" />
                </Link>
                <Link
                  to="/profile"
                  className="text-sm hidden md:block max-w-[120px] truncate hover:text-indigo-200 transition-colors"
                >
                  {userData?.nickname || 'Mi perfil'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded-md transition-colors"
                >
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium hover:text-indigo-200 transition-colors">
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="text-sm bg-white text-indigo-700 font-medium px-3 py-1 rounded-md hover:bg-indigo-50 transition-colors"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>

      {currentUser && (
        <div className="fixed inset-x-0 bottom-0 z-[85] border-t border-indigo-500/50 bg-indigo-700/95 backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-7xl items-stretch gap-1 overflow-x-auto px-2 py-2">
            {mobileItems.map((item) => {
              const isActive = location.pathname === item.to;
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex min-w-[78px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-indigo-100 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-700' : 'text-indigo-200'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
