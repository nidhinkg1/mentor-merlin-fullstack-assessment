# Mentor Merlin – Hotel Reservation & Front Desk Management System

A production-grade, mid-level MERN stack application built with strict **TypeScript**, **Node.js**, **Express**, **MongoDB** (ACID multi-document transactions), and **React** (Vite). 

The platform delivers three distinct, role-tailored experiences:
1. **Guest Booking Experience** (Agoda-inspired commercial hotel booking portal)
2. **Staff Front Desk Operations** (High-density administrative terminal for arrivals, departures, check-in, and check-out)
3. **Executive Hotel Administration** (Inventory management, dynamic pricing controls, and master reservation audits)

---

## 1. Architecture Overview

The repository is organized as a clean TypeScript monorepo with strict separation of concerns:

```text
mentor-merlin-fullstack-assessment/
├── client/                     # React 19 + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, StatCard, StatusBadge, Pagination, BookingModal)
│   │   ├── context/            # AuthContext (JWT session restoration, RBAC state)
│   │   ├── pages/
│   │   │   ├── guest/          # RoomDiscoveryPage (Agoda-style), MyReservationsPage
│   │   │   ├── staff/          # StaffDashboardPage (Front Desk Terminal)
│   │   │   ├── admin/          # AdminDashboardPage (Executive Management)
│   │   │   └── auth/           # LoginPage, RegisterPage
│   │   ├── services/           # Typed REST API client (`api.ts`)
│   │   └── types/              # Domain entities and API contracts
├── server/                     # Node.js + Express + TypeScript backend
│   ├── src/
│   │   ├── config/             # Database connection (Atlas replica set) and environment loader
│   │   ├── controllers/        # Request handlers (auth, room, reservation, staff)
│   │   ├── errors/             # AppError hierarchy (BadRequest, NotFound, Conflict, Forbidden)
│   │   ├── middleware/         # Auth, RBAC authorization, and global error middleware
│   │   ├── models/             # Mongoose schemas (User, RoomType, Reservation)
│   │   ├── routes/             # REST endpoints (/auth, /rooms, /availability, /reservations, /staff)
│   │   ├── scripts/            # Database seeder and automated test suites
│   │   ├── services/           # Core domain logic (bookingService, availabilityService)
│   │   └── utils/              # Date interval math (dateUtils), JWT tokens, passwords
└── package.json                # Monorepo orchestration scripts
```

---

## 2. Essential Data Models & Schema Design

### A. User Model (`User.ts`)
* `name`: String, required.
* `email`: String, required, unique, lowercase, trimmed.
* `passwordHash`: String, required, bcrypt hashed with 10 salt rounds.
* `role`: Enum (`'guest' | 'staff' | 'admin'`), default: `'guest'`.
* **Indexes**: Unique index on `email`.

### B. RoomType Model (`RoomType.ts`)
* `name`: String, required, unique, trimmed.
* `description`: String, required.
* `capacity`: Number, positive integer, required.
* `pricePerNight`: Number, positive float, required.
* `totalInventory`: Number, non-negative integer, required.
* `facilities`: Array of strings (amenities).
* `isActive`: Boolean, default: `true`.
* `imageUrl`: String (high-resolution hotel photography).
* `version`: Number, default: `0` (used for optimistic concurrency locking).
* **Indexes**: Compound index on `{ isActive: 1, pricePerNight: 1 }`.

### C. Reservation Model (`Reservation.ts`)
* `reservationReference`: String, unique format `MM-YYYY-XXXXXX`.
* `guestId`: ObjectId referencing `User`, required.
* `roomTypeId`: ObjectId referencing `RoomType`, required.
* `checkIn`: Date, normalized to UTC midnight, required.
* `checkOut`: Date, normalized to UTC midnight, strictly `> checkIn`.
* `roomCount`: Number, positive integer, default: `1`.
* `guestCount`: Number, positive integer, validated against `capacity * roomCount`.
* `pricePerNightSnapshot`: Number, immutable server price snapshot at booking time.
* `totalAmount`: Number, server-calculated `nights * pricePerNightSnapshot * roomCount`.
* `status`: Enum (`'Pending' | 'Confirmed' | 'Checked-in' | 'Checked-out' | 'Cancelled'`).
* `specialRequests`: String, optional.
* **Indexes**:
  * Unique index on `reservationReference`.
  * Index on `guestId` for fast guest history lookups.
  * Compound index on `{ roomTypeId: 1, status: 1, checkIn: 1, checkOut: 1 }` for night-by-night availability scans.

---

## 3. Simultaneous Bookings & Concurrency Strategy (PDF Section 7)

A simple *"check availability, then insert reservation"* strategy creates severe race conditions when multiple guests attempt to book the final available room for overlapping dates at the exact same millisecond.

### Concurrency Guarantees & Implementation:
1. **MongoDB Multi-Document ACID Transactions**:
   All booking creation happens inside a MongoDB session transaction with `readConcern: { level: 'snapshot' }` and `writeConcern: { level: 'majority' }`.
2. **Night-by-Night Inventory Accounting**:
   Within the transaction, the engine computes overlapping active reservations (`Pending`, `Confirmed`, `Checked-in`) across each discrete calendar night $[ \text{checkIn}, \text{checkOut} )$. The minimum available units across any night must satisfy the requested `roomCount`.
3. **Atomic Version Increment (Optimistic Conflict Detection)**:
   The transaction atomically updates the `RoomType` version field:
   ```typescript
   const updatedRoom = await RoomType.findOneAndUpdate(
     { _id: roomTypeId, version: currentVersion },
     { $inc: { version: 1 } },
     { session, new: true }
   );
   ```
   If a concurrent transaction commits first, the version check fails, causing a MongoDB `WriteConflict` or version mismatch.
4. **Transient Error Retry Backoff**:
   Transient transaction errors (`TransientTransactionError`, `WriteConflict`) trigger an exponential backoff retry loop (up to 3 attempts with random jitter) to safely handle high contention.
5. **Commit Retry Helper (`commitWithRetry`)**:
   Handles `UnknownTransactionCommitResult` error labels by retrying `commitTransaction()` on the same session without re-executing the booking logic, avoiding duplicate reservations.
6. **Losing Request Outcome**:
   Requests that cannot be fulfilled receive an explicit `HTTP 409 Conflict` response with an explanatory message:
   `"Insufficient room inventory: only 0 room(s) available for the selected dates, but 1 requested"`.

> **Automated Race Test Proof**: Tested by firing 5 simultaneous concurrent booking requests from separate clients for 1 remaining room inventory (`npm run verify:stage4`). The system produced **exactly 1 HTTP 201 Created winner** and **exactly 4 HTTP 409 Conflict losers**, resulting in **100% zero-overbooking**.

---

## 4. Server-Side Pagination & API Contracts (PDF Section 6)

In strict compliance with assessment requirements, **client-side pagination is forbidden for unbounded lists**. All reservation lists are paginated on the database level using `skip` and `limit`.

### Paginated Endpoint Contract (`GET /api/staff/reservations`, `GET /api/reservations/my`):
* **Query Parameters**:
  * `page`: Integer $\ge 1$ (default: `1`).
  * `limit`: Integer between `1` and `50` (default: `10`).
  * `search`: String (searches across reservation reference, guest name, and guest email using regex).
  * `status`: Filter by enum (`'Confirmed' | 'Checked-in' | 'Checked-out' | 'Cancelled' | 'Pending'`).
  * `sortBy`: Sort field (`'createdAt' | 'checkIn' | 'checkOut' | 'totalAmount'`).
  * `sortOrder`: Direction (`'asc' | 'desc'`).
* **Response Payload Format**:
  ```json
  {
    "success": true,
    "data": [ /* Array of Reservation objects */ ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
  ```

---

## 5. Required Reservation Business Rules

1. **Date Validation**:
   * Check-in cannot be in the past (`checkIn < today` rejected with `HTTP 400`).
   * Check-out must be strictly after check-in (`checkOut <= checkIn` rejected with `HTTP 400`).
   * Maximum stay duration capped at 30 consecutive nights.
2. **Server-Authoritative Pricing**:
   * Total price and nightly snapshots are computed **strictly on the backend**.
   * Client-supplied `totalAmount` or `pricePerNight` values are completely ignored.
3. **Capacity Constraints**:
   * Total guests must not exceed `roomType.capacity * roomCount`.
4. **Lifecycle Transitions**:
   * Allowed transitions:
     * `Pending` $\rightarrow$ `Confirmed`, `Cancelled`
     * `Confirmed` $\rightarrow$ `Checked-in`, `Cancelled`
     * `Checked-in` $\rightarrow$ `Checked-out`
     * `Checked-out` $\rightarrow$ Terminal (no transitions)
     * `Cancelled` $\rightarrow$ Terminal (no transitions)
   * Disallowed transitions (e.g., `Checked-out` $\rightarrow$ `Checked-in`, or `Cancelled` $\rightarrow$ `Confirmed`) are rejected with `HTTP 400 Bad Request`.
5. **Data Ownership Isolation**:
   * Guests can only view and cancel their own bookings (`GET /api/reservations/:id` verifies `reservation.guestId === req.user.id`).
   * Unauthorized cross-guest access is rejected with `HTTP 403 Forbidden`.

---

## 6. Quick Start & Setup Instructions

### Prerequisites
* **Node.js**: v18.0.0 or higher (Tested on Node.js v22)
* **MongoDB**: MongoDB Atlas Replica Set or local MongoDB Replica Set (replica set required for multi-document ACID transactions)

### Installation
Clone the repository and install dependencies at the monorepo root:
```bash
npm install
```

### Environment Configuration
The server reads environment variables from `server/.env`. A template is provided in `server/.env.example`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hotel_reservation_db?retryWrites=true&w=majority
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=development_jwt_secret_mentor_merlin_assessment_2026
JWT_EXPIRES_IN=7d
```

### Seed the Database
Populate the database with demo accounts and room categories:
```bash
npm run seed
```

### Start Development Servers
Run backend and frontend concurrently:
```bash
npm run dev
```
* **Frontend Web App**: `http://localhost:5173/`
* **Backend REST API**: `http://localhost:5000/api`
* **Health Check Endpoint**: `http://localhost:5000/api/health`

---

## 7. Pre-Seeded Demo Credentials

All accounts share the standard password: `Password@123`

| Role | Email Address | Password | Portal & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Guest** | `guest@hotel.com` | `Password@123` | **Guest Portal** (`/`): Search rooms, book stays, view personal history, cancel reservations |
| **Hotel Staff** | `staff@hotel.com` | `Password@123` | **Front Desk Operations** (`/staff/dashboard`): Today's Arrivals & Departures manifests, 1-click Check-in / Check-out, Occupancy KPIs |
| **Administrator** | `admin@hotel.com` | `Password@123` | **Executive Console** (`/admin/dashboard`): Room category pricing, inventory unit controls, activation toggling, and master audits |

> **Convenience Feature**: On the **[Sign In Page](http://localhost:5173/login)**, 1-click buttons (**Demo Guest**, **Demo Staff**, **Demo Admin**) are provided for instant evaluation.

---

## 8. Automated Verification & Testing Suites (PDF Section 9)

Three dedicated test suites exercise all critical business logic against a real MongoDB replica set with automatic cleanup:

### 1. Stage 4: Booking & Concurrency Engine
```bash
npm run verify:stage4 --prefix server
```
* **Coverage**: Date range validation, past date rejection, server price calculation, snapshot locking, capacity enforcement, multi-room bookings, sold-out rejection, guest data isolation, double-cancellation prevention, and the **5-client simultaneous booking race test**.

### 2. Stage 5: Staff Front Desk & Operations
```bash
npm run verify:stage5 --prefix server
```
* **Coverage**: RBAC route protection, dynamic room-unit occupancy calculations, today's arrivals query, today's departures query, search/pagination, and status transitions.

### 3. Stage 6: Guest Journey & Security Boundaries
```bash
npm run verify:stage6 --prefix server
```
* **Coverage**: Guest registration, login, room catalog discovery, live availability calculations, price tampering resistance, guest history retrieval, cross-guest data isolation, cancellation, and staff route protection.

### Full Monorepo Build Check
```bash
npm run build
```
Compiles both backend (`server: tsc`) and frontend (`client: vite build`) with zero errors.

---

## 9. Production Engineering & Scalability (PDF Section 8)

### Stateless Architecture
* The API uses stateless JWT authentication. No session state or booking progress is held in server memory. Multiple backend instances can run horizontally behind an NGINX, AWS ALB, or Cloudflare load balancer.

### Database Scaling & Performance
* **Connection Pooling**: Mongoose maintains a managed pool of connections (`maxPoolSize: 50`) to reuse connections efficiently under load.
* **Indexes**: Compound index on `{ roomTypeId: 1, status: 1, checkIn: 1, checkOut: 1 }` avoids collection scans during availability checks. Unique index on `reservationReference` prevents duplicates.
* **Caching Strategy**: Room catalog metadata (`GET /api/rooms`) can be cached in Redis with TTLs or invalidated upon room modification. Real-time availability (`/availability/search`) is computed against the database to prevent stale inventory reads.

### Failure Handling & Mitigations
* **Write Conflicts & Deadlocks**: Bounded exponential retries (up to 3 attempts) mitigate transient write conflicts during high-volume booking rushes.
* **Graceful Shutdown**: The server listens to `SIGINT` and `SIGTERM` signals to cleanly close HTTP listeners and MongoDB connections before process exit.

---

## 10. AI Tools Disclosure (PDF Section 11 & 12)

In accordance with Section 11 & 12 of the assessment instructions:
* **Tools Used**: Google Antigravity (Advanced Agentic Coding Assistant).
* **Scope of Assistance**:
  * Scaffolding boilerplate configurations and initial project structure.
  * Assisting with automated verification test script writing (`verifyStage4.ts`, `verifyStage5.ts`, `verifyStage6.ts`).
  * Assisting with Vite CSS layout refinements and TypeScript interface typing.
* **Independent Understanding**: All architectural decisions, multi-document ACID transaction mechanics, version locking formulas, date interval math, RBAC middleware, and business logic are fully understood, explained, and verified by the candidate.

