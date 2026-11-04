import React from 'react';
import type { PaginationMetadata } from '../../types/index.js';

interface PaginationProps {
  pagination: PaginationMetadata;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  const { page, totalPages, total, limit } = pagination;

  if (totalPages <= 1) return null;

  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, total);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        borderTop: '1px solid #E7E6E0',
        backgroundColor: '#FFFFFF',
        fontSize: '0.8125rem',
      }}
    >
      <div style={{ color: '#737873' }}>
        Showing <span style={{ fontWeight: 700, color: '#292D2B' }}>{startIdx}</span> to{' '}
        <span style={{ fontWeight: 700, color: '#292D2B' }}>{endIdx}</span> of{' '}
        <span style={{ fontWeight: 700, color: '#292D2B' }}>{total}</span> records
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #E7E6E0',
            backgroundColor: page <= 1 ? '#F8F7F3' : '#FFFFFF',
            color: page <= 1 ? '#b5b4ad' : '#292D2B',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.8125rem',
          }}
        >
          Previous
        </button>
        <div
          style={{
            padding: '0 8px',
            fontWeight: 700,
            color: '#294C3A',
            fontSize: '0.8125rem',
          }}
        >
          Page {page} of {totalPages}
        </div>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #E7E6E0',
            backgroundColor: page >= totalPages ? '#F8F7F3' : '#FFFFFF',
            color: page >= totalPages ? '#b5b4ad' : '#292D2B',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.8125rem',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
