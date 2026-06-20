// src/components/DashboardLayout.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, decodeToken, isAuthenticated } from '../utils/api';
import mitLogo from '../assets/mit_logo.png';
import mitHostelsLogo from '../assets/mit_hostels.png';

export default function DashboardLayout({ role, children, title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.isLoggingOut) return;

    // 1. Session Guard Check
    if (!isAuthenticated()) {
      localStorage.removeItem('token');
      navigate('/', { replace: true });
      return;
    }

    const token = localStorage.getItem('token');
    const decoded = decodeToken(token);

    if (!decoded || decoded.role !== role) {
      localStorage.removeItem('token');
      navigate('/', { replace: true });
      return;
    }

    // 2. Fetch Profile Info based on role
    const fetchProfile = async () => {
      try {
        if (role === 'STUDENT') {
          const data = await api.get('/student/profile');
          setProfile(data);
        } else if (role === 'ATTENDANT') {
          const data = await api.get('/attendant/profile');
          setProfile(data);
        } else if (role === 'ADMIN') {
          // Admin does not have a separate profile table, use username/role from JWT
          setProfile({ name: 'System Administrator', username: decoded.username || 'admin' });
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [role, navigate]);

  const handleLogout = () => {
    window.isLoggingOut = true;
    localStorage.removeItem('token');
    localStorage.removeItem('laundry_students_cache');
    localStorage.removeItem('laundry_services_cache');
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
    setTimeout(() => {
      window.isLoggingOut = false;
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Session...</span>
        </div>
      </div>
    );
  }

  // Sidebar Links config per role
  const getSidebarLinks = () => {
    switch (role) {
      case 'STUDENT':
        return [];
      case 'ATTENDANT':
        return [];
      case 'ADMIN':
        return [
          {
            name: 'Admin Hub',
            path: '/admin/dashboard',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )
          },
        ];
      default:
        return [];
    }
  };

  const links = getSidebarLinks();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans h-screen overflow-hidden">
      {/* Unified Top Navigation Bar */}
      <header className="h-16 bg-slate-900 text-white px-8 flex justify-between items-center shrink-0 border-b border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <img src={mitLogo} alt="MIT Logo" className="h-9 w-auto object-contain bg-white p-0.5 rounded shadow-sm" />
            <img src={mitHostelsLogo} alt="MIT Hostels" className="h-9 w-auto object-contain bg-white p-0.5 rounded shadow-sm" />
            <div>
              <h2 className="text-xs font-black tracking-tight text-white leading-none">Campus Laundry</h2>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">MIT Hostels</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <button
                  key={link.name}
                  onClick={() => navigate(link.path)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{link.icon}</span>
                  <span className="hidden sm:inline">{link.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Workspace Title Area */}
          {title && (
            <div className="hidden lg:block text-xs font-bold text-slate-400 uppercase tracking-wider pl-4 border-l border-slate-800">
              {title}
            </div>
          )}
        </div>

        {/* User Info & Sign Out */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <span className="block text-xs font-bold text-white leading-none">
              {profile?.name || 'Active User'}
            </span>
            <div className="flex gap-2 items-center mt-1 justify-end">
              {profile?.roll_number && (
                <span className="text-[9px] font-bold text-slate-400 uppercase">
                  Roll: {profile.roll_number}
                </span>
              )}
              {profile?.phone && (
                <span className="text-[9px] font-bold text-slate-450 uppercase">
                  Ph: {profile.phone}
                </span>
              )}
              <span className="text-[9px] font-bold text-slate-500 uppercase">
                {role.toLowerCase()}
              </span>
            </div>
          </div>

          <div className="h-9 w-9 bg-slate-800 border border-slate-700 text-white rounded-full flex items-center justify-center text-sm font-extrabold shadow-sm">
            {profile?.name?.charAt(0) || 'U'}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 hover:border-red-900 rounded-xl text-xs font-bold text-slate-300 transition-colors duration-150 cursor-pointer"
            title="Sign Out"
          >
            <svg xmlns="http://www.w3.org/2500/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-grow p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
