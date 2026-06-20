// src/pages/RootPortal.jsx
import { useNavigate } from 'react-router-dom';
import mitLogo from '../assets/mit_logo.png';
import annaUnivLogo from '../assets/anna.png';

export default function RootPortal() {
  const navigate = useNavigate();

  const portals = [
    {
      role: 'Student Portal',
      description: 'Check wallet balance, monitor live laundry status, and view your transaction history.',
      path: '/login/student',
      bgColor: 'border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50',
      iconColor: 'text-slate-900',
      btnColor: 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-700',
      iconSvg: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      )
    },
    {
      role: 'Laundry Attendant',
      description: 'Register student intake, update processing status (Washing, Drying, Ironing), and manage drop-offs.',
      path: '/login/attendant',
      bgColor: 'border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50',
      iconColor: 'text-slate-900',
      btnColor: 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-700',
      iconSvg: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
    {
      role: 'System Administrator',
      description: 'Oversee metrics, top up student balances, manage active service catalog, and onboard laundry staff.',
      path: '/login/admin',
      bgColor: 'border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50',
      iconColor: 'text-slate-900',
      btnColor: 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-700',
      iconSvg: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 card-shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <img src={annaUnivLogo} alt="Anna University" className="h-12 w-auto object-contain" />
            <img src={mitLogo} alt="MIT Logo" className="h-12 w-auto object-contain" />
            <div className="border-l border-slate-200 pl-4">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">MIT Anna University</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Madras Institute of Technology</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12 items-center justify-center animate-fade-in">
        
        {/* Welcome and Guidelines Panel */}
        <div className="w-full lg:w-1/2 space-y-6">
          <div className="space-y-2">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Campus Services</span>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
              Campus Laundry Hub
            </h2>
            <p className="text-lg text-slate-600">
              A centralized, automated laundry management platform for students and laundry attendants at the MIT Anna University Campus.
            </p>
          </div>

          {/* Guidelines Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 card-shadow space-y-4">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              System Guidelines & Hours
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Operational Hours</span>
                <p className="text-sm font-semibold text-slate-700 mt-1">On working days</p>
                <p className="text-xs text-slate-500">10:30 AM – 05:30 PM</p>
                <p className="text-sm font-semibold text-slate-700 mt-2">Tuesday</p>
                <p className="text-xs text-slate-500">Closed (Weekly Holiday)</p>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Intake Requirements</span>
                <ul className="text-xs text-slate-600 mt-1.5 list-disc list-inside space-y-1">
                  <li>Minimum transaction: 1 unit.</li>
                  <li>Verify student balance before dropping off laundry.</li>
                  <li>Ensure all pockets are checked and empty.</li>
                  <li>Receipt history is updated in real time.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Portals Gateway Cards Grid */}
        <div className="w-full lg:w-1/2 grid grid-cols-1 gap-6">
          {portals.map((portal) => (
            <div
              key={portal.role}
              onClick={() => navigate(portal.path)}
              className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200 cursor-pointer card-shadow-hover ${portal.bgColor}`}
            >
              <div className={`p-3.5 rounded-xl bg-slate-100 border border-slate-200 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-200 ${portal.iconColor}`}>
                {portal.iconSvg}
              </div>
              <div className="flex-grow space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-900 group-hover:text-slate-900 transition-colors duration-200">
                    {portal.role}
                  </h4>
                  <span className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1.5 transition-all duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {portal.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-2">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs font-semibold text-slate-400">
          <p>© {new Date().getFullYear()} Madras Institute of Technology - Anna University. All Rights Reserved.</p>
          <p className="mt-1 text-slate-300">Managed by MIT Department of Student Affairs</p>
        </div>
      </footer>

    </div>
  );
}