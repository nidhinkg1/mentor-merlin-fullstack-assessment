import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (loggedInUser.role === 'staff') {
        navigate('/staff/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password@123');
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 66px)',
        backgroundColor: '#F8F7F3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          padding: '36px',
          boxShadow: '0 4px 16px rgba(41, 45, 43, 0.05)',
          border: '1px solid #E7E6E0',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#B18A52',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Hotel Management System
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#294C3A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Mentor Merlin
          </h1>
          <p style={{ color: '#737873', fontSize: '0.875rem', margin: 0 }}>
            Sign in to access guest reservations, front desk, or administration
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              padding: '12px 14px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              border: '1px solid #fecaca',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. staff@hotel.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #E7E6E0',
                fontSize: '0.9375rem',
                color: '#292D2B',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #E7E6E0',
                fontSize: '0.9375rem',
                color: '#292D2B',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#294C3A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.9375rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.875rem', color: '#737873' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#294C3A', fontWeight: 700, textDecoration: 'none' }}>
            Register as Guest
          </Link>
        </div>

        {/* Quick Demo Fill Buttons */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #E7E6E0' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#737873', textAlign: 'center', marginBottom: '12px' }}>
            Quick Demo Accounts (Evaluation Convenience)
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('staff@hotel.com')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f0f4f1',
                color: '#294C3A',
                border: '1px solid #d0ded5',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Demo Staff
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@hotel.com')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#faf5ed',
                color: '#B18A52',
                border: '1px solid #e8dbc5',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Demo Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('guest@hotel.com')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#f4f6f2',
                color: '#78866B',
                border: '1px solid #d5ddd0',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Demo Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

