import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { RoomType, Reservation } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { api, ApiError } from '../../services/api.js';

interface BookingModalProps {
  room: RoomType | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  availableCount: number;
  initialRoomCount?: number;
  initialGuestCount?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reservation: Reservation) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  room,
  checkIn,
  checkOut,
  nights,
  availableCount,
  initialRoomCount = 1,
  initialGuestCount = 1,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [roomCount, setRoomCount] = useState<number>(initialRoomCount);
  const [guestCount, setGuestCount] = useState<number>(initialGuestCount);
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  if (!isOpen || !room) return null;

  const maxCapacity = room.capacity * roomCount;
  const estimatedTotal = room.pricePerNight * nights * roomCount;

  const handleRoomCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCount = parseInt(e.target.value, 10);
    setRoomCount(newCount);
    if (guestCount > room.capacity * newCount) {
      setGuestCount(room.capacity * newCount);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('Please sign in as a guest to complete your reservation.');
      return;
    }

    if (nights > 30) {
      setError('Reservation stay exceeds maximum duration of 30 nights.');
      return;
    }

    if (guestCount > maxCapacity) {
      setError(`Guest count (${guestCount}) exceeds maximum capacity of ${maxCapacity} for ${roomCount} room(s).`);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<{ success: boolean; data: Reservation }>('/reservations', {
        roomTypeId: room._id,
        checkIn,
        checkOut,
        roomCount,
        guestCount,
        specialRequests: specialRequests.trim() || undefined,
      });

      if (response.data) {
        setConfirmedReservation(response.data);
        onSuccess(response.data);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setError('Sold Out: This room was just booked by another guest or inventory is insufficient. Please adjust your dates or room count.');
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while confirming your reservation.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setConfirmedReservation(null);
    setError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(41, 45, 43, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleModalClose();
      }}
    >
      <div
        className="modal-container"
        style={{
          boxShadow: '0 20px 25px -5px rgba(41, 45, 43, 0.15)',
        }}
      >
        {/* Header: Refined Deep Forest Green */}
        <div
          style={{
            backgroundColor: '#294C3A',
            color: '#FFFFFF',
            padding: '18px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              {confirmedReservation ? 'Reservation Confirmed' : `Reserve: ${room.name}`}
            </h2>
            <p style={{ color: '#E7E6E0', fontSize: '0.8125rem', margin: '4px 0 0' }}>
              {confirmedReservation
                ? `Booking Reference: ${confirmedReservation.reservationReference}`
                : `${nights} Night(s) · ${checkIn} to ${checkOut}`}
            </p>
          </div>
          <button
            onClick={handleModalClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#E7E6E0',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-scroll-body">
          {confirmedReservation ? (
            /* Confirmation Screen */
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  backgroundColor: '#f0f4f1',
                  color: '#294C3A',
                  border: '1px solid #c8d8ce',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  margin: '0 auto 16px',
                }}
              >
                ✓
              </div>
              <h3 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#292D2B', marginBottom: '8px' }}>
                Your Reservation is Confirmed
              </h3>
              <p style={{ color: '#737873', fontSize: '0.875rem', marginBottom: '24px' }}>
                A confirmation has been recorded in the hotel system. Please present your reference code at check-in.
              </p>

              <div
                style={{
                  backgroundColor: '#F8F7F3',
                  border: '1px solid #E7E6E0',
                  borderRadius: '8px',
                  padding: '18px 20px',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#737873' }}>Booking Reference:</span>
                  <strong style={{ color: '#294C3A', fontFamily: 'monospace', fontSize: '1.0625rem', letterSpacing: '0.05em' }}>
                    {confirmedReservation.reservationReference}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#737873' }}>Room Type:</span>
                  <strong style={{ color: '#292D2B' }}>{room.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#737873' }}>Dates:</span>
                  <span style={{ color: '#292D2B' }}>{checkIn} to {checkOut} ({nights} nights)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ color: '#737873' }}>Configuration:</span>
                  <span style={{ color: '#292D2B' }}>{confirmedReservation.roomCount} room(s) · {confirmedReservation.guestCount} guest(s)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #E7E6E0' }}>
                  <span style={{ fontWeight: 700, color: '#292D2B' }}>Guaranteed Total:</span>
                  <strong style={{ color: '#B18A52', fontSize: '1.25rem', fontWeight: 800 }}>
                    ${confirmedReservation.totalAmount}
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    handleModalClose();
                    navigate('/my-reservations');
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#294C3A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  View in My Bookings
                </button>
                <button
                  onClick={handleModalClose}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#FFFFFF',
                    color: '#737873',
                    border: '1px solid #E7E6E0',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#991b1b',
                    padding: '12px 14px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    border: '1px solid #fecaca',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Room Photo & Stay Summary Header */}
              {room.imageUrl && (
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px', padding: '10px', backgroundColor: '#F8F7F3', borderRadius: '6px', border: '1px solid #E7E6E0' }}>
                  <img
                    src={room.imageUrl}
                    alt={room.name}
                    style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: '#292D2B', fontSize: '0.9375rem' }}>{room.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#737873' }}>
                      ${room.pricePerNight} / night · Accommodates up to {room.capacity} Guests
                    </div>
                  </div>
                </div>
              )}

              {/* Guest Authentication Check */}
              {!user && (
                <div
                  style={{
                    backgroundColor: '#faf5ed',
                    border: '1px solid #ebdcc5',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    fontSize: '0.875rem',
                    color: '#B18A52',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>Please sign in to confirm this reservation.</span>
                  <Link
                    to="/login"
                    style={{
                      padding: '5px 14px',
                      backgroundColor: '#294C3A',
                      color: '#FFFFFF',
                      borderRadius: '4px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      fontSize: '0.75rem',
                    }}
                  >
                    Sign In
                  </Link>
                </div>
              )}

              {/* Room & Dates Summary Card */}
              <div
                style={{
                  backgroundColor: '#F8F7F3',
                  border: '1px solid #E7E6E0',
                  borderRadius: '6px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#737873' }}>Rate per night:</span>
                  <strong style={{ color: '#292D2B' }}>${room.pricePerNight} / night</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#737873' }}>Stay Duration:</span>
                  <strong style={{ color: '#292D2B' }}>{nights} night(s) ({checkIn} → {checkOut})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#737873' }}>Remaining Units:</span>
                  <span style={{ color: availableCount <= 2 ? '#b91c1c' : '#294C3A', fontWeight: 700 }}>
                    {availableCount} room(s) available
                  </span>
                </div>
              </div>

              {/* Room Count & Guest Count */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#737873', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Rooms Requested
                  </label>
                  <select
                    value={roomCount}
                    onChange={handleRoomCountChange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E7E6E0',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 600,
                      color: '#292D2B',
                      boxSizing: 'border-box',
                    }}
                  >
                    {Array.from({ length: Math.min(availableCount, 10) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Room' : 'Rooms'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#737873', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Total Guests (Max {maxCapacity})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxCapacity}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E7E6E0',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#292D2B',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Special Requests */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#737873', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Special Requests (Optional)
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Quiet room preferred, high floor, late arrival..."
                  rows={2}
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    color: '#292D2B',
                  }}
                />
              </div>

              {/* Price Calculation Card */}
              <div
                style={{
                  backgroundColor: '#f0f4f1',
                  border: '1px solid #c8d8ce',
                  borderRadius: '6px',
                  padding: '14px 18px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: '#294C3A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Server-Authoritative Total
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#737873', marginTop: '2px' }}>
                      ${room.pricePerNight} × {nights} nights × {roomCount} room(s)
                    </div>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#294C3A' }}>
                    ${estimatedTotal}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleModalClose}
                  style={{
                    flex: 1,
                    padding: '11px',
                    backgroundColor: '#FFFFFF',
                    color: '#737873',
                    border: '1px solid #E7E6E0',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !user}
                  style={{
                    flex: 2,
                    padding: '11px',
                    backgroundColor: !user ? '#d4d2c9' : '#294C3A', // Deep Forest Green
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: loading || !user ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {loading ? 'Confirming Reservation...' : `Confirm & Book ($${estimatedTotal})`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
