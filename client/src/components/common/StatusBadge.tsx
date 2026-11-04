import React from 'react';
import type { ReservationStatus } from '../../types/index.js';

interface StatusBadgeProps {
  status: ReservationStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const badgeStyles: Record<ReservationStatus, { bg: string; text: string; dot: string; border: string }> = {
    Confirmed: {
      bg: '#f0f4f1',
      text: '#294C3A', // Deep Forest Green
      dot: '#294C3A',
      border: '#c8d8ce',
    },
    'Checked-in': {
      bg: '#faf5ed',
      text: '#B18A52', // Warm Bronze
      dot: '#B18A52',
      border: '#ebdcc5',
    },
    'Checked-out': {
      bg: '#f4f4f2',
      text: '#737873', // Muted Grey
      dot: '#9ca3af',
      border: '#E7E6E0',
    },
    Cancelled: {
      bg: '#fdf2f2',
      text: '#991b1b', // Soft Red
      dot: '#dc2626',
      border: '#fecaca',
    },
    Pending: {
      bg: '#f4f6f2',
      text: '#78866B', // Muted Olive
      dot: '#78866B',
      border: '#d9e0d4',
    },
  };

  const current = badgeStyles[status] || {
    bg: '#f4f4f2',
    text: '#737873',
    dot: '#9ca3af',
    border: '#E7E6E0',
  };

  return (
    <span
      style={{
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: current.dot,
          marginRight: '6px',
        }}
      />
      {status}
    </span>
  );
};

export default StatusBadge;
