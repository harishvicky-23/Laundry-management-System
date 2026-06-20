// src/pages/auth/StudentLogin.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, decodeToken, isAuthenticated } from '../../utils/api';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      const token = localStorage.getItem('token');
      const decoded = decodeToken(token);
      if (decoded && decoded.role) {
        navigate(`/${decoded.role.toLowerCase()}/dashboard`, { replace: true });
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(username, password);

      // Verify role permissions
      const decoded = decodeToken(data.access_token);
      if (!decoded || decoded.role !== 'STUDENT') {
        throw new Error('Access Denied: Invalid student credentials or incorrect portal used.');
      }

      // Save token securely and navigate to the student dashboard
      localStorage.setItem('token', data.access_token);
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed');
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto w-full max-w-md animate-scale-up">
        {/* Back navigation */}
        <button 
          onClick={() => navigate('/', { replace: true })} 
          className="text-sm font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 mb-6 mx-auto transition-colors duration-150"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Main Campus Portal
        </button>

        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          <div className="text-center mb-8">
            <span className="p-3.5 bg-slate-900 text-white rounded-xl inline-block mb-3 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Student Portal Login</h2>
            <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">MIT Anna University</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl font-bold flex items-start gap-2 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Username / Roll Number</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-sm transition-all duration-150"
                placeholder="e.g. student1"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-sm transition-all duration-150"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-colors duration-150 cursor-pointer"
            >
              {loading ? 'Verifying Account...' : 'Sign In as Student'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}