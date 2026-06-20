// src/pages/attendant/AttendantDashboard.jsx
import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../utils/api';

const getOrderSteps = (order) => {
  const steps = [{ key: 'QUEUE', label: 'Queue' }];
  
  const hasWash = order.items.some(item => item.service.name.toLowerCase().includes('wash'));
  const hasDry = order.items.some(item => item.service.name.toLowerCase().includes('dry'));
  const hasIron = order.items.some(item => item.service.name.toLowerCase().includes('iron'));
  
  if (hasWash) {
    steps.push({ key: 'WASHING', label: 'Wash' });
  }
  if (hasDry) {
    steps.push({ key: 'DRYING', label: 'Dry' });
  }
  if (hasIron) {
    steps.push({ key: 'IRONING', label: 'Iron' });
  }
  
  steps.push({ key: 'READY TO COLLECT', label: 'Ready' });
  steps.push({ key: 'COLLECTED', label: 'Collect' });
  
  // Safety fallback: ensure current order status is present in stepper steps
  if (!steps.some(s => s.key === order.status)) {
    if (order.status === 'WASHING') {
      steps.splice(1, 0, { key: 'WASHING', label: 'Wash' });
    } else if (order.status === 'DRYING') {
      const washIdx = steps.findIndex(s => s.key === 'WASHING');
      steps.splice(washIdx !== -1 ? washIdx + 1 : 1, 0, { key: 'DRYING', label: 'Dry' });
    } else if (order.status === 'IRONING') {
      const dryIdx = steps.findIndex(s => s.key === 'DRYING');
      const washIdx = steps.findIndex(s => s.key === 'WASHING');
      steps.splice(dryIdx !== -1 ? dryIdx + 1 : (washIdx !== -1 ? washIdx + 1 : 1), 0, { key: 'IRONING', label: 'Iron' });
    }
  }
  
  return steps;
};

export default function AttendantDashboard() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'warning', message: '' }

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchedOrder, setSearchedOrder] = useState(null);

  // New Order Form States
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [inputStudentId, setInputStudentId] = useState('');
  const [searchedStudent, setSearchedStudent] = useState(null);
  const [hasSearchedStudent, setHasSearchedStudent] = useState(false);
  const [orderItems, setOrderItems] = useState([]); // [{ service_id, quantity, price, name, unit }]
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Cached lists for dropdowns
  const [students, setStudents] = useState([]);
  const [services, setServices] = useState([]);

  // Toast trigger
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Pre-seed caches if empty
  const initializeCaches = async () => {
    // 1. Students cache pre-seeding
    let cachedStudents = JSON.parse(localStorage.getItem('laundry_students_cache') || '{}');
    if (Object.keys(cachedStudents).length === 0) {
      // Seed with default student accounts created in create_dummy.py
      const defaultStudents = {};
      for (let i = 1; i <= 20; i++) {
        defaultStudents[i] = {
          id: i,
          user_id: i + 4, // dummy offset
          username: `student${i}`,
          roll_number: `AI22${String(i).padStart(3, '0')}`,
          name: `Student ${i}`,
          department: ['AI&DS', 'CSE', 'ECE', 'EEE', 'MECH'][i % 5],
          hostel_name: ['Boys Hostel A', 'Boys Hostel B', 'Girls Hostel A'][i % 3],
          balance: 1000.00
        };
      }
      localStorage.setItem('laundry_students_cache', JSON.stringify(defaultStudents));
      cachedStudents = defaultStudents;
    }
    setStudents(Object.values(cachedStudents));

    // 2. Fetch services from database API
    try {
      const dbServices = await api.get('/services');
      setServices(dbServices.filter(s => s.is_active));
      localStorage.setItem('laundry_services_cache', JSON.stringify(dbServices));
    } catch (err) {
      console.error('Failed to fetch services from DB, falling back to cache:', err);
      let cachedServices = JSON.parse(localStorage.getItem('laundry_services_cache') || '[]');
      if (cachedServices.length === 0) {
        cachedServices = [
          { id: 1, name: 'Wash', unit: 'kg', price: 60.00, is_active: true },
          { id: 2, name: 'Iron', unit: 'piece', price: 7.00, is_active: true },
          { id: 3, name: 'Dry', unit: 'kg', price: 70.00, is_active: true }
        ];
        localStorage.setItem('laundry_services_cache', JSON.stringify(cachedServices));
      }
      setServices(cachedServices.filter(s => s.is_active));
    }
  };

  // Fetch Active Orders (FIFO)
  const fetchActiveOrders = async () => {
    try {
      const data = await api.get('/attendant/orders/active');
      // Sort oldest-first (FIFO)
      const sorted = data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setActiveOrders(sorted);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load active orders.');
    }
  };

  // Fetch History (Paginated)
  const fetchHistoryOrders = async (page) => {
    try {
      const data = await api.get(`/attendant/orders/collected?page=${page}&limit=15`);
      setHistoryOrders(data);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load history ledger.');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await initializeCaches();
    await fetchActiveOrders();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectTab = async (tab) => {
    setActiveTab(tab);
    setRefreshing(true);
    await initializeCaches();
    if (tab === 'active') {
      await fetchActiveOrders();
    } else {
      await fetchHistoryOrders(historyPage);
    }
    setRefreshing(false);
  };

  const handlePageChange = async (newPage) => {
    if (newPage < 1) return;
    setHistoryPage(newPage);
    setRefreshing(true);
    await fetchHistoryOrders(newPage);
    setRefreshing(false);
  };

  // Patch Order Status
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/attendant/updateOrderStatus/${orderId}/status`, { status: newStatus });
      showToast('success', `Order #${orderId} updated to ${newStatus}`);
      
      // If order is collected, we remove it from active list and refresh tabs
      if (newStatus === 'COLLECTED') {
        if (activeTab === 'active') {
          fetchActiveOrders();
        } else {
          fetchHistoryOrders(historyPage);
        }
      } else {
        // Just reload active list
        fetchActiveOrders();
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to update status.');
    }
  };

  // Search Order by ID
  const handleSearchOrder = async (e) => {
    e.preventDefault();
    if (!searchOrderId.trim()) return;
    try {
      const data = await api.get(`/attendant/orders/${searchOrderId}`);
      setSearchedOrder(data);
      setIsSearchModalOpen(true);
    } catch (err) {
      console.error(err);
      showToast('error', `Order ID #${searchOrderId} not found.`);
    }
  };

  // Intake Create Order Modal Methods
  const openCreateModal = async () => {
    await initializeCaches();
    setSelectedStudentId('');
    setInputStudentId('');
    setSearchedStudent(null);
    setHasSearchedStudent(false);
    setOrderItems([]);
    setIsCreateModalOpen(true);
  };

  const handleStudentIdChange = (val) => {
    setInputStudentId(val);
    setSearchedStudent(null);
    setHasSearchedStudent(false);
    setSelectedStudentId('');
  };

  const handleStudentLookup = (e) => {
    if (e) e.preventDefault();
    setHasSearchedStudent(true);
    const idNum = Number(inputStudentId);
    if (!idNum) {
      setSearchedStudent(null);
      setSelectedStudentId('');
      return;
    }
    const student = students.find(s => s.id === idNum);
    if (student) {
      setSearchedStudent(student);
      setSelectedStudentId(String(student.id));
    } else {
      setSearchedStudent(null);
      setSelectedStudentId('');
    }
  };

  const addServiceItem = (serviceId) => {
    const service = services.find(s => s.id === Number(serviceId));
    if (!service) return;
    
    // Check if item is already added
    if (orderItems.some(i => i.service_id === service.id)) {
      showToast('warning', 'Service already added to this intake bag.');
      return;
    }

    setOrderItems([...orderItems, {
      service_id: service.id,
      quantity: 1,
      price: Number(service.price),
      name: service.name,
      unit: service.unit
    }]);
  };

  const updateItemQuantity = (index, value) => {
    const qty = parseFloat(value);
    const updated = [...orderItems];
    updated[index].quantity = isNaN(qty) ? 0 : qty;
    setOrderItems(updated);
  };

  const removeItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getSelectedStudent = () => {
    return students.find(s => s.id === Number(selectedStudentId));
  };

  const isWalletInsufficient = () => {
    const student = getSelectedStudent();
    if (!student) return false;
    return calculateTotal() > student.balance;
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const student = getSelectedStudent();
    if (!student) {
      showToast('error', 'Please select a student.');
      return;
    }

    if (orderItems.length === 0) {
      showToast('error', 'Please add at least one laundry item.');
      return;
    }

    const total = calculateTotal();
    if (total > student.balance) {
      showToast('error', `Insufficient wallet balance. Available: ₹${student.balance.toFixed(2)}, Required: ₹${total.toFixed(2)}`);
      return;
    }

    setSubmittingOrder(true);
    try {
      const payload = {
        student_id: student.id,
        items: orderItems.map(item => ({
          service_id: item.service_id,
          quantity: item.quantity
        }))
      };

      await api.post('/attendant/createOrders', payload);
      
      // Update balance in local cache
      const cached = JSON.parse(localStorage.getItem('laundry_students_cache') || '{}');
      if (cached[student.id]) {
        cached[student.id].balance -= total;
        localStorage.setItem('laundry_students_cache', JSON.stringify(cached));
      }

      showToast('success', 'Laundry intake order created successfully!');
      setIsCreateModalOpen(false);
      fetchActiveOrders();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to create order.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <DashboardLayout role="ATTENDANT" title="Laundry Attendant Workspace">
      {/* Toast Alert Box */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 p-4 rounded-xl border shadow-lg animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
          toast.type === 'error' ? 'bg-red-50 border-red-250 text-red-800' :
          'bg-amber-50 border-amber-250 text-amber-800'
        }`}>
          <span>
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : toast.type === 'error' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.071 19h13.858c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </span>
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      <div className="space-y-8 animate-fade-in">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 card-shadow">
          {/* Instant Search Bar */}
          <form onSubmit={handleSearchOrder} className="w-full md:w-96 flex gap-2">
            <input
              type="text"
              placeholder="Instant Lookup Order ID (e.g. 1)"
              value={searchOrderId}
              onChange={(e) => setSearchOrderId(e.target.value)}
              className="flex-grow px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
            >
              Lookup
            </button>
          </form>

          {/* New Order Button */}
          <button
            onClick={openCreateModal}
            className="w-full md:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Order Intake
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-white border border-slate-200 rounded-2xl card-shadow overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center bg-slate-50">
            <div className="flex gap-2">
              <button
                onClick={() => selectTab('active')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                In-Process Active ({activeOrders.length})
              </button>
              <button
                onClick={() => selectTab('history')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Collected History
              </button>
            </div>
            {refreshing && (
              <span className="text-[10px] font-bold text-slate-400 animate-pulse">Syncing...</span>
            )}
          </div>

          <div className="p-6">
            {/* TAB 1: ACTIVE ORDERS */}
            {activeTab === 'active' && (
              <div>
                {activeOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-sm font-semibold">No active orders currently processing.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white border border-slate-200 hover:border-slate-350 rounded-2xl p-5 card-shadow flex flex-col justify-between gap-4 animate-scale-up"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-mono font-bold text-slate-400">Order #{order.id}</span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(order.created_at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                            <h4 className="text-sm font-black text-slate-950">{order.student.name}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                              Roll: {order.student.roll_number} | Hostel: {order.student.hostel_name}
                            </p>
                          </div>

                          {/* Items */}
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs font-semibold text-slate-700">
                                <span>{item.service.name} x {item.quantity}</span>
                                <span>₹{item.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-bold text-slate-900">
                              <span>Total Amount</span>
                              <span>₹{order.total_amount.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Flow Status Stepper */}
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Operational Progress</span>
                            <span className="text-[9px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
                              {order.status === 'READY TO COLLECT' ? 'Ready' : order.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1">
                            {(() => {
                              const steps = getOrderSteps(order);
                              return steps.map((step, sIdx) => {
                                const isCurrent = order.status === step.key;
                                const currentIdx = steps.findIndex(s => s.key === order.status);
                                const isPast = currentIdx > sIdx;
                                
                                return (
                                  <div key={step.key} className="flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(order.id, step.key)}
                                      className={`px-1.5 py-1 text-[8px] font-black uppercase rounded-lg tracking-wider transition-all duration-150 cursor-pointer ${
                                        isCurrent
                                          ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-800 scale-105'
                                          : isPast
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600'
                                      }`}
                                      title={`Mark as ${step.label}`}
                                    >
                                      {step.label}
                                    </button>
                                    {sIdx < steps.length - 1 && (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-slate-300 mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                      </svg>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: COLLECTED HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {historyOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-sm font-semibold">No historical collected ledger to display.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                          <th className="pb-3 pl-2">ID</th>
                          <th className="pb-3">Student details</th>
                          <th className="pb-3">Hand-off Date</th>
                          <th className="pb-3">Items list</th>
                          <th className="pb-3">Total Amount</th>
                          <th className="pb-3 text-right pr-2">Attendant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyOrders.map((order) => (
                          <tr key={order.id} className="text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            <td className="py-4 pl-2 font-mono text-slate-900">#{order.id}</td>
                            <td className="py-4">
                              <div className="text-slate-900 font-bold">{order.student.name}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">{order.student.roll_number}</div>
                            </td>
                            <td className="py-4 text-xs text-slate-500 font-bold">
                              {new Date(order.created_at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-4">
                              <div className="text-xs space-y-0.5">
                                {order.items.map((item, idx) => (
                                  <div key={idx}>
                                    <span className="font-bold text-slate-800">{item.service.name}</span>
                                    <span className="text-slate-400 mx-1">x</span>
                                    <span>{item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 text-slate-900 font-bold">₹{order.total_amount.toFixed(2)}</td>
                            <td className="py-4 text-right pr-2 text-xs font-bold text-slate-500">
                              {order.attendant_name || 'System Staff'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="border-t border-slate-150 pt-4 flex justify-between items-center">
                  <button
                    onClick={() => handlePageChange(historyPage - 1)}
                    disabled={historyPage === 1}
                    className="px-4 py-2 border border-slate-350 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Page {historyPage}
                  </span>
                  <button
                    onClick={() => handlePageChange(historyPage + 1)}
                    disabled={historyOrders.length < 15}
                    className="px-4 py-2 border border-slate-350 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL A: INTAKE CREATE ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-base font-black text-slate-950 tracking-tight">New Laundry Intake</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Create Transaction Receipt</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center font-bold text-slate-500 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
              
              {/* Select Student */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Student ID (Number)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 1"
                      value={inputStudentId}
                      onChange={(e) => handleStudentIdChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleStudentLookup();
                        }
                      }}
                      className="flex-grow px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleStudentLookup}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {/* Show Selected Student info */}
                {hasSearchedStudent && (
                  (() => {
                    if (searchedStudent) {
                      return (
                        <div className="p-3 border border-slate-150 bg-slate-50/50 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                              {searchedStudent.name} ({searchedStudent.roll_number})
                            </span>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase leading-none">
                              Hostel: {searchedStudent.hostel_name}
                            </span>
                            <strong className="text-sm font-black text-slate-900 block mt-1.5">
                              Available: ₹{searchedStudent.balance?.toFixed(2) || '0.00'}
                            </strong>
                          </div>
                          <span className="p-2 bg-slate-100 rounded-xl text-slate-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-3 border border-red-200 bg-red-50 text-red-750 rounded-xl text-[10px] font-bold flex items-center gap-1.5 self-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-red-650" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.071 19h13.858c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Student ID not found in roster</span>
                        </div>
                      );
                    }
                  })()
                )}
              </div>

              {/* Add Services Section */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Select Laundry Service
                </label>
                <div className="flex gap-2">
                  <select
                    id="serviceSelect"
                    className="flex-grow px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (₹{s.price}/{s.unit})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const select = document.getElementById('serviceSelect');
                      if (select) addServiceItem(select.value);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    Add Service
                  </button>
                </div>
              </div>

              {/* Selected Services List */}
              <div className="space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Intake Items ({orderItems.length})
                </span>
                
                {orderItems.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-semibold">
                    No services added yet. Select a service above to add.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto p-1.5">
                    {orderItems.map((item, idx) => (
                      <div key={item.service_id} className="flex justify-between items-center gap-4 p-3 border border-slate-150 rounded-xl bg-white animate-scale-up">
                        <div className="flex-grow">
                          <span className="text-xs font-bold text-slate-900">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            ₹{item.price.toFixed(2)} / {item.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step={item.unit === 'kg' ? '0.1' : '1'}
                            min="0.1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(idx, e.target.value)}
                            required
                            className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-center bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                          <span className="text-xs font-bold text-slate-500 uppercase w-8">{item.unit}</span>
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-red-500 hover:bg-red-50 h-7 w-7 rounded-full flex items-center justify-center font-bold transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Totals & Submit Buttons Section */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                {/* Warnings and Totals */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  {/* Wallet Balance warning indicator */}
                  <div className="w-full sm:w-auto">
                    {isWalletInsufficient() && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold p-3 rounded-xl flex items-center gap-1.5 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-red-650" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.071 19h13.858c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Wallet Insufficient (Short by ₹{(calculateTotal() - (getSelectedStudent()?.balance || 0)).toFixed(2)})</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right w-full sm:w-auto shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Intake Cost</span>
                    <strong className="text-2xl font-black text-slate-950">
                      ₹{calculateTotal().toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOrder || isWalletInsufficient() || orderItems.length === 0 || !getSelectedStudent()}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {submittingOrder ? 'Saving Order...' : 'Submit Order'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL B: SEARCH TRANSACTION SUMMARY MODAL */}
      {isSearchModalOpen && searchedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-base font-black text-slate-950 tracking-tight">Order Details Summary</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Lookup ID #{searchedOrder.id}</p>
              </div>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center font-bold text-slate-500 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Student and Attendant details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Student Profile</span>
                  <strong className="text-xs font-bold text-slate-900 block">{searchedOrder.student.name}</strong>
                  <p className="text-[10px] font-semibold text-slate-500 truncate">Roll: {searchedOrder.student.roll_number}</p>
                  <p className="text-[10px] font-semibold text-slate-500 truncate">Hostel: {searchedOrder.student.hostel_name}</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Registered By</span>
                    <strong className="text-xs font-bold text-slate-900 block">{searchedOrder.attendant_name || 'System Staff'}</strong>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">
                    Date: {new Date(searchedOrder.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Order Receipts List</span>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {searchedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 text-xs font-semibold text-slate-700 bg-white">
                      <div>
                        <span className="font-bold text-slate-800">{item.service.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold block">₹{item.unit_price.toFixed(2)}/unit</span>
                      </div>
                      <div className="text-right">
                        <div>Qty: {item.quantity}</div>
                        <strong className="text-slate-900">₹{item.subtotal.toFixed(2)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Details */}
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status State</span>
                  <span className={`inline-block mt-1 px-2.5 py-1 text-[9px] font-bold uppercase rounded border ${
                    searchedOrder.status === 'READY TO COLLECT' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 animate-pulse' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    {searchedOrder.status}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                  <strong className="text-xl font-black text-slate-900">₹{searchedOrder.total_amount.toFixed(2)}</strong>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase cursor-pointer transition-colors shadow-sm"
                >
                  Close Summary
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
