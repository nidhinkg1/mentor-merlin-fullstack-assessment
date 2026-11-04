import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { RoomType, DashboardStats, Reservation, PaginatedResponse, CreateRoomInput, UpdateRoomInput } from '../../types/index.js';
import { api, ApiError } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { Pagination } from '../../components/common/Pagination.js';
import { LoadingSpinner, ErrorMessage } from '../../components/common/Feedback.js';

type AdminTab = 'overview' | 'rooms' | 'reservations' | 'system';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Stats State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Rooms Management State
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [roomsLoading, setRoomsLoading] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Create Room Form State
  const [newRoom, setNewRoom] = useState<CreateRoomInput>({
    name: '',
    description: '',
    capacity: 2,
    pricePerNight: 150,
    totalInventory: 5,
    facilities: ['High-speed Wi-Fi', 'Air Conditioning', 'En-suite Rain Shower'],
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
  });

  // Edit Room Form State
  const [editForm, setEditForm] = useState<UpdateRoomInput>({});

  // Reservations Oversight State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resLoading, setResLoading] = useState<boolean>(false);
  const [resPage, setResPage] = useState<number>(1);
  const [resSearch, setResSearch] = useState<string>('');
  const [resStatus, setResStatus] = useState<string>('');
  const [resPagination, setResPagination] = useState<{
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

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: DashboardStats }>('/staff/dashboard/stats');
      if (res.data) {
        setStats(res.data);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch All Rooms (including inactive)
  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      // Pass limit=50 to fetch all room types for administrative management
      const res = await api.get<{ success: boolean; data: RoomType[] }>('/rooms?limit=50');
      if (res.data) {
        setRooms(res.data);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  // Fetch Reservations Oversight
  const fetchReservations = useCallback(async () => {
    setResLoading(true);
    try {
      const params = new URLSearchParams({
        page: resPage.toString(),
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (resSearch) params.append('search', resSearch);
      if (resStatus) params.append('status', resStatus);

      const res = await api.get<PaginatedResponse<Reservation>>(`/staff/reservations?${params.toString()}`);
      if (res.data) {
        setReservations(res.data);
        if (res.pagination) setResPagination(res.pagination);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setResLoading(false);
    }
  }, [resPage, resSearch, resStatus]);

  useEffect(() => {
    fetchStats();
    fetchRooms();
  }, [fetchStats, fetchRooms]);

  useEffect(() => {
    if (activeTab === 'reservations' || activeTab === 'overview') {
      fetchReservations();
    }
  }, [activeTab, fetchReservations]);

  // Handle Room Update
  const handleUpdateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    setActionLoading(true);
    setError(null);

    try {
      await api.put(`/rooms/${editingRoom._id}`, editForm);
      setSuccessMessage(`Room type "${editingRoom.name}" updated successfully.`);
      setEditingRoom(null);
      fetchRooms();
      fetchStats();
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to update room type.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Room Creation
  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);

    try {
      await api.post('/rooms', newRoom);
      setSuccessMessage(`Room type "${newRoom.name}" created successfully.`);
      setIsCreateModalOpen(false);
      setNewRoom({
        name: '',
        description: '',
        capacity: 2,
        pricePerNight: 150,
        totalInventory: 5,
        facilities: ['High-speed Wi-Fi', 'Air Conditioning', 'En-suite Rain Shower'],
        isActive: true,
        imageUrl: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
      });
      fetchRooms();
      fetchStats();
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to create room type.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Room Active Status
  const handleToggleRoomStatus = async (room: RoomType) => {
    setActionLoading(true);
    setError(null);

    try {
      await api.put(`/rooms/${room._id}`, { isActive: !room.isActive });
      setSuccessMessage(`Room "${room.name}" is now ${!room.isActive ? 'Active' : 'Inactive'}.`);
      fetchRooms();
      fetchStats();
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to toggle room status.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8F7F3', minHeight: 'calc(100vh - 66px)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Executive Admin Top Header */}
      <div style={{ backgroundColor: '#294C3A', borderBottom: '1px solid #1f3a2c', color: '#ffffff', padding: '18px 24px' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                Mentor Merlin Hotel Administration Console
              </h1>
              <span style={{ fontSize: '0.6875rem', backgroundColor: '#B18A52', color: '#FFFFFF', padding: '3px 9px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Executive Level
              </span>
            </div>
            <p style={{ color: '#E7E6E0', fontSize: '0.8125rem', margin: '4px 0 0', opacity: 0.9 }}>
              Strategic oversight, inventory pricing controls, and reservation governance
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/staff/dashboard"
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Open Front Desk View →
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E7E6E0' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '24px' }}>
          {[
            { id: 'overview', label: 'Executive Overview' },
            { id: 'rooms', label: 'Room & Inventory Management' },
            { id: 'reservations', label: 'Reservations Oversight' },
            { id: 'system', label: 'System Architecture & Health' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              style={{
                padding: '16px 4px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #294C3A' : '3px solid transparent',
                color: activeTab === tab.id ? '#294C3A' : '#737873',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '28px 24px' }}>
        {/* Alerts */}
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
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: 700 }}>
              ×
            </button>
          </div>
        )}

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            {statsLoading ? (
              <LoadingSpinner message="Calculating executive metrics..." />
            ) : stats ? (
              <div>
                {/* 4 Key Portfolio Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E7E6E0', borderTop: '3px solid #294C3A', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.04)' }}>
                    <div style={{ color: '#737873', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Total Portfolio Inventory
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#292D2B', marginTop: '6px' }}>
                      {stats.totalRoomInventory} <span style={{ fontSize: '0.875rem', color: '#737873', fontWeight: 500 }}>Rooms</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#294C3A', marginTop: '4px', fontWeight: 600 }}>
                      Across {rooms.length} Catalogued Room Types
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E7E6E0', borderTop: '3px solid #B18A52', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.04)' }}>
                    <div style={{ color: '#737873', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Currently Occupied Rooms
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#B18A52', marginTop: '6px' }}>
                      {stats.occupiedRooms}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#737873', marginTop: '4px' }}>
                      Checked-in guests currently in-house
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E7E6E0', borderTop: '3px solid #78866B', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.04)' }}>
                    <div style={{ color: '#737873', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Available Rooms Tonight
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#294C3A', marginTop: '6px' }}>
                      {stats.availableRooms}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#294C3A', marginTop: '4px', fontWeight: 600 }}>
                      Ready for immediate guest booking
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E7E6E0', borderTop: '3px solid #292D2B', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.04)' }}>
                    <div style={{ color: '#737873', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Live Occupancy Rate
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#292D2B', marginTop: '6px' }}>
                      {stats.occupancyRate}%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#737873', marginTop: '4px' }}>
                      Based on total room-unit inventory
                    </div>
                  </div>
                </div>

                {/* Recent Bookings Activity Overview */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E6E0', padding: '20px', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#292D2B', margin: 0, letterSpacing: '-0.01em' }}>
                      Recent Reservation Audit Feed
                    </h2>
                    <button
                      onClick={() => setActiveTab('reservations')}
                      style={{ padding: '6px 14px', backgroundColor: '#F8F7F3', border: '1px solid #E7E6E0', color: '#292D2B', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      View All Reservations →
                    </button>
                  </div>

                  {resLoading ? (
                    <LoadingSpinner message="Loading audit feed..." />
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8F7F3', borderBottom: '1px solid #E7E6E0', color: '#737873', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ padding: '12px 14px' }}>Reference</th>
                            <th style={{ padding: '12px 14px' }}>Guest</th>
                            <th style={{ padding: '12px 14px' }}>Room Type</th>
                            <th style={{ padding: '12px 14px' }}>Stay Duration</th>
                            <th style={{ padding: '12px 14px' }}>Status</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reservations.slice(0, 5).map((r) => (
                            <tr key={r._id} style={{ borderBottom: '1px solid #E7E6E0' }}>
                              <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#294C3A' }}>{r.reservationReference}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ fontWeight: 600, color: '#292D2B' }}>{r.guestId?.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#737873' }}>{r.guestId?.email}</div>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#292D2B' }}>{r.roomTypeId?.name}</td>
                              <td style={{ padding: '12px 14px', fontSize: '0.8125rem', color: '#737873' }}>
                                {new Date(r.checkIn).toLocaleDateString()} → {new Date(r.checkOut).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '12px 14px' }}><StatusBadge status={r.status} /></td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#B18A52' }}>${r.totalAmount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 2: ROOM & INVENTORY MANAGEMENT */}
        {activeTab === 'rooms' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#292D2B', margin: 0, letterSpacing: '-0.02em' }}>
                  Room Categories & Inventory Controls
                </h2>
                <p style={{ color: '#737873', fontSize: '0.875rem', marginTop: '4px' }}>
                  Manage nightly pricing, room unit allotments, description, and catalog availability.
                </p>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#294C3A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                + Add New Room Type
              </button>
            </div>

            {roomsLoading ? (
              <LoadingSpinner message="Loading room inventory..." />
            ) : (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E6E0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8F7F3', borderBottom: '1px solid #E7E6E0', color: '#737873', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '12px 16px' }}>Room Category</th>
                      <th style={{ padding: '12px 16px' }}>Capacity</th>
                      <th style={{ padding: '12px 16px' }}>Price / Night</th>
                      <th style={{ padding: '12px 16px' }}>Total Inventory</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => (
                      <tr key={room._id} style={{ borderBottom: '1px solid #E7E6E0' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            {room.imageUrl && (
                              <img
                                src={room.imageUrl}
                                alt={room.name}
                                style={{ width: '56px', height: '42px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E7E6E0' }}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: '#292D2B' }}>{room.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#737873', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {room.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#292D2B' }}>{room.capacity} Guests</td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#B18A52' }}>${room.pricePerNight}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#292D2B' }}>{room.totalInventory} Units</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: room.isActive ? '#f0f4f1' : '#f4f4f2',
                              color: room.isActive ? '#294C3A' : '#737873',
                              border: `1px solid ${room.isActive ? '#d0ded5' : '#E7E6E0'}`,
                            }}
                          >
                            {room.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setEditingRoom(room);
                                setEditForm({
                                  name: room.name,
                                  description: room.description,
                                  capacity: room.capacity,
                                  pricePerNight: room.pricePerNight,
                                  totalInventory: room.totalInventory,
                                  isActive: room.isActive,
                                  imageUrl: room.imageUrl,
                                });
                              }}
                              style={{
                                padding: '6px 14px',
                                backgroundColor: '#F8F7F3',
                                color: '#292D2B',
                                border: '1px solid #E7E6E0',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleRoomStatus(room)}
                              disabled={actionLoading}
                              style={{
                                padding: '6px 14px',
                                backgroundColor: room.isActive ? '#fdf2f2' : '#f0f4f1',
                                color: room.isActive ? '#991b1b' : '#294C3A',
                                border: '1px solid',
                                borderColor: room.isActive ? '#fecaca' : '#d0ded5',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {room.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RESERVATIONS OVERSIGHT */}
        {activeTab === 'reservations' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#292D2B', margin: 0, letterSpacing: '-0.02em' }}>
                  Master Reservations Audit & Oversight
                </h2>
                <p style={{ color: '#737873', fontSize: '0.875rem', marginTop: '4px' }}>
                  Executive inspection of all bookings across all guest accounts and lifecycle statuses.
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Search reference, guest or email..."
                  value={resSearch}
                  onChange={(e) => {
                    setResSearch(e.target.value);
                    setResPage(1);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.875rem',
                    color: '#292D2B',
                    width: '260px',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <select
                  value={resStatus}
                  onChange={(e) => {
                    setResStatus(e.target.value);
                    setResPage(1);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.875rem',
                    color: '#292D2B',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Checked-in">Checked-in</option>
                  <option value="Checked-out">Checked-out</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            {resLoading ? (
              <LoadingSpinner message="Querying master reservations records..." />
            ) : (
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E6E0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8F7F3', borderBottom: '1px solid #E7E6E0', color: '#737873', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '12px 14px' }}>Reference</th>
                      <th style={{ padding: '12px 14px' }}>Guest Name & Email</th>
                      <th style={{ padding: '12px 14px' }}>Room Type</th>
                      <th style={{ padding: '12px 14px' }}>Stay Dates</th>
                      <th style={{ padding: '12px 14px' }}>Rooms / Guests</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((res) => (
                      <tr key={res._id} style={{ borderBottom: '1px solid #E7E6E0' }}>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#294C3A' }}>
                          {res.reservationReference}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#292D2B' }}>{res.guestId?.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#737873' }}>{res.guestId?.email}</div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#292D2B' }}>{res.roomTypeId?.name}</td>
                        <td style={{ padding: '12px 14px', fontSize: '0.8125rem', color: '#737873' }}>
                          {new Date(res.checkIn).toLocaleDateString()} → {new Date(res.checkOut).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#292D2B' }}>
                          {res.roomCount} room(s) · {res.guestCount} guest(s)
                        </td>
                        <td style={{ padding: '12px 14px' }}><StatusBadge status={res.status} /></td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#B18A52' }}>
                          ${res.totalAmount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {resPagination.totalPages > 1 && (
                  <div style={{ padding: '16px' }}>
                    <Pagination pagination={resPagination} onPageChange={(p) => setResPage(p)} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SYSTEM ARCHITECTURE & HEALTH */}
        {activeTab === 'system' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#292D2B', margin: 0, letterSpacing: '-0.02em' }}>
                System Architecture & Database Governance
              </h2>
              <p style={{ color: '#737873', fontSize: '0.875rem', marginTop: '4px' }}>
                Technical infrastructure status, transaction safety mechanisms, and role privileges matrix.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Architecture Spec */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E6E0', padding: '20px', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.04)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#294C3A', marginBottom: '12px' }}>
                  Database Engine & Isolation
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem', lineHeight: 1.8, color: '#292D2B' }}>
                  <li><strong>Cluster:</strong> MongoDB Atlas M0 Replica Set (3 nodes)</li>
                  <li><strong>Database:</strong> <code>hotel_reservation_db</code></li>
                  <li><strong>Transactions:</strong> Multi-document ACID with snapshot isolation</li>
                  <li><strong>Concurrency Lock:</strong> Optimistic version lock with RoomType version increment</li>
                  <li><strong>Anti-Overbooking:</strong> Zero-tolerance guaranteed (1 winner / 4 conflicts verified)</li>
                  <li><strong>Local Isolation:</strong> 100% isolated from local databases</li>
                </ul>
              </div>

              {/* Security & RBAC Spec */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E6E0', padding: '20px', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.04)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#294C3A', marginBottom: '12px' }}>
                  Role-Based Access Control (RBAC)
                </h3>
                <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E7E6E0', textAlign: 'left', color: '#737873' }}>
                      <th style={{ padding: '8px 0' }}>Role</th>
                      <th style={{ padding: '8px 0' }}>Access Scope</th>
                      <th style={{ padding: '8px 0' }}>Primary Portal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #E7E6E0' }}>
                      <td style={{ padding: '8px 0', fontWeight: 700, color: '#294C3A' }}>Guest</td>
                      <td style={{ color: '#292D2B' }}>Browse rooms, search availability, book, cancel own reservations</td>
                      <td style={{ color: '#737873' }}>Agoda-inspired Booking Platform</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E7E6E0' }}>
                      <td style={{ padding: '8px 0', fontWeight: 700, color: '#78866B' }}>Staff</td>
                      <td style={{ color: '#292D2B' }}>Front desk operations, check-in, check-out, occupancy KPIs</td>
                      <td style={{ color: '#737873' }}>Front Desk Operations Portal</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', fontWeight: 700, color: '#B18A52' }}>Admin</td>
                      <td style={{ color: '#292D2B' }}>Complete administrative authority, room inventory pricing, audits</td>
                      <td style={{ color: '#737873' }}>Executive Administration Console</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EDIT ROOM MODAL */}
      {editingRoom && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(41, 76, 58, 0.55)', backdropFilter: 'blur(3px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #E7E6E0' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#294C3A', marginBottom: '16px', letterSpacing: '-0.02em' }}>
              Edit Room Type: {editingRoom.name}
            </h3>

            <form onSubmit={handleUpdateRoomSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                  Room Category Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', color: '#292D2B' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                    Price Per Night ($)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editForm.pricePerNight ?? 100}
                    onChange={(e) => setEditForm({ ...editForm, pricePerNight: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', color: '#292D2B' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                    Total Units (Inventory)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editForm.totalInventory ?? 1}
                    onChange={(e) => setEditForm({ ...editForm, totalInventory: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', color: '#292D2B' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical', color: '#292D2B' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                  Image URL (High-Resolution Photography)
                </label>
                <input
                  type="url"
                  value={editForm.imageUrl || ''}
                  onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', color: '#292D2B' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#F8F7F3', color: '#737873', border: '1px solid #E7E6E0', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#294C3A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer' }}
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(41, 76, 58, 0.55)', backdropFilter: 'blur(3px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #E7E6E0' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#294C3A', marginBottom: '16px', letterSpacing: '-0.02em' }}>
              Add New Hotel Room Category
            </h3>

            <form onSubmit={handleCreateRoomSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                  Room Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oceanfront Premier Suite"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', color: '#292D2B' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                    Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', color: '#292D2B' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                    Price / Night ($)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newRoom.pricePerNight}
                    onChange={(e) => setNewRoom({ ...newRoom, pricePerNight: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', color: '#292D2B' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                    Total Units
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newRoom.totalInventory}
                    onChange={(e) => setNewRoom({ ...newRoom, totalInventory: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', color: '#292D2B' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the room accommodations, furnishings and views..."
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical', color: '#292D2B' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#292D2B', marginBottom: '4px' }}>
                  Image URL (High-Resolution Hotel Photography)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={newRoom.imageUrl || ''}
                  onChange={(e) => setNewRoom({ ...newRoom, imageUrl: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E7E6E0', fontSize: '0.875rem', boxSizing: 'border-box', color: '#292D2B' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#F8F7F3', color: '#737873', border: '1px solid #E7E6E0', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#294C3A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer' }}
                >
                  {actionLoading ? 'Creating...' : 'Create Room Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;

