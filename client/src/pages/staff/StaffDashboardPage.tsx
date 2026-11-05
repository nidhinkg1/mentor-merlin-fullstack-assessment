import React, { useState, useEffect, useCallback } from 'react';
import type { DashboardStats, Reservation, PaginatedResponse, ReservationStatus } from '../../types/index.js';
import { api, ApiError } from '../../services/api.js';
import { StatCard } from '../../components/common/StatCard.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { Pagination } from '../../components/common/Pagination.js';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../../components/common/Feedback.js';

type DashboardTab = 'overview' | 'arrivals' | 'departures' | 'reservations';

export const StaffDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // KPI Stats State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Today's Arrivals State
  const [arrivals, setArrivals] = useState<Reservation[]>([]);
  const [arrivalsLoading, setArrivalsLoading] = useState<boolean>(false);
  const [arrivalsError, setArrivalsError] = useState<string | null>(null);

  // Today's Departures State
  const [departures, setDepartures] = useState<Reservation[]>([]);
  const [departuresLoading, setDeparturesLoading] = useState<boolean>(false);
  const [departuresError, setDeparturesError] = useState<string | null>(null);

  // Front Desk All Reservations State (Paginated & Filterable)
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [resLoading, setResLoading] = useState<boolean>(false);
  const [resError, setResError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('checkIn');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  // Action status / feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await api.get<{ success: boolean; data: DashboardStats }>('/staff/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      setStatsError(err instanceof ApiError ? err.message : 'Failed to load dashboard metrics');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Today's Arrivals
  const fetchArrivals = useCallback(async () => {
    setArrivalsLoading(true);
    setArrivalsError(null);
    try {
      const res = await api.get<PaginatedResponse<Reservation>>('/staff/arrivals?limit=50');
      setArrivals(res.data);
    } catch (err) {
      setArrivalsError(err instanceof ApiError ? err.message : 'Failed to load arrivals list');
    } finally {
      setArrivalsLoading(false);
    }
  }, []);

  // Fetch Today's Departures
  const fetchDepartures = useCallback(async () => {
    setDeparturesLoading(true);
    setDeparturesError(null);
    try {
      const res = await api.get<PaginatedResponse<Reservation>>('/staff/departures?limit=50');
      setDepartures(res.data);
    } catch (err) {
      setDeparturesError(err instanceof ApiError ? err.message : 'Failed to load departures list');
    } finally {
      setDeparturesLoading(false);
    }
  }, []);

  // Fetch Paginated Reservations
  const fetchAllReservations = useCallback(async () => {
    setResLoading(true);
    setResError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });
      if (statusFilter) params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get<PaginatedResponse<Reservation>>(`/staff/reservations?${params.toString()}`);
      setAllReservations(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setResError(err instanceof ApiError ? err.message : 'Failed to load reservations');
    } finally {
      setResLoading(false);
    }
  }, [page, limit, statusFilter, dateFilter, searchQuery, sortBy, sortOrder]);

  // Initial Data Load
  useEffect(() => {
    fetchStats();
    fetchArrivals();
    fetchDepartures();
    fetchAllReservations();
  }, [fetchStats, fetchArrivals, fetchDepartures, fetchAllReservations]);

  // Execute Check-in / Check-out Action
  const handleStatusTransition = async (reservationId: string, newStatus: ReservationStatus) => {
    setActionLoadingId(reservationId);
    setActionSuccess(null);
    try {
      await api.patch<{ success: boolean; message: string }>(`/staff/reservations/${reservationId}/status`, {
        status: newStatus,
      });

      setActionSuccess(`Reservation transitioned to '${newStatus}' successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);

      // Refresh all views
      fetchStats();
      fetchArrivals();
      fetchDepartures();
      fetchAllReservations();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to update reservation status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  return (
    <div style={{ backgroundColor: '#F8F7F3', minHeight: 'calc(100vh - 66px)', padding: '32px 20px 60px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#292D2B', margin: 0, letterSpacing: '-0.025em' }}>
              Front Desk & Operations Terminal
            </h1>
            <p style={{ color: '#737873', fontSize: '0.9375rem', marginTop: '6px' }}>
              Real-time room occupancy, daily arrivals, departures, and operational check-in/out workflows.
            </p>
          </div>
          <button
            onClick={() => {
              fetchStats();
              fetchArrivals();
              fetchDepartures();
              fetchAllReservations();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E7E6E0',
              color: '#292D2B',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(41, 45, 43, 0.04)',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f4f3ef')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            ↻ Refresh Operations Data
          </button>
        </div>

        {actionSuccess && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            ✓ {actionSuccess}
          </div>
        )}

        {/* KPI Section */}
        {statsLoading ? (
          <LoadingSpinner message="Calculating real-time hotel metrics..." />
        ) : statsError ? (
          <ErrorMessage message={statsError} onRetry={fetchStats} />
        ) : stats ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <StatCard
              title="Total Room Inventory"
              value={stats.totalRoomInventory}
              subtitle="Across active room types"
              variant="primary"
            />
            <StatCard
              title="Occupied Rooms"
              value={stats.occupiedRooms}
              subtitle={`${stats.occupancyRate}% occupancy`}
              variant="accent"
            />
            <StatCard
              title="Available Rooms"
              value={stats.availableRooms}
              subtitle="Ready for booking"
              variant="secondary"
            />
            <StatCard
              title="Occupancy Rate"
              value={`${stats.occupancyRate}%`}
              subtitle="Current live occupancy"
              variant="primary"
            />
            <StatCard
              title="Today's Arrivals"
              value={stats.todayArrivalsCount}
              subtitle="Scheduled check-ins"
              variant="accent"
            />
            <StatCard
              title="Today's Departures"
              value={stats.todayDeparturesCount}
              subtitle="Scheduled check-outs"
              variant="neutral"
            />
          </div>
        ) : null}

        {/* Tab Navigation */}
        <div className="subnav-tabs" style={{ borderBottom: '1px solid #E7E6E0', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '0.875rem',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #294C3A' : '2px solid transparent',
              color: activeTab === 'overview' ? '#294C3A' : '#737873',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Operations Overview
          </button>
          <button
            onClick={() => setActiveTab('arrivals')}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '0.875rem',
              border: 'none',
              borderBottom: activeTab === 'arrivals' ? '2px solid #294C3A' : '2px solid transparent',
              color: activeTab === 'arrivals' ? '#294C3A' : '#737873',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Today's Arrivals ({stats?.todayArrivalsCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('departures')}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '0.875rem',
              border: 'none',
              borderBottom: activeTab === 'departures' ? '2px solid #294C3A' : '2px solid transparent',
              color: activeTab === 'departures' ? '#294C3A' : '#737873',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Today's Departures ({stats?.todayDeparturesCount || 0})
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: '0.875rem',
              border: 'none',
              borderBottom: activeTab === 'reservations' ? '2px solid #294C3A' : '2px solid transparent',
              color: activeTab === 'reservations' ? '#294C3A' : '#737873',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Front Desk Master Register
          </button>
        </div>

        {/* TAB CONTENT: Overview (Arrivals & Departures Split View) */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '24px' }}>
            {/* Quick Arrivals Panel */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E6E0', padding: '20px', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#292D2B', margin: 0 }}>
                  Today's Scheduled Arrivals
                </h2>
                <span style={{ fontSize: '0.6875rem', backgroundColor: '#faf5ed', color: '#B18A52', border: '1px solid #ebdcc5', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {arrivals.length} Guest(s)
                </span>
              </div>
              {arrivalsError && <ErrorMessage message={arrivalsError} />}
              {arrivalsLoading ? (
                <LoadingSpinner message="Querying arrivals..." />
              ) : arrivals.length === 0 ? (
                <EmptyState title="No Arrivals Scheduled for Today" description="All confirmed guests for today have arrived or no new check-ins are scheduled." />
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E7E6E0', color: '#737873', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '8px' }}>Reference</th>
                        <th style={{ padding: '8px' }}>Guest</th>
                        <th style={{ padding: '8px' }}>Room</th>
                        <th style={{ padding: '8px' }}>Status</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrivals.map((res) => (
                        <tr key={res._id} style={{ borderBottom: '1px solid #F8F7F3' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 700, color: '#294C3A', fontFamily: 'monospace' }}>{res.reservationReference}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ fontWeight: 600, color: '#292D2B' }}>{res.guestId?.name || 'Guest'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#737873' }}>{res.guestId?.email}</div>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ fontWeight: 500, color: '#292D2B' }}>{res.roomTypeId?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#737873' }}>{res.roomCount} room(s) · {res.guestCount} guest(s)</div>
                          </td>
                          <td style={{ padding: '10px 8px' }}><StatusBadge status={res.status} /></td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {res.status === 'Confirmed' && (
                              <button
                                onClick={() => handleStatusTransition(res._id, 'Checked-in')}
                                disabled={actionLoadingId === res._id}
                                style={{
                                  padding: '5px 12px',
                                  backgroundColor: '#294C3A',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {actionLoadingId === res._id ? 'Updating...' : 'Check In'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Departures Panel */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E6E0', padding: '20px', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#292D2B', margin: 0 }}>
                  Today's Scheduled Departures
                </h2>
                <span style={{ fontSize: '0.6875rem', backgroundColor: '#F8F7F3', color: '#737873', border: '1px solid #E7E6E0', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {departures.length} Guest(s)
                </span>
              </div>
              {departuresError && <ErrorMessage message={departuresError} />}
              {departuresLoading ? (
                <LoadingSpinner message="Querying departures..." />
              ) : departures.length === 0 ? (
                <EmptyState title="No Departures Scheduled for Today" description="No guests are due to check out on today's business date." />
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E7E6E0', color: '#737873', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '8px' }}>Reference</th>
                        <th style={{ padding: '8px' }}>Guest</th>
                        <th style={{ padding: '8px' }}>Room</th>
                        <th style={{ padding: '8px' }}>Status</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departures.map((res) => (
                        <tr key={res._id} style={{ borderBottom: '1px solid #F8F7F3' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 700, color: '#292D2B', fontFamily: 'monospace' }}>{res.reservationReference}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ fontWeight: 600, color: '#292D2B' }}>{res.guestId?.name || 'Guest'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#737873' }}>{res.guestId?.email}</div>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ fontWeight: 500, color: '#292D2B' }}>{res.roomTypeId?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#737873' }}>{res.roomCount} room(s)</div>
                          </td>
                          <td style={{ padding: '10px 8px' }}><StatusBadge status={res.status} /></td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                            {res.status === 'Checked-in' && (
                              <button
                                onClick={() => handleStatusTransition(res._id, 'Checked-out')}
                                disabled={actionLoadingId === res._id}
                                style={{
                                  padding: '5px 12px',
                                  backgroundColor: '#78866B', // Muted Olive
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {actionLoadingId === res._id ? 'Updating...' : 'Check Out'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: Front Desk Master Register (Paginated & Filterable) */}
        {(activeTab === 'reservations' || activeTab === 'arrivals' || activeTab === 'departures') && (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E7E6E0', padding: '20px', boxShadow: '0 1px 3px rgba(41, 45, 43, 0.03)' }}>
            {/* Controls Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ flex: '1 1 240px' }}>
                <input
                  type="text"
                  placeholder="Search reference, guest name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.8125rem',
                    boxSizing: 'border-box',
                    color: '#292D2B',
                  }}
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.8125rem',
                    backgroundColor: '#FFFFFF',
                    color: '#292D2B',
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
              <div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.8125rem',
                    color: '#292D2B',
                  }}
                />
              </div>
              <div>
                <select
                  value={`${sortBy}:${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split(':');
                    setSortBy(field || 'checkIn');
                    setSortOrder(order || 'asc');
                    setPage(1);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    fontSize: '0.8125rem',
                    backgroundColor: '#FFFFFF',
                    color: '#292D2B',
                  }}
                >
                  <option value="checkIn:asc">Check-in: Earliest First</option>
                  <option value="checkIn:desc">Check-in: Latest First</option>
                  <option value="checkOut:asc">Check-out: Earliest First</option>
                  <option value="createdAt:desc">Created: Newest First</option>
                  <option value="totalAmount:desc">Price: Highest First</option>
                </select>
              </div>
              {(statusFilter || dateFilter || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setDateFilter('');
                    setSearchQuery('');
                    setPage(1);
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E7E6E0',
                    backgroundColor: '#F8F7F3',
                    color: '#737873',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Table */}
            {resLoading ? (
              <LoadingSpinner message="Querying reservations register..." />
            ) : resError ? (
              <ErrorMessage message={resError} onRetry={fetchAllReservations} />
            ) : allReservations.length === 0 ? (
              <EmptyState
                title="No Reservations Found"
                description="No records match your active search or filtering parameters."
                actionLabel="Reset All Filters"
                onAction={() => {
                  setStatusFilter('');
                  setDateFilter('');
                  setSearchQuery('');
                  setPage(1);
                }}
              />
            ) : (
              <div className="table-responsive" style={{ border: '1px solid #E7E6E0', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#F8F7F3', borderBottom: '1px solid #E7E6E0', color: '#737873', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>Reference</th>
                      <th style={{ padding: '10px 14px' }}>Guest Details</th>
                      <th style={{ padding: '10px 14px' }}>Room Category</th>
                      <th style={{ padding: '10px 14px' }}>Stay Duration</th>
                      <th style={{ padding: '10px 14px' }}>Configuration</th>
                      <th style={{ padding: '10px 14px' }}>Total Amount</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Front Desk Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allReservations.map((res) => (
                      <tr key={res._id} style={{ borderBottom: '1px solid #F8F7F3' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#294C3A', fontFamily: 'monospace' }}>
                          {res.reservationReference}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#292D2B' }}>{res.guestId?.name || 'Guest'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#737873' }}>{res.guestId?.email}</div>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 500, color: '#292D2B' }}>
                          {res.roomTypeId?.name}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '0.75rem' }}>
                          <div style={{ color: '#292D2B', fontWeight: 600 }}>{formatDate(res.checkIn)}</div>
                          <div style={{ color: '#737873' }}>to {formatDate(res.checkOut)}</div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#292D2B' }}>
                          <span style={{ fontWeight: 600 }}>{res.roomCount}</span> room(s) · {res.guestCount} guest(s)
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#292D2B' }}>
                          ${res.totalAmount}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <StatusBadge status={res.status} />
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {res.status === 'Confirmed' && (
                            <button
                              onClick={() => handleStatusTransition(res._id, 'Checked-in')}
                              disabled={actionLoadingId === res._id}
                              style={{
                                padding: '5px 12px',
                                backgroundColor: '#294C3A', // Deep Forest Green
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {actionLoadingId === res._id ? '...' : 'Check In'}
                            </button>
                          )}
                          {res.status === 'Checked-in' && (
                            <button
                              onClick={() => handleStatusTransition(res._id, 'Checked-out')}
                              disabled={actionLoadingId === res._id}
                              style={{
                                padding: '5px 12px',
                                backgroundColor: '#78866B', // Muted Olive
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {actionLoadingId === res._id ? '...' : 'Check Out'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboardPage;
