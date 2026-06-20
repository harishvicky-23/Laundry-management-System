// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../utils/api';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'students', 'services', 'attendants'
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Student Section States ---
  const [studentsList, setStudentsList] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null); // For Top-up/Detail Drawer
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentModalMode, setStudentModalMode] = useState('create'); // 'create' or 'edit'
  const [studentForm, setStudentForm] = useState({
    username: '',
    password: '',
    roll_number: '',
    name: '',
    department: 'CSE',
    hostel_name: 'Boys Hostel A',
    balance: 0
  });
  const [topUpAmount, setTopUpAmount] = useState('');

  // --- Service Section States ---
  const [servicesList, setServicesList] = useState([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceModalMode, setServiceModalMode] = useState('create');
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    unit: 'kg',
    price: ''
  });

  // --- Attendant Section States ---
  const [attendantsList, setAttendantsList] = useState([]);
  const [isAttendantModalOpen, setIsAttendantModalOpen] = useState(false);
  const [attendantModalMode, setAttendantModalMode] = useState('create');
  const [selectedAttendantId, setSelectedAttendantId] = useState(null);
  const [attendantForm, setAttendantForm] = useState({
    username: '',
    password: '',
    name: '',
    phone: ''
  });

  // --- Confirmation Modals States ---
  const [isConfirmOffboardOpen, setIsConfirmOffboardOpen] = useState(false);
  const [attendantToOffboard, setAttendantToOffboard] = useState(null);

  const [isConfirmDeleteStudentOpen, setIsConfirmDeleteStudentOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  const [isConfirmDeactivateServiceOpen, setIsConfirmDeactivateServiceOpen] = useState(false);
  const [serviceToDeactivate, setServiceToDeactivate] = useState(null);

  // Debouncing for search input
  const searchTimeoutRef = useRef(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // --- Initialize Services Cache ---
  const loadServices = async () => {
    try {
      const data = await api.get('/services');
      setServicesList(data);
      localStorage.setItem('laundry_services_cache', JSON.stringify(data));
    } catch (err) {
      console.error('Failed to load services from server:', err);
      let cachedServices = JSON.parse(localStorage.getItem('laundry_services_cache') || '[]');
      if (cachedServices.length === 0) {
        cachedServices = [
          { id: 1, name: 'Wash', unit: 'kg', price: 60.00, is_active: true },
          { id: 2, name: 'Iron', unit: 'piece', price: 7.00, is_active: true },
          { id: 3, name: 'Dry', unit: 'kg', price: 70.00, is_active: true }
        ];
        localStorage.setItem('laundry_services_cache', JSON.stringify(cachedServices));
      }
      setServicesList(cachedServices);
    }
  };

  // --- Section A: Fetch Summary Metrics ---
  const fetchSummaryMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const data = await api.get('/dashboard/summary');
      setMetrics(data);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to fetch business summary metrics.');
    } finally {
      setLoadingMetrics(false);
    }
  };

  // --- Section B: Fetch Student Directory ---
  const fetchStudents = async (query = '', page = 1) => {
    setLoadingStudents(true);
    try {
      const data = await api.get(`/admin/students?search=${query}&page=${page}&limit=10`);
      setStudentsList(data);

      // Keep shared cache updated with student records
      const cached = JSON.parse(localStorage.getItem('laundry_students_cache') || '{}');
      data.forEach(student => {
        cached[student.id] = student;
      });
      localStorage.setItem('laundry_students_cache', JSON.stringify(cached));
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to fetch student directory.');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Debounced search trigger
  const handleStudentSearchChange = (val) => {
    setStudentSearch(val);
    setStudentPage(1);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchStudents(val, 1);
    }, 450);
  };

  // Top-Up Wallet
  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    const amt = parseFloat(topUpAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('error', 'Top-up amount must be greater than zero.');
      return;
    }

    try {
      const updatedStudent = await api.post(`/admin/students/${selectedStudent.id}/topup`, { amount: amt });
      showToast('success', `Topped up ${updatedStudent.name} successfully! New Balance: ₹${updatedStudent.balance.toFixed(2)}`);
      
      // Update local state and cache
      setSelectedStudent(updatedStudent);
      setStudentsList(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      setTopUpAmount('');

      const cached = JSON.parse(localStorage.getItem('laundry_students_cache') || '{}');
      cached[updatedStudent.id] = updatedStudent;
      localStorage.setItem('laundry_students_cache', JSON.stringify(cached));
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Top-up transaction failed.');
    }
  };

  // Student CRUD Submit
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (studentModalMode === 'create') {
        const payload = { ...studentForm, balance: parseFloat(studentForm.balance) };
        const newStudent = await api.post('/admin/createStudents', payload);
        showToast('success', `Student account ${newStudent.name} created!`);
        
        // Fix: Reset search filter and page to page 1 to immediately see the new student in the refreshed list
        setStudentSearch('');
        setStudentPage(1);
        await fetchStudents('', 1);
      } else {
        const payload = {
          roll_number: studentForm.roll_number,
          name: studentForm.name,
          department: studentForm.department,
          hostel_name: studentForm.hostel_name,
          balance: parseFloat(studentForm.balance)
        };
        const updatedStudent = await api.patch(`/admin/updateStudents/${selectedStudent.id}`, payload);
        showToast('success', `Student profile ${updatedStudent.name} updated!`);
        await fetchStudents(studentSearch, studentPage);
        if (selectedStudent?.id === updatedStudent.id) {
          setSelectedStudent(updatedStudent);
        }
      }
      setIsStudentModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Operation failed.');
    }
  };

  const deleteStudent = async (studentId) => {
    try {
      await api.delete(`/admin/students/${studentId}`);
      showToast('success', 'Student account deleted successfully.');
      setSelectedStudent(null);
      fetchStudents(studentSearch, studentPage);

      const cached = JSON.parse(localStorage.getItem('laundry_students_cache') || '{}');
      delete cached[studentId];
      localStorage.setItem('laundry_students_cache', JSON.stringify(cached));
    } catch (err) {
      console.error(err);
      let errMsg = err.message || 'Deletion failed';
      // Fix: appropriate error message when student has orders and DB block deletion due to foreign key
      if (
        errMsg.toLowerCase().includes('foreign key') || 
        errMsg.toLowerCase().includes('integrity') || 
        errMsg.toLowerCase().includes('500') ||
        errMsg.toLowerCase().includes('fetch')
      ) {
        errMsg = 'Cannot delete student because they have existing laundry orders. Please delete or archive their orders first.';
      }
      showToast('error', errMsg);
    }
  };

  // --- Section C: Service Catalog CRUD ---
  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      const priceVal = parseFloat(serviceForm.price);
      if (isNaN(priceVal) || priceVal < 0) {
        showToast('error', 'Price must be a positive number.');
        return;
      }

      if (serviceModalMode === 'create') {
        const newService = await api.post('/services', {
          name: serviceForm.name,
          unit: serviceForm.unit,
          price: priceVal
        });
        showToast('success', `Service "${newService.name}" created successfully!`);
      } else {
        await api.patch(`/services/${selectedServiceId}`, {
          name: serviceForm.name,
          unit: serviceForm.unit,
          price: priceVal
        });
        showToast('success', `Service updated successfully!`);
      }

      await loadServices();
      setIsServiceModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Operation failed.');
    }
  };

  const deactivateService = async (serviceId) => {
    try {
      await api.delete(`/services/${serviceId}`);
      showToast('success', 'Service deactivated successfully.');
      await loadServices();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to deactivate service.');
    }
  };

  // --- Section D: Fetch Attendant Roster ---
  const fetchAttendants = async () => {
    try {
      const data = await api.get('/admin/attendants');
      setAttendantsList(data);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to fetch employee roster.');
    }
  };

  const handleAttendantSubmit = async (e) => {
    e.preventDefault();
    try {
      if (attendantModalMode === 'create') {
        const newAttendant = await api.post('/admin/createAttendants', attendantForm);
        showToast('success', `Attendant ${newAttendant.name} registered!`);
      } else {
        const payload = {
          name: attendantForm.name,
          phone: attendantForm.phone
        };
        const updated = await api.patch(`/admin/attendants/${selectedAttendantId}`, payload);
        showToast('success', `Attendant details ${updated.name} updated!`);
      }
      setIsAttendantModalOpen(false);
      fetchAttendants();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Operation failed.');
    }
  };

  const deleteAttendant = async (attendantId) => {
    try {
      await api.delete(`/admin/attendants/${attendantId}`);
      showToast('success', 'Attendant account deleted successfully.');
      fetchAttendants();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete attendant.');
    }
  };

  // --- Tab Selection triggers ---
  const selectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'metrics') {
      fetchSummaryMetrics();
    } else if (tab === 'students') {
      fetchStudents(studentSearch, studentPage);
    } else if (tab === 'services') {
      loadServices();
    } else if (tab === 'attendants') {
      fetchAttendants();
    }
  };

  useEffect(() => {
    fetchSummaryMetrics();
    loadServices();
  }, []);

  return (
    <DashboardLayout role="ADMIN" title="System Administrator Command Hub">
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
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </span>
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Admin Tab Controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
        <button
          onClick={() => selectTab('metrics')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
            activeTab === 'metrics' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-550 hover:bg-slate-250 bg-slate-100'
          }`}
        >
          Operations Summary
        </button>
        <button
          onClick={() => selectTab('students')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
            activeTab === 'students' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-550 hover:bg-slate-250 bg-slate-100'
          }`}
        >
          Student Directory
        </button>
        <button
          onClick={() => selectTab('services')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
            activeTab === 'services' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-550 hover:bg-slate-250 bg-slate-100'
          }`}
        >
          Service Catalog
        </button>
        <button
          onClick={() => selectTab('attendants')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer ${
            activeTab === 'attendants' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-550 hover:bg-slate-250 bg-slate-100'
          }`}
        >
          Attendants Roster
        </button>
      </div>

      <div className="animate-fade-in">
        
        {/* ========================================================
            SECTION A: OPERATIONS SUMMARY
           ======================================================== */}
        {activeTab === 'metrics' && (
          <div className="space-y-8">
            {loadingMetrics ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="bg-white border border-slate-200 p-6 rounded-2xl card-shadow flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Today's Orders</span>
                    <strong className="text-3xl font-black text-slate-900">{metrics?.today_orders ?? 0}</strong>
                  </div>
                  <span className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </span>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl card-shadow flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">In Process</span>
                    <strong className="text-3xl font-black text-slate-900">{metrics?.in_process ?? 0}</strong>
                  </div>
                  <span className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </span>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl card-shadow flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Ready Bags</span>
                    <strong className="text-3xl font-black text-slate-900">{metrics?.ready ?? 0}</strong>
                  </div>
                  <span className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </span>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl card-shadow flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Collected Today</span>
                    <strong className="text-3xl font-black text-slate-900">{metrics?.COLLECTED_today ?? 0}</strong>
                  </div>
                  <span className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ========================================================
            SECTION B: STUDENT DIRECTORY & TOP-UP CENTER
           ======================================================== */}
        {activeTab === 'students' && (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Student Grid list */}
            <div className="flex-grow w-full bg-white border border-slate-200 rounded-2xl card-shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <input
                  type="text"
                  placeholder="Search name or roll number..."
                  value={studentSearch}
                  onChange={(e) => handleStudentSearchChange(e.target.value)}
                  className="w-full sm:w-72 px-3 py-2 border border-slate-250 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                
                <button
                  onClick={() => {
                    setStudentForm({
                      username: '', password: '', roll_number: '', name: '', department: 'CSE', hostel_name: 'Boys Hostel A', balance: 0
                    });
                    setStudentModalMode('create');
                    setIsStudentModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Add Student
                </button>
              </div>

              <div className="p-6">
                {loadingStudents ? (
                  <div className="flex justify-center items-center h-48">
                    <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : studentsList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                    No student profile matches found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                          <th className="pb-3 pl-2">Name</th>
                          <th className="pb-3">Roll Number</th>
                          <th className="pb-3">Branch & Hostel</th>
                          <th className="pb-3">Balance</th>
                          <th className="pb-3 text-right pr-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentsList.map(student => (
                          <tr
                            key={student.id}
                            className={`text-sm font-semibold text-slate-700 hover:bg-slate-50 ${
                              selectedStudent?.id === student.id ? 'bg-slate-100/70' : ''
                            }`}
                          >
                            <td className="py-4 pl-2 font-bold text-slate-950">{student.name}</td>
                            <td className="py-4 font-mono">{student.roll_number}</td>
                            <td className="py-4 text-xs font-bold text-slate-500">
                              <div>Branch: {student.department || 'N/A'}</div>
                              <div>Hostel: {student.hostel_name || 'N/A'}</div>
                            </td>
                            <td className="py-4 text-slate-900 font-bold">₹{student.balance.toFixed(2)}</td>
                            <td className="py-4 text-right pr-2">
                              <div className="flex justify-end gap-2">
                                {/* Fix: topup button instead of click-based row loading */}
                                <button
                                  onClick={() => setSelectedStudent(student)}
                                  className="px-2.5 py-1 text-[10px] font-bold border border-slate-350 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                >
                                  Top-Up
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setStudentForm({
                                      roll_number: student.roll_number,
                                      name: student.name,
                                      department: student.department || 'CSE',
                                      hostel_name: student.hostel_name || 'Boys Hostel A',
                                      balance: student.balance,
                                      username: student.username,
                                      password: ''
                                    });
                                    setStudentModalMode('edit');
                                    setIsStudentModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-bold border border-slate-350 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setStudentToDelete(student);
                                    setIsConfirmDeleteStudentOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-bold border border-red-200 hover:bg-red-900 hover:text-white rounded-lg text-red-500 transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                <div className="border-t border-slate-150 pt-4 mt-4 flex justify-between items-center">
                  <button
                    onClick={() => {
                      if (studentPage > 1) {
                        setStudentPage(studentPage - 1);
                        fetchStudents(studentSearch, studentPage - 1);
                      }
                    }}
                    disabled={studentPage === 1}
                    className="px-4 py-2 border border-slate-350 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-slate-500 uppercase">Page {studentPage}</span>
                  <button
                    onClick={() => {
                      if (studentsList.length === 10) {
                        setStudentPage(studentPage + 1);
                        fetchStudents(studentSearch, studentPage + 1);
                      }
                    }}
                    disabled={studentsList.length < 10}
                    className="px-4 py-2 border border-slate-350 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Financial slide-out Drawer or detail panel */}
            {selectedStudent && (
              <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-2xl p-5 card-shadow shrink-0 space-y-6 animate-scale-up sticky top-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 truncate">{selectedStudent.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Roll #{selectedStudent.roll_number}</span>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-slate-400 hover:text-slate-800 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Funds</span>
                    <strong className="text-2xl font-black text-slate-900 block mt-1">₹{selectedStudent.balance.toFixed(2)}</strong>
                  </div>

                  {/* Top Up Form */}
                  <form onSubmit={handleTopUp} className="space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Amount to Add (₹)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 500"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        required
                        className="flex-grow px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                      >
                        Topup
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================
            SECTION C: SERVICE CATALOG & CONTROLS
           ======================================================== */}
        {activeTab === 'services' && (
          <div className="bg-white border border-slate-200 rounded-2xl card-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-950">Active Catalog Items</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Laundry Services Pricing</p>
              </div>

              <button
                onClick={() => {
                  setServiceForm({ name: '', unit: 'kg', price: '' });
                  setServiceModalMode('create');
                  setIsServiceModalOpen(true);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
              >
                Create Service
              </button>
            </div>

            <div className="p-6">
              {servicesList.filter(s => s.is_active).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No services configured in catalog.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {servicesList.filter(s => s.is_active).map(service => (
                    <div
                      key={service.id}
                      className={`bg-white border rounded-2xl p-5 card-shadow flex flex-col justify-between gap-4 transition-all duration-155 ${
                        service.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60 bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-black text-slate-900">{service.name}</h4>
                          <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded ${
                            service.is_active ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-slate-150 text-slate-500 border border-slate-200'
                          }`}>
                            {service.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                          ₹{Number(service.price).toFixed(2)}
                          <span className="text-xs font-bold text-slate-400 normal-case ml-1">per {service.unit}</span>
                        </p>
                      </div>

                      {service.is_active && (
                        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedServiceId(service.id);
                              setServiceForm({
                                name: service.name,
                                unit: service.unit,
                                price: String(service.price)
                              });
                              setServiceModalMode('edit');
                              setIsServiceModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold border border-slate-350 hover:bg-slate-900 hover:text-white rounded-lg transition-colors cursor-pointer"
                          >
                            Modify
                          </button>
                          <button
                            onClick={() => {
                              setServiceToDeactivate(service);
                              setIsConfirmDeactivateServiceOpen(true);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold border border-red-200 hover:bg-red-900 hover:text-white rounded-lg text-red-500 transition-colors cursor-pointer"
                          >
                            Deactivate
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            SECTION D: ATTENDANT STAFF ROSTER
           ======================================================== */}
        {activeTab === 'attendants' && (
          <div className="bg-white border border-slate-200 rounded-2xl card-shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-950">Employee Roster</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Laundry Attendants</p>
              </div>

              <button
                onClick={() => {
                  setAttendantForm({ username: '', password: '', name: '', phone: '' });
                  setAttendantModalMode('create');
                  setIsAttendantModalOpen(true);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
              >
                Onboard Staff
              </button>
            </div>

            <div className="p-6">
              {attendantsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No attendants currently registered.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                        <th className="pb-3 pl-2">Name</th>
                        <th className="pb-3">Username</th>
                        <th className="pb-3">Phone Line</th>
                        <th className="pb-3 text-right pr-2">Roster Management</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendantsList.map(attendant => (
                        <tr key={attendant.id} className="text-sm font-semibold text-slate-700 hover:bg-slate-50">
                          <td className="py-4 pl-2 font-bold text-slate-950">{attendant.name}</td>
                          <td className="py-4 font-mono">{attendant.username}</td>
                          <td className="py-4 text-xs font-bold text-slate-500">{attendant.phone || 'No phone registered'}</td>
                          <td className="py-4 text-right pr-2">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedAttendantId(attendant.id);
                                  setAttendantForm({
                                    username: attendant.username,
                                    password: '',
                                    name: attendant.name,
                                    phone: attendant.phone || ''
                                  });
                                  setAttendantModalMode('edit');
                                  setIsAttendantModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold border border-slate-350 hover:bg-slate-900 hover:text-white rounded-lg transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                              {/* Fix: on click offboard a attendant no alert, use a dialogue box to confirm */}
                              <button
                                onClick={() => {
                                  setAttendantToOffboard(attendant);
                                  setIsConfirmOffboardOpen(true);
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold border border-red-200 hover:bg-red-900 hover:text-white rounded-lg text-red-500 transition-colors cursor-pointer"
                              >
                                Offboard
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* --- STUDENT MODALS (CREATE/EDIT) --- */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-base font-black text-slate-955 tracking-tight">
                  {studentModalMode === 'create' ? 'Create Student Account' : 'Modify Student Profile'}
                </h3>
              </div>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleStudentSubmit} className="p-6 space-y-4">
              {studentModalMode === 'create' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Username</label>
                    <input
                      type="text"
                      required
                      value={studentForm.username}
                      onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                      className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                    <input
                      type="password"
                      required
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                      className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                  <input
                    type="text"
                    required
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={studentForm.roll_number}
                    onChange={(e) => setStudentForm({ ...studentForm, roll_number: e.target.value })}
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Branch/Dept</label>
                  <select
                    value={studentForm.department}
                    onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="AI&DS">AI&DS</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Hostel Block</label>
                  <select
                    value={studentForm.hostel_name}
                    onChange={(e) => setStudentForm({ ...studentForm, hostel_name: e.target.value })}
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="Boys Hostel A">Boys Hostel A</option>
                    <option value="Boys Hostel B">Boys Hostel B</option>
                    <option value="Girls Hostel A">Girls Hostel A</option>
                  </select>
                </div>
              </div>

              {studentModalMode === 'create' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Starting Balance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={studentForm.balance}
                    onChange={(e) => setStudentForm({ ...studentForm, balance: e.target.value })}
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsStudentModalOpen(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase cursor-pointer">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SERVICE MODALS (CREATE/EDIT) --- */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-black text-slate-955">
                {serviceModalMode === 'create' ? 'Add Service Item' : 'Modify Service Pricing'}
              </h3>
              <button onClick={() => setIsServiceModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleServiceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dry Clean"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Unit Type</label>
                  <select
                    value={serviceForm.unit}
                    onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })}
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="kg">kg</option>
                    <option value="piece">piece</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Unit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 50"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsServiceModalOpen(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase cursor-pointer">Save Service</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ATTENDANT MODALS (CREATE/EDIT) --- */}
      {isAttendantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-black text-slate-955">
                {attendantModalMode === 'create' ? 'Register New Staff' : 'Modify Attendant Profile'}
              </h3>
              <button onClick={() => setIsAttendantModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleAttendantSubmit} className="p-6 space-y-4">
              {attendantModalMode === 'create' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Username</label>
                    <input
                      type="text"
                      required
                      value={attendantForm.username}
                      onChange={(e) => setAttendantForm({ ...attendantForm, username: e.target.value })}
                      className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Password</label>
                    <input
                      type="password"
                      required
                      value={attendantForm.password}
                      onChange={(e) => setAttendantForm({ ...attendantForm, password: e.target.value })}
                      className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={attendantForm.name}
                  onChange={(e) => setAttendantForm({ ...attendantForm, name: e.target.value })}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Phone Contact</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={attendantForm.phone}
                  onChange={(e) => setAttendantForm({ ...attendantForm, phone: e.target.value })}
                  className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAttendantModalOpen(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase cursor-pointer">Onboard Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION DIALOGUES (MODALS) --- */}
      {/* 1. Attendant Offboarding Dialogue */}
      {isConfirmOffboardOpen && attendantToOffboard && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-up">
            <h3 className="text-base font-black text-slate-950 tracking-tight">Confirm Staff Offboarding</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove <strong>{attendantToOffboard.name}</strong> from the roster? This deletes their account and revokes system access.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmOffboardOpen(false);
                  setAttendantToOffboard(null);
                }}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteAttendant(attendantToOffboard.id);
                  setIsConfirmOffboardOpen(false);
                  setAttendantToOffboard(null);
                }}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Confirm Offboarding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Student Deletion Dialogue */}
      {isConfirmDeleteStudentOpen && studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-up">
            <h3 className="text-base font-black text-slate-950 tracking-tight">Confirm Student Account Deletion</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the profile and wallet of <strong>{studentToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmDeleteStudentOpen(false);
                  setStudentToDelete(null);
                }}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteStudent(studentToDelete.id);
                  setIsConfirmDeleteStudentOpen(false);
                  setStudentToDelete(null);
                }}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Service Deactivation Dialogue */}
      {isConfirmDeactivateServiceOpen && serviceToDeactivate && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-up">
            <h3 className="text-base font-black text-slate-955 tracking-tight">Deactivate Service</h3>
            <p className="text-xs text-slate-605 leading-relaxed">
              Are you sure you want to soft-deactivate the service <strong>{serviceToDeactivate.name}</strong>? It will no longer be available for registering new intake orders, but existing receipts will remain valid.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmDeactivateServiceOpen(false);
                  setServiceToDeactivate(null);
                }}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deactivateService(serviceToDeactivate.id);
                  setIsConfirmDeactivateServiceOpen(false);
                  setServiceToDeactivate(null);
                }}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
