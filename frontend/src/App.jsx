import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UserLogin from './pages/UserLogin';
import UserSignup from './pages/UserSignup';
import UserDashboard from './pages/UserDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import './App.css';

function ProtectedUser({ children }) {
  const userToken = localStorage.getItem('user_token');
  const adminToken = localStorage.getItem('admin_token');
  
  // If admin token exists, redirect to admin dashboard
  if (adminToken) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return userToken ? children : <Navigate to="/login" replace />;
}

function ProtectedAdmin({ children }) {
  const adminToken = localStorage.getItem('admin_token');
  
  if (!adminToken) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Clear any user tokens when accessing admin dashboard
  const userToken = localStorage.getItem('user_token');
  if (userToken) {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
  }
  
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<UserLogin />} />
        <Route path="/signup" element={<UserSignup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedUser><UserDashboard /></ProtectedUser>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<ProtectedAdmin><AdminDashboard /></ProtectedAdmin>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
