// src/App.jsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import RootPortal from './pages/RootPortal';
import AdminLogin from './pages/auth/AdminLogin';
import AttendantLogin from './pages/auth/AttendantLogin';
import StudentLogin from './pages/auth/StudentLogin';

import AdminDashboard from './pages/admin/AdminDashboard';
import AttendantDashboard from './pages/attendant/AttendantDashboard';
import StudentDashboard from './pages/student/StudentDashboard';

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootPortal />,
  },
  {
    path: "/login/admin",
    element: <AdminLogin />,
  },
  {
    path: "/login/attendant",
    element: <AttendantLogin />,
  },
  {
    path: "/login/student",
    element: <StudentLogin />,
  },
  {
    path: "/admin/dashboard",
    element: <AdminDashboard />,
  },
  {
    path: "/attendant/dashboard",
    element: <AttendantDashboard />,
  },
  {
    path: "/student/dashboard",
    element: <StudentDashboard />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}