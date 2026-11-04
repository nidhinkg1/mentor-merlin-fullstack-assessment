import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Navbar } from './components/common/Navbar.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { RegisterPage } from './pages/auth/RegisterPage.js';
import { RoomDiscoveryPage } from './pages/guest/RoomDiscoveryPage.js';
import { MyReservationsPage } from './pages/guest/MyReservationsPage.js';
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage.js';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { LoadingSpinner } from './components/common/Feedback.js';

// Route guard requiring authenticated admin
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Verifying executive administrative credentials..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center', padding: '36px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E6E0', boxShadow: '0 4px 16px rgba(41, 45, 43, 0.05)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#991b1b', margin: '0 0 10px' }}>
          Access Restricted: Hotel Administration Only
        </h2>
        <p style={{ color: '#737873', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 24px' }}>
          This console is reserved exclusively for System Administrators. Your active account role ({user.role}) does not have administrative privileges.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {user.role === 'staff' ? (
            <Link
              to="/staff/dashboard"
              style={{
                padding: '9px 18px',
                backgroundColor: '#294C3A',
                color: '#ffffff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Return to Front Desk
            </Link>
          ) : (
            <Link
              to="/"
              style={{
                padding: '9px 18px',
                backgroundColor: '#294C3A',
                color: '#ffffff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Return to Stays
            </Link>
          )}
          <Link
            to="/login"
            style={{
              padding: '9px 18px',
              backgroundColor: '#F8F7F3',
              color: '#292D2B',
              border: '1px solid #E7E6E0',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Sign in as Admin
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Route guard requiring authenticated staff or admin
const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Checking authorized staff credentials..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'staff' && user.role !== 'admin') {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', textAlign: 'center', padding: '36px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E6E0', boxShadow: '0 4px 16px rgba(41, 45, 43, 0.05)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#991b1b', margin: '0 0 10px' }}>
          Access Restricted: Staff Operations Only
        </h2>
        <p style={{ color: '#737873', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 24px' }}>
          The Front Desk Operations Dashboard is reserved exclusively for hotel staff and management. Your account is currently signed in as a Guest.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link
            to="/login"
            style={{
              padding: '9px 18px',
              backgroundColor: '#294C3A',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Sign in as Staff
          </Link>
          <Link
            to="/"
            style={{
              padding: '9px 18px',
              backgroundColor: '#F8F7F3',
              color: '#292D2B',
              border: '1px solid #E7E6E0',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            Return to Stays
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Route guard requiring authenticated guest
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Loading account..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* 1. Guest-Facing Experience (Agoda-Inspired) */}
          <Route path="/" element={<RoomDiscoveryPage />} />
          <Route path="/rooms" element={<RoomDiscoveryPage />} />
          <Route
            path="/my-reservations"
            element={
              <GuestRoute>
                <MyReservationsPage />
              </GuestRoute>
            }
          />

          {/* Authentication Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* 2. Staff-Facing Experience (Front Desk Operations) */}
          <Route
            path="/staff/dashboard"
            element={
              <StaffRoute>
                <StaffDashboardPage />
              </StaffRoute>
            }
          />
          <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />

          {/* 3. Admin-Facing Experience (Executive Administration) */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
