// src/pages/student/StudentDashboard.jsx
import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../utils/api';

export default function StudentDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'all'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setError('');
      const data = await api.get('/student/dashboard');
      setDashboardData(data);
      
      // Cache student balance in shared localStorage cache for Attendant access
      if (data.profile) {
        const cached = JSON.parse(localStorage.getItem('laundry_students_cache') || '{}');
        cached[data.profile.id] = data.profile;
        localStorage.setItem('laundry_students_cache', JSON.stringify(cached));
      }
    } catch (err) {
      setError('Failed to fetch dashboard data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Refresh handler for All Orders endpoint
  const handleRefreshOrders = async () => {
    if (!dashboardData) return;
    setRefreshing(true);
    try {
      const orders = await api.get('/student/orders');
      setDashboardData(prev => ({
        ...prev,
        all_orders: orders
      }));
    } catch (err) {
      console.error('Failed to refresh orders:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // When tab is changed, trigger individual endpoints to refresh
  const selectTab = (tab) => {
    setActiveTab(tab);
    handleRefreshOrders();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'QUEUE':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'WASHING':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'DRYING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'IRONING':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'READY TO COLLECT':
        return 'bg-emerald-100 text-emerald-850 border-emerald-300 animate-pulse';
      case 'COLLECTED':
        return 'bg-slate-200 text-slate-600 border-slate-350';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="STUDENT" title="Student Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  const { profile, all_orders } = dashboardData || {};

  return (
    <DashboardLayout role="STUDENT" title="Student Personal Dashboard">
      <div className="space-y-8 animate-fade-in">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-2xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-650" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main workspace (Left 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Active Orders Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 card-shadow flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Orders</span>
                    <span className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </span>
                  </div>
                  <h4 className="text-3xl font-black mt-2 text-slate-900">
                    {all_orders?.filter(o => o.status !== 'COLLECTED').length || 0}
                  </h4>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-400">
                  Orders currently processing in the laundry room.
                </div>
              </div>

              {/* Completed Orders Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 card-shadow flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Completed Bags</span>
                    <span className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </span>
                  </div>
                  <h4 className="text-3xl font-black mt-2 text-slate-900">
                    {all_orders?.filter(o => o.status === 'COLLECTED').length || 0}
                  </h4>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] font-semibold text-slate-400">
                  Laundry bags successfully processed and collected.
                </div>
              </div>
            </div>

            {/* Dashboard Tabs & Controls */}
            <div className="bg-white border border-slate-200 rounded-2xl card-shadow overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                <div className="flex gap-2">
                  <button
                    onClick={() => selectTab('active')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
                      activeTab === 'active'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Current Orders ({all_orders?.filter(o => o.status !== 'COLLECTED').length || 0})
                  </button>
                  <button
                    onClick={() => selectTab('all')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    All Orders ({all_orders?.length || 0})
                  </button>
                </div>

                <button
                  onClick={handleRefreshOrders}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-all duration-150 shadow-sm hover:shadow disabled:opacity-50 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  <span>{refreshing ? 'Syncing...' : 'Pull Fresh Updates'}</span>
                </button>
              </div>

              <div className="p-6">
                {/* TAB 1: CURRENT (ACTIVE) ORDERS */}
                {activeTab === 'active' && (
                  <div className="space-y-4">
                    {!all_orders || all_orders.filter(o => o.status !== 'COLLECTED').length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <p className="text-sm font-semibold">No active laundry orders found.</p>
                        <p className="text-xs text-slate-400 mt-1">Visit the attendant desk to register your intake.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                              <th className="pb-3 pl-2">Order ID</th>
                              <th className="pb-3">Date & Time</th>
                              <th className="pb-3">Items & Quantity</th>
                              <th className="pb-3">Total Amount</th>
                              <th className="pb-3 text-right pr-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {all_orders.filter(o => o.status !== 'COLLECTED').map((order) => (
                              <tr key={order.id} className="text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                <td className="py-4 pl-2 font-mono text-slate-900">#{order.id}</td>
                                <td className="py-4 text-xs font-bold text-slate-500">
                                  {new Date(order.created_at).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="py-4">
                                  <div className="space-y-0.5">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="text-xs">
                                        <span className="text-slate-800 font-bold">{item.service.name}</span>
                                        <span className="text-slate-400 mx-1">x</span>
                                        <span className="text-slate-700 font-bold">{item.quantity}</span>
                                        <span className="text-[10px] text-slate-400 ml-1">
                                          (@ ₹{item.unit_price}/unit)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-4 text-slate-900 font-bold">₹{order.total_amount.toFixed(2)}</td>
                                <td className="py-4 text-right pr-2">
                                  <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${getStatusBadge(order.status)}`}>
                                    {order.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: ALL ORDERS VIEW */}
                {activeTab === 'all' && (
                  <div className="space-y-4">
                    {!all_orders || all_orders.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <p className="text-sm font-semibold">No laundry orders found.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                              <th className="pb-3 pl-2">Order ID</th>
                              <th className="pb-3">Date & Time</th>
                              <th className="pb-3">Items & Quantity</th>
                              <th className="pb-3">Total Amount</th>
                              <th className="pb-3 text-right pr-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {all_orders.map((order) => (
                              <tr key={order.id} className="text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                <td className="py-4 pl-2 font-mono text-slate-900">#{order.id}</td>
                                <td className="py-4 text-xs font-bold text-slate-500">
                                  {new Date(order.created_at).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="py-4">
                                  <div className="space-y-0.5">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="text-xs">
                                        <span className="text-slate-800 font-bold">{item.service.name}</span>
                                        <span className="text-slate-400 mx-1">x</span>
                                        <span className="text-slate-700 font-bold">{item.quantity}</span>
                                        <span className="text-[10px] text-slate-400 ml-1">
                                          (@ ₹{item.unit_price}/unit)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-4 text-slate-900 font-bold">₹{order.total_amount.toFixed(2)}</td>
                                <td className="py-4 text-right pr-2">
                                  <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${getStatusBadge(order.status)}`}>
                                    {order.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar Area (Right 1 column) */}
          <div className="space-y-6">
            
            {/* Wallet Balance Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 card-shadow flex flex-col justify-between h-44 shadow-md">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Balance</span>
                  <span className="p-2 bg-slate-800 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </span>
                </div>
                <h4 className="text-3xl font-black mt-2 text-white">
                  ₹{profile?.balance?.toFixed(2) || '0.00'}
                </h4>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-semibold text-slate-400">
                  To top up, visit the admin desk.
                </span>
                {profile?.balance < 150 && (
                  <span className="text-[10px] font-bold text-amber-400 animate-pulse">Low Balance</span>
                )}
              </div>
            </div>

            {/* Student Profile details card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 card-shadow space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Student Profile</h3>
                <span className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              </div>
              <div className="space-y-4 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Full Name</span>
                  <span className="font-bold text-slate-900 block bg-slate-50 px-3 py-2 border border-slate-100 rounded-xl">{profile?.name}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Roll Number</span>
                  <span className="font-mono font-bold text-slate-900 block bg-slate-50 px-3 py-2 border border-slate-100 rounded-xl">{profile?.roll_number}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Branch/Dept</span>
                    <span className="font-bold text-slate-900 block bg-slate-50 px-3 py-2 border border-slate-100 rounded-xl">{profile?.department}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Hostel Block</span>
                    <span className="font-bold text-slate-900 block bg-slate-50 px-3 py-2 border border-slate-100 rounded-xl truncate">{profile?.hostel_name}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">System Username</span>
                  <span className="font-mono font-bold text-slate-650 block bg-slate-50 px-3 py-2 border border-slate-100 rounded-xl">{profile?.username}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
