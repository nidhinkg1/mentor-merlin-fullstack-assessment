import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
    <div
      style={{
        width: '36px',
        height: '36px',
        border: '3px solid #E7E6E0',
        borderTop: '3px solid #294C3A', // Deep Forest Green
        borderRadius: '50%',
        animation: 'spin 0.9s linear infinite',
      }}
    />
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    <p style={{ marginTop: '14px', color: '#737873', fontSize: '0.875rem', fontWeight: 500 }}>{message}</p>
  </div>
);

export const ErrorMessage: React.FC<{
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}> = ({ message, onRetry, onDismiss }) => (
  <div
    style={{
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#991b1b',
      padding: '14px 18px',
      borderRadius: '6px',
      margin: '16px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '1.125rem' }}>⚠️</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{message}</span>
    </div>
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '5px 12px',
            borderRadius: '4px',
            backgroundColor: '#991b1b',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#991b1b',
            fontSize: '1.125rem',
            cursor: 'pointer',
            padding: '2px 6px',
            fontWeight: 700,
          }}
        >
          ×
        </button>
      )}
    </div>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div
    style={{
      padding: '48px 24px',
      textAlign: 'center',
      border: '1px dashed #E7E6E0',
      borderRadius: '8px',
      margin: '24px 0',
      backgroundColor: '#FFFFFF',
    }}
  >
    <div style={{ fontSize: '2.25rem', marginBottom: '8px' }}>📋</div>
    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
      {title}
    </h3>
    {description && (
      <p style={{ fontSize: '0.875rem', color: '#737873', maxWidth: '420px', margin: '0 auto 16px' }}>
        {description}
      </p>
    )}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        style={{
          padding: '8px 16px',
          backgroundColor: '#294C3A',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {actionLabel}
      </button>
    )}
  </div>
);
