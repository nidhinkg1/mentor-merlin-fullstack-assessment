import React, { useState, useEffect, useCallback } from 'react';
import type { Reservation, PaginatedResponse } from '../../types/index.js';
import { api, ApiError } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { Pagination } from '../../components/common/Pagination.js';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/common/Feedback.js';

export const MyReservationsPage: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination & Filter States
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paginationMeta, setPaginationMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  // Cancellation Modal State
  const [cancellingRes, setCancellingRes] = useState<Reservation | null>(null);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchMyReservations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const res = await api.get<PaginatedResponse<Reservation>>(`/reservations/my?${params.toString()}`);
      if (res.data) {
        setReservations(res.data);
        if (res.pagination) {
          setPaginationMeta(res.pagination);
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch your reservations.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchMyReservations();
  }, [fetchMyReservations]);

  // Execute Cancellation
  const handleConfirmCancel = async () => {
    if (!cancellingRes) return;
    setCancelLoading(true);
    setCancelError(null);

    try {
      const res = await api.patch<{ success: boolean; message: string; data: Reservation }>(
        `/reservations/${cancellingRes._id}/cancel`
      );

      setSuccessMessage(res.message || `Reservation ${cancellingRes.reservationReference} successfully cancelled.`);
      setCancellingRes(null);
      fetchMyReservations();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCancelError(err.message);
      } else {
        setCancelError('Failed to cancel reservation. Please try again.');
      }
    } finally {
      setCancelLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ backgroundColor: '#F8F7F3', minHeight: 'calc(100vh - 66px)', padding: '36px 20px 60px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#292D2B', margin: 0, letterSpacing: '-0.025em' }}>
            My Hotel Reservations
          </h1>
          <p style={{ color: '#737873', fontSize: '0.9375rem', marginTop: '6px' }}>
            View, track, and manage all your booked stays at Mentor Merlin Hotel & Resort.
          </p>
        </div>

        {/* Success Notification */}
        {successMessage && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>✓ {successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: 700 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* Filter Bar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E7E6E0',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(41, 45, 43, 0.03)',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { label: 'All Bookings', value: '' },
              { label: 'Confirmed', value: 'Confirmed' },
              { label: 'Checked-in', value: 'Checked-in' },
              { label: 'Checked-out', value: 'Checked-out' },
              { label: 'Cancelled', value: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: statusFilter === tab.value ? '#c8d8ce' : 'transparent',
                  backgroundColor: statusFilter === tab.value ? '#f0f4f1' : 'transparent',
                  color: statusFilter === tab.value ? '#294C3A' : '#737873',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.8125rem', color: '#737873' }}>
            Total: <strong style={{ color: '#292D2B' }}>{paginationMeta.total}</strong> reservation(s)
          </div>
        </div>

        {/* Reservations List */}
        {loading ? (
          <LoadingSpinner message="Retrieving your reservation history..." />
        ) : reservations.length === 0 ? (
          <EmptyState
            title="No Reservations Found"
            description={
              statusFilter
                ? `You do not have any reservations currently matching status "${statusFilter}".`
                : "You haven't made any reservations yet. Browse our luxury suites to book your first stay!"
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reservations.map((res) => {
              const isCancellable = res.status === 'Confirmed' || res.status === 'Pending';

              return (
                <div
                  key={res._id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E7E6E0',
                    padding: '20px 24px',
                    boxShadow: '0 2px 4px rgba(41, 45, 43, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {/* Header Row */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '8px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #F8F7F3',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#294C3A', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                          {res.reservationReference}
                        </span>
                        <StatusBadge status={res.status} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#737873', marginTop: '4px' }}>
                        Booked on {new Date(res.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#292D2B' }}>
                        ${res.totalAmount}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#78866B', fontWeight: 600 }}>
                        ${res.pricePerNightSnapshot} / night
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#737873', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Room Category
                      </div>
                      <div style={{ fontWeight: 700, color: '#292D2B', marginTop: '3px' }}>
                        {res.roomTypeId?.name || 'Luxury Suite'}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#737873' }}>
                        {res.roomCount} room(s) · {res.guestCount} guest(s)
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#737873', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Check-In Date
                      </div>
                      <div style={{ fontWeight: 600, color: '#292D2B', marginTop: '3px' }}>
                        {formatDate(res.checkIn)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#737873', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Check-Out Date
                      </div>
                      <div style={{ fontWeight: 600, color: '#292D2B', marginTop: '3px' }}>
                        {formatDate(res.checkOut)}
                      </div>
                    </div>

                    {res.specialRequests && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.6875rem', color: '#737873', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Special Requests
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#292D2B', marginTop: '2px', fontStyle: 'italic' }}>
                          "{res.specialRequests}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  {isCancellable && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        paddingTop: '12px',
                        borderTop: '1px solid #F8F7F3',
                      }}
                    >
                      <button
                        onClick={() => {
                          setCancelError(null);
                          setCancellingRes(res);
                        }}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#FFFFFF',
                          color: '#991b1b',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#fdf2f2';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        Cancel Reservation
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination Controls */}
            {paginationMeta.totalPages > 1 && (
              <div style={{ marginTop: '16px' }}>
                <Pagination pagination={paginationMeta} onPageChange={(p) => setPage(p)} />
              </div>
            )}
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {cancellingRes && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(41, 45, 43, 0.7)',
              backdropFilter: 'blur(3px)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !cancelLoading) setCancellingRes(null);
            }}
          >
            <div
              className="modal-container"
              style={{
                maxWidth: '460px',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(41, 45, 43, 0.1)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                  Cancel Reservation?
                </h3>
                <p style={{ color: '#737873', fontSize: '0.875rem', marginTop: '8px', lineHeight: 1.5 }}>
                  Are you sure you want to cancel booking{' '}
                  <strong style={{ fontFamily: 'monospace', color: '#292D2B' }}>{cancellingRes.reservationReference}</strong>?
                  <br />
                  The reserved room inventory will be immediately released back to available stock.
                </p>
              </div>

              {cancelError && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '0.8125rem',
                    border: '1px solid #fecaca',
                  }}
                >
                  {cancelError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={() => setCancellingRes(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#FFFFFF',
                    color: '#737873',
                    border: '1px solid #E7E6E0',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: cancelLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={handleConfirmCancel}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#991b1b',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: cancelLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Booking'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReservationsPage;
