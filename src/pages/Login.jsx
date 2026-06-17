import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/groups');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Iniciar sesión</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Inicia sesión con Google</p>
        </div>

        {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center px-4 py-2 mt-4 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.75 11.5h3.5v-2h-3.5v2zm5.25-6.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              clipRule="evenodd"
            />
          </svg>
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  );
};

export default Login;