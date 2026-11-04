export type UserRole = 'guest' | 'staff' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface RoomType {
  _id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number;
  totalInventory: number;
  facilities: string[];
  isActive: boolean;
  imageUrl?: string;
}

export interface CreateRoomInput {
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number;
  totalInventory: number;
  facilities: string[];
  isActive?: boolean;
  imageUrl?: string;
}

export interface UpdateRoomInput {
  name?: string;
  description?: string;
  capacity?: number;
  pricePerNight?: number;
  totalInventory?: number;
  facilities?: string[];
  isActive?: boolean;
  imageUrl?: string;
}

export type ReservationStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Checked-in'
  | 'Checked-out'
  | 'Cancelled';

export interface Reservation {
  _id: string;
  reservationReference: string;
  guestId: {
    _id: string;
    name: string;
    email: string;
  };
  roomTypeId: {
    _id: string;
    name: string;
    capacity: number;
    pricePerNight?: number;
    facilities?: string[];
  };
  checkIn: string;
  checkOut: string;
  roomCount: number;
  guestCount: number;
  pricePerNightSnapshot: number;
  totalAmount: number;
  status: ReservationStatus;
  specialRequests?: string;
  createdAt: string;
}

export interface AvailableRoomResult {
  roomType: RoomType;
  availableCount: number;
  nights: number;
  pricePerNight: number;
  totalAmount: number;
}

export interface AvailabilitySearchResponse {
  success: boolean;
  dateRange: {
    checkIn: string;
    checkOut: string;
    nights: number;
  };
  searchParams: {
    guestCount: number;
    roomCount: number;
  };
  data: AvailableRoomResult[];
  count: number;
}

export interface CreateBookingRequest {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  roomCount: number;
  guestCount: number;
  specialRequests?: string;
}

export interface DashboardStats {
  totalRoomInventory: number;
  occupiedRooms: number;
  availableRooms: number;
  todayArrivalsCount: number;
  todayDeparturesCount: number;
  pendingReservationsCount: number;
  occupancyRate: number;
  businessDate: string;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMetadata;
}

