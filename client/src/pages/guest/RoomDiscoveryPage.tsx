import React, { useState, useEffect, useCallback } from 'react';
import type { RoomType, AvailableRoomResult, AvailabilitySearchResponse, Reservation } from '../../types/index.js';
import { api, ApiError } from '../../services/api.js';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/common/Feedback.js';
import { BookingModal } from '../../components/guest/BookingModal.js';

export const RoomDiscoveryPage: React.FC = () => {
  // Format today's date in YYYY-MM-DD
  const getTodayString = (): string => {
    const now = new Date();
    return now.toISOString().split('T')[0] as string;
  };

  // Format tomorrow's date in YYYY-MM-DD
  const getTomorrowString = (): string => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().split('T')[0] as string;
  };

  // Search parameters
  const [checkIn, setCheckIn] = useState<string>(getTodayString());
  const [checkOut, setCheckOut] = useState<string>(getTomorrowString());
  const [guestCount, setGuestCount] = useState<number>(2);
  const [roomCount, setRoomCount] = useState<number>(1);

  // Data states
  const [allRooms, setAllRooms] = useState<RoomType[]>([]);
  const [searchResults, setSearchResults] = useState<AvailableRoomResult[] | null>(null);
  const [nights, setNights] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Booking Modal State
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [selectedAvailableCount, setSelectedAvailableCount] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Fallback room photo
  const defaultRoomImage = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';

  // Load all rooms initially for catalog display
  const fetchAllRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: RoomType[] }>('/rooms');
      if (res.data) {
        setAllRooms(res.data);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load available room accommodations.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRooms();
  }, [fetchAllRooms]);

  // Execute Availability Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    // Validation
    if (!checkIn || !checkOut) {
      setError('Please select both check-in and check-out dates.');
      return;
    }

    if (new Date(checkOut).getTime() <= new Date(checkIn).getTime()) {
      setError('Check-out date must be after check-in date.');
      return;
    }

    const diffDays = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      setError('Maximum stay duration is 30 nights. For longer stays, please contact hotel reservations.');
      return;
    }

    setSearchLoading(true);

    try {
      const queryParams = new URLSearchParams({
        checkIn,
        checkOut,
        guestCount: guestCount.toString(),
        roomCount: roomCount.toString(),
      });

      const res = await api.get<AvailabilitySearchResponse>(`/availability/search?${queryParams.toString()}`);
      if (res.data) {
        setSearchResults(res.data);
        setNights(res.dateRange?.nights || 1);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error querying real-time hotel availability.');
      }
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleOpenBooking = (room: RoomType, availableCount: number) => {
    setSelectedRoom(room);
    setSelectedAvailableCount(availableCount);
    setIsModalOpen(true);
  };

  const handleBookingSuccess = (_res: Reservation) => {
    if (searchResults !== null) {
      handleSearch();
    }
  };

  return (
    <div style={{ backgroundColor: '#F8F7F3', minHeight: 'calc(100vh - 66px)', paddingBottom: '60px' }}>
      {/* AGODA-INSPIRED HERO BANNER WITH REFINED FOREST GREEN TONE */}
      <div
        style={{
          position: 'relative',
          height: '380px',
          backgroundImage: `linear-gradient(rgba(41, 76, 58, 0.7), rgba(31, 58, 44, 0.85)), url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 20px',
          color: '#FFFFFF',
        }}
      >
        <div style={{ maxWidth: '820px' }}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(177, 138, 82, 0.5)',
              backdropFilter: 'blur(4px)',
              color: '#F8F7F3',
              padding: '4px 14px',
              borderRadius: '4px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}
          >
            ★ 5-Star Luxury Resort & Residences ★
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.03em', color: '#FFFFFF' }}>
            Mentor Merlin Hotel & Resort
          </h1>
          <p style={{ fontSize: '1.0625rem', color: '#E7E6E0', margin: 0, fontWeight: 400, maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
            Guaranteed lowest rates, verified real-time room inventory, and instant reservation confirmation.
          </p>
        </div>
      </div>

      {/* PROMINENT HORIZONTAL AGODA SEARCH BAR (FLOATING OVER HERO) */}
      <div style={{ maxWidth: '1200px', margin: '-44px auto 36px', padding: '0 20px', position: 'relative', zIndex: 20 }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -4px rgba(41, 45, 43, 0.08), 0 4px 6px -2px rgba(41, 45, 43, 0.04)',
            border: '1px solid #E7E6E0',
            padding: '22px 24px',
          }}
        >
          <form onSubmit={handleSearch}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                alignItems: 'flex-end',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#737873', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Check-In
                </label>
                <input
                  type="date"
                  min={getTodayString()}
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    if (new Date(checkOut) <= new Date(e.target.value)) {
                      const next = new Date(e.target.value);
                      next.setDate(next.getDate() + 1);
                      setCheckOut(next.toISOString().split('T')[0] as string);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    fontWeight: 600,
                    color: '#292D2B',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#737873', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Check-Out
                </label>
                <input
                  type="date"
                  min={checkIn || getTodayString()}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    fontWeight: 600,
                    color: '#292D2B',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#737873', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Guests
                </label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.875rem',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 600,
                    color: '#292D2B',
                    boxSizing: 'border-box',
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 8].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Adult Guest' : 'Adult Guests'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#737873', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Rooms
                </label>
                <select
                  value={roomCount}
                  onChange={(e) => setRoomCount(parseInt(e.target.value, 10))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.875rem',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 600,
                    color: '#292D2B',
                    boxSizing: 'border-box',
                  }}
                >
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Room' : 'Rooms'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  style={{
                    width: '100%',
                    padding: '11px 20px',
                    backgroundColor: '#294C3A', // Deep Forest Green
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: searchLoading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseOver={(e) => {
                    if (!searchLoading) e.currentTarget.style.backgroundColor = '#1f3a2c';
                  }}
                  onMouseOut={(e) => {
                    if (!searchLoading) e.currentTarget.style.backgroundColor = '#294C3A';
                  }}
                >
                  {searchLoading ? 'Searching...' : 'Search Available Rooms'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {loading ? (
          <LoadingSpinner message="Loading hotel accommodations..." />
        ) : searchResults !== null ? (
          /* SEARCH RESULTS: AGODA-STYLE EXPANDED LISTING */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#292D2B', margin: 0, letterSpacing: '-0.02em' }}>
                  Available Rooms ({searchResults.length})
                </h2>
                <p style={{ color: '#737873', fontSize: '0.8125rem', margin: '4px 0 0' }}>
                  {checkIn} to {checkOut} · {nights} night(s) · {guestCount} guest(s) · {roomCount} room(s)
                </p>
              </div>
              <button
                onClick={() => setSearchResults(null)}
                style={{
                  padding: '7px 14px',
                  backgroundColor: '#FFFFFF',
                  color: '#737873',
                  border: '1px solid #E7E6E0',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
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
                Clear Search & View All Rooms
              </button>
            </div>

            {searchResults.length === 0 ? (
              <EmptyState
                title="No Available Rooms for Selected Dates"
                description="All rooms accommodating your party are fully reserved for the requested dates. Please choose alternate dates or fewer rooms."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {searchResults.map((item) => (
                  <div
                    key={item.roomType._id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E7E6E0',
                      boxShadow: '0 2px 4px rgba(41, 45, 43, 0.04)',
                      display: 'grid',
                      gridTemplateColumns: '320px 1fr 240px',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Left: Real Room Photo */}
                    <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                      <img
                        src={item.roomType.imageUrl || defaultRoomImage}
                        alt={item.roomType.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          backgroundColor: '#294C3A', // Deep Forest Green
                          color: '#FFFFFF',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Instant Confirmation
                      </span>
                    </div>

                    {/* Center: Details & Amenities */}
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1875rem', fontWeight: 800, color: '#292D2B', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                          {item.roomType.name}
                        </h3>
                        <p style={{ color: '#737873', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 12px' }}>
                          {item.roomType.description}
                        </p>

                        <div style={{ fontSize: '0.8125rem', color: '#78866B', fontWeight: 600, marginBottom: '12px' }}>
                          Capacity: Up to {item.roomType.capacity} Guests
                        </div>

                        {/* Facilities Pills */}
                        {item.roomType.facilities && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {item.roomType.facilities.map((fac, idx) => (
                              <span
                                key={idx}
                                style={{
                                  backgroundColor: '#F8F7F3',
                                  color: '#737873',
                                  border: '1px solid #E7E6E0',
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 500,
                                }}
                              >
                                {fac}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: '12px' }}>
                        {item.availableCount <= 3 ? (
                          <span style={{ color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700 }}>
                            Only {item.availableCount} room(s) left at this rate!
                          </span>
                        ) : (
                          <span style={{ color: '#294C3A', fontSize: '0.75rem', fontWeight: 600 }}>
                            ✓ Free cancellation before check-in date
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Pricing Box & Action */}
                    <div
                      style={{
                        padding: '20px',
                        borderLeft: '1px solid #E7E6E0',
                        backgroundColor: '#F8F7F3',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'right',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.6875rem', color: '#737873', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                          Price per night
                        </span>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#292D2B', marginTop: '2px' }}>
                          ${item.pricePerNight}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#B18A52', fontWeight: 700, marginTop: '4px' }}>
                          ${item.totalAmount} total for {item.nights} night(s)
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#737873', marginTop: '2px' }}>
                          Includes all taxes & resort fees
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenBooking(item.roomType, item.availableCount)}
                        style={{
                          width: '100%',
                          padding: '11px',
                          backgroundColor: '#294C3A', // Deep Forest Green
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1f3a2c')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#294C3A')}
                      >
                        Reserve Suite
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ALL ROOMS CATALOG VIEW */
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#292D2B', margin: 0, letterSpacing: '-0.025em' }}>
                Accommodations & Luxury Suites
              </h2>
              <p style={{ color: '#737873', fontSize: '0.875rem', marginTop: '4px' }}>
                Select your travel dates in the search bar above to lock in real-time availability and guaranteed rates.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
              {allRooms.map((room) => (
                <div
                  key={room._id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E7E6E0',
                    overflow: 'hidden',
                    boxShadow: '0 2px 4px rgba(41, 45, 43, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ height: '210px', position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={room.imageUrl || defaultRoomImage}
                      alt={room.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(41, 45, 43, 0.85)',
                        color: '#FFFFFF',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ color: '#B18A52', fontWeight: 800 }}>${room.pricePerNight}</span>{' '}
                      <span style={{ fontSize: '0.6875rem', fontWeight: 400, color: '#E7E6E0' }}>/ night</span>
                    </div>
                  </div>

                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1875rem', fontWeight: 800, color: '#292D2B', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                        {room.name}
                      </h3>
                      <p style={{ color: '#737873', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 12px' }}>
                        {room.description}
                      </p>
                      <div style={{ fontSize: '0.8125rem', color: '#78866B', fontWeight: 600, marginBottom: '14px' }}>
                        Capacity: Up to {room.capacity} Guests · {room.totalInventory} Units Total
                      </div>

                      {room.facilities && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                          {room.facilities.slice(0, 4).map((fac, idx) => (
                            <span
                              key={idx}
                              style={{
                                backgroundColor: '#F8F7F3',
                                color: '#737873',
                                border: '1px solid #E7E6E0',
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {fac}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleSearch()}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#294C3A', // Deep Forest Green
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1f3a2c')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#294C3A')}
                    >
                      Check Availability & Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AGODA-STYLE BOOKING DRAWER / MODAL */}
      <BookingModal
        room={selectedRoom}
        checkIn={checkIn}
        checkOut={checkOut}
        nights={nights}
        availableCount={selectedAvailableCount}
        initialRoomCount={roomCount}
        initialGuestCount={guestCount}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
};

export default RoomDiscoveryPage;
