import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      style={{
        backgroundColor: '#FFFFFF',
        color: '#292D2B',
        borderBottom: '1px solid #E7E6E0',
        boxShadow: '0 1px 3px rgba(41, 45, 43, 0.03)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '0 24px',
          height: '66px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          {/* Brand Name - Sophisticated Restrained Typography */}
          <Link
            to={user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'staff' ? '/staff/dashboard' : '/'}
            style={{
              textDecoration: 'none',
              color: '#292D2B',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                fontWeight: 800,
                fontSize: '1.25rem',
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                color: '#294C3A', // Deep Forest Green
              }}
            >
              Mentor Merlin
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                color: '#B18A52', // Warm Bronze Accent
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Luxury Hotel & Resort
            </span>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {(!user || user.role === 'guest') && (
              <Link
                to="/"
                style={{
                  color: isActive('/') ? '#294C3A' : '#737873',
                  backgroundColor: isActive('/') ? '#f0f4f1' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  padding: '7px 14px',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                Explore Stays
              </Link>
            )}

            {user && user.role === 'guest' && (
              <Link
                to="/my-reservations"
                style={{
                  color: isActive('/my-reservations') ? '#294C3A' : '#737873',
                  backgroundColor: isActive('/my-reservations') ? '#f0f4f1' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  padding: '7px 14px',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                My Bookings
              </Link>
            )}

            {/* Staff Navigation Link */}
            {user && (user.role === 'staff' || user.role === 'admin') && (
              <Link
                to="/staff/dashboard"
                style={{
                  color: '#294C3A',
                  backgroundColor: user.role === 'staff' || isActive('/staff/dashboard') ? '#f0f4f1' : 'transparent',
                  border: '1px solid',
                  borderColor: user.role === 'staff' || isActive('/staff/dashboard') ? '#c8d8ce' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  padding: '6px 14px',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                Front Desk Operations
              </Link>
            )}

            {/* Admin Navigation Link */}
            {user && user.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                style={{
                  color: '#B18A52',
                  backgroundColor: isActive('/admin/dashboard') ? '#faf5ed' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive('/admin/dashboard') ? '#ebdcc5' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  padding: '6px 14px',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                Administration Console
              </Link>
            )}
          </nav>
        </div>

        {/* Right Section: Currency, Account Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              fontSize: '0.8125rem',
              color: '#737873',
              fontWeight: 600,
              borderRight: '1px solid #E7E6E0',
              paddingRight: '16px',
            }}
          >
            USD ($)
          </div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ textAlign: 'right', fontSize: '0.8125rem' }}>
                <div style={{ fontWeight: 700, color: '#292D2B' }}>{user.name}</div>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor:
                        user.role === 'admin'
                          ? '#faf5ed'
                          : user.role === 'staff'
                          ? '#f0f4f1'
                          : '#f4f6f2',
                      color:
                        user.role === 'admin'
                          ? '#B18A52'
                          : user.role === 'staff'
                          ? '#294C3A'
                          : '#78866B',
                      border: `1px solid ${
                        user.role === 'admin'
                          ? '#ebdcc5'
                          : user.role === 'staff'
                          ? '#c8d8ce'
                          : '#d9e0d4'
                      }`,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: '0.625rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#737873',
                  border: '1px solid #E7E6E0',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8F7F3';
                  e.currentTarget.style.color = '#292D2B';
                  e.currentTarget.style.borderColor = '#c5c3b8';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = '#737873';
                  e.currentTarget.style.borderColor = '#E7E6E0';
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Link
                to="/login"
                style={{
                  color: '#292D2B',
                  textDecoration: 'none',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8F7F3';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  backgroundColor: '#294C3A', // Deep Forest Green
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#1f3a2c';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#294C3A';
                }}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
