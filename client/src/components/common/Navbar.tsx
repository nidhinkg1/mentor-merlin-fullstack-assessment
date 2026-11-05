import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    setIsMobileOpen(false);
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;
  const closeMobile = () => setIsMobileOpen(false);

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
          padding: '0 20px',
          height: '66px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {/* Brand Name */}
          <Link
            to={user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'staff' ? '/staff/dashboard' : '/'}
            onClick={closeMobile}
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
                color: '#294C3A',
              }}
            >
              Mentor Merlin
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                color: '#B18A52',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Luxury Hotel & Resort
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="navbar-desktop-nav">
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

        {/* Desktop Right Section */}
        <div className="navbar-desktop-auth">
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
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = '#737873';
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
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  backgroundColor: '#294C3A',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  transition: 'background-color 0.15s ease',
                }}
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle Navigation"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            {isMobileOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      <div
        className={`mobile-drawer-overlay ${isMobileOpen ? 'open' : ''}`}
        onClick={closeMobile}
      />

      {/* Mobile Slide-Out Drawer */}
      <div className={`mobile-drawer ${isMobileOpen ? 'open' : ''}`}>
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #E7E6E0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8F7F3',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.125rem', color: '#294C3A' }}>
              Mentor Merlin
            </div>
            <div style={{ fontSize: '0.625rem', color: '#B18A52', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Luxury Hotel & Resort
            </div>
          </div>
          <button
            onClick={closeMobile}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              color: '#737873',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Drawer User Status */}
        {user ? (
          <div style={{ padding: '16px 20px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E7E6E0' }}>
            <div style={{ fontSize: '0.75rem', color: '#737873', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Signed In As
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#292D2B', marginTop: '2px' }}>
              {user.name}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  backgroundColor: user.role === 'admin' ? '#faf5ed' : user.role === 'staff' ? '#f0f4f1' : '#f4f6f2',
                  color: user.role === 'admin' ? '#B18A52' : user.role === 'staff' ? '#294C3A' : '#78866B',
                  border: `1px solid ${user.role === 'admin' ? '#ebdcc5' : user.role === 'staff' ? '#c8d8ce' : '#d9e0d4'}`,
                }}
              >
                {user.role} Account
              </span>
              <span style={{ fontSize: '0.75rem', color: '#737873' }}>• USD ($)</span>
            </div>
          </div>
        ) : null}

        {/* Drawer Navigation Links */}
        <div style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(!user || user.role === 'guest') && (
            <Link
              to="/"
              onClick={closeMobile}
              style={{
                display: 'block',
                padding: '12px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: isActive('/') ? '#294C3A' : '#292D2B',
                backgroundColor: isActive('/') ? '#f0f4f1' : 'transparent',
              }}
            >
              Explore Stays
            </Link>
          )}

          {user && user.role === 'guest' && (
            <Link
              to="/my-reservations"
              onClick={closeMobile}
              style={{
                display: 'block',
                padding: '12px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: isActive('/my-reservations') ? '#294C3A' : '#292D2B',
                backgroundColor: isActive('/my-reservations') ? '#f0f4f1' : 'transparent',
              }}
            >
              My Bookings
            </Link>
          )}

          {user && (user.role === 'staff' || user.role === 'admin') && (
            <Link
              to="/staff/dashboard"
              onClick={closeMobile}
              style={{
                display: 'block',
                padding: '12px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: '#294C3A',
                backgroundColor: isActive('/staff/dashboard') ? '#f0f4f1' : 'transparent',
              }}
            >
              Front Desk Operations
            </Link>
          )}

          {user && user.role === 'admin' && (
            <Link
              to="/admin/dashboard"
              onClick={closeMobile}
              style={{
                display: 'block',
                padding: '12px 14px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.9375rem',
                color: '#B18A52',
                backgroundColor: isActive('/admin/dashboard') ? '#faf5ed' : 'transparent',
              }}
            >
              Administration Console
            </Link>
          )}
        </div>

        {/* Drawer Bottom Actions */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #E7E6E0', backgroundColor: '#F8F7F3' }}>
          {user ? (
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#FFFFFF',
                color: '#991b1b',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link
                to="/login"
                onClick={closeMobile}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '11px',
                  backgroundColor: '#FFFFFF',
                  color: '#292D2B',
                  border: '1px solid #E7E6E0',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={closeMobile}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '11px',
                  backgroundColor: '#294C3A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                Register as Guest
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
