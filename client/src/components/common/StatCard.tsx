import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  variant?: 'primary' | 'accent' | 'secondary' | 'neutral' | 'blue' | 'green' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  variant = 'primary',
}) => {
  const accentColors: Record<string, string> = {
    primary: '#294C3A',  // Forest Green
    accent: '#B18A52',   // Warm Bronze
    secondary: '#78866B',// Muted Olive
    neutral: '#737873',  // Slate
    green: '#294C3A',
    blue: '#294C3A',
    amber: '#B18A52',
  };

  const accentColor = accentColors[variant] || '#294C3A';

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E7E6E0',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(41, 45, 43, 0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent highlight bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: accentColor,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#737873',
          }}
        >
          {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: '#F8F7F3',
              color: '#292D2B',
              border: '1px solid #E7E6E0',
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: '10px',
          fontSize: '1.875rem',
          fontWeight: 800,
          color: '#292D2B',
          letterSpacing: '-0.025em',
          lineHeight: 1.15,
        }}
      >
        {value}
      </div>

      {subtitle && (
        <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#737873', fontWeight: 500 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default StatCard;
