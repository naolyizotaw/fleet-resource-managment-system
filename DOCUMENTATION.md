# 📚 Fleet Management System - Complete Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Models & Schema](#database-models--schema)
5. [Backend API Documentation](#backend-api-documentation)
6. [Frontend Structure](#frontend-structure)
7. [Authentication & Authorization](#authentication--authorization)
8. [Key Features & Workflows](#key-features--workflows)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Setup & Deployment](#setup--deployment)
11. [Security Features](#security-features)
12. [Responsive Design](#responsive-design)
13. [Design System](#design-system)
14. [Error Handling](#error-handling)
15. [Export & Reporting](#export--reporting)
16. [Future Enhancements](#future-enhancements)

---

## 🎯 System Overview

**Fleet Management System** is a full-stack web application designed to manage vehicle fleets, track maintenance, fuel requests, per diem allowances, trip logs, and company news/events.

### Purpose

- Centralized fleet operations management
- Request/approval workflows for maintenance, fuel, and per diem
- Real-time vehicle tracking and service alerts
- Role-based access control (Admin, Manager, Driver)
- Automated notifications and news distribution

### Users

- **Admin**: Full system access, user management, all approvals
- **Manager**: Fleet oversight, approvals, reports
- **Driver (User)**: Submit requests, log trips, view personal data

---

## 🛠️ Technology Stack

### Backend

```json
{
  "runtime": "Node.js",
  "framework": "Express.js v5.1.0",
  "database": "MongoDB (Mongoose v8.17.0)",
  "authentication": "JWT (jsonwebtoken v9.0.2)",
  "password": "bcryptjs v3.0.2",
  "cors": "cors v2.8.5",
  "environment": "dotenv v17.2.1"
}
```

### Frontend

```json
{
  "library": "React v18.2.0",
  "routing": "React Router DOM v6.3.0",
  "styling": "Tailwind CSS v3.2.7",
  "http": "Axios v1.3.4",
  "icons": "Lucide React v0.263.1",
  "charts": "Recharts v2.5.0",
  "notifications": "React Hot Toast v2.4.0",
  "exports": "XLSX v0.18.5",
  "dates": "date-fns v2.29.3"
}
```

### Development Tools

- **Backend**: Nodemon (auto-reload)
- **Frontend**: Create React App, PostCSS, Autoprefixer

---

## 🏗️ System Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────┐
│           PRESENTATION LAYER (Frontend)          │
│  React SPA + Tailwind CSS + React Router        │
│  Port: 3000                                      │
└────────────────┬────────────────────────────────┘
                 │ HTTP/REST API
                 │ JWT Token Auth
┌────────────────▼────────────────────────────────┐
│          APPLICATION LAYER (Backend)             │
│  Express.js REST API + Middleware               │
│  Port: 7001/7002                                 │
└────────────────┬────────────────────────────────┘
                 │ Mongoose ODM
                 │
┌────────────────▼────────────────────────────────┐
│            DATA LAYER (Database)                 │
│  MongoDB (NoSQL Document Database)              │
└─────────────────────────────────────────────────┘
```

### Backend Structure

```
backend/src/
├── config/
│   ├── dbConnect.js          # MongoDB connection
│   └── categoryOption.js     # Maintenance categories
├── controllers/              # Business logic
│   ├── authController.js     # Login, register, password
│   ├── vehicleController.js  # Vehicle CRUD
│   ├── maintenanceController.js
│   ├── fuelController.js
│   ├── perDiemController.js
│   ├── logController.js
│   ├── notificationController.js
│   └── newsController.js
├── middlewares/
│   ├── authMiddleware.js     # JWT verification
│   └── roleMiddleware.js     # Role-based access
├── models/                   # Mongoose schemas
│   ├── userModel.js
│   ├── vehicleModel.js
│   ├── maintenanceRequest.js
│   ├── fuelRequest.js
│   ├── perDiemRequest.js
│   ├── logModel.js
│   ├── notification.js
│   └── newsModel.js
├── routes/                   # API endpoints
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── vehicleRoutes.js
│   ├── maintenanceRoutes.js
│   ├── fuelRoutes.js
│   ├── perDiemRoutes.js
│   ├── logRoutes.js
│   ├── notificationRoutes.js
│   └── newsRoutes.js
└── server.js                 # Entry point
```

### Frontend Structure

```
frontend/src/
├── components/
│   ├── Layout.js            # Main layout + sidebar + header
│   └── ProtectedRoute.js    # Route guards
├── contexts/
│   ├── AuthContext.js       # Global auth state
│   └── ThemeContext.js      # Theme preferences
├── pages/                   # Route components
│   ├── Landing.js           # Public landing page
│   ├── Login.js             # Authentication
│   ├── Register.js          # User registration
│   ├── Dashboard.js         # Main dashboard
│   ├── Users.js             # User management (admin)
│   ├── Vehicles.js          # Fleet management
│   ├── Maintenance.js       # Maintenance requests
│   ├── Fuel.js              # Fuel requests
│   ├── PerDiem.js           # Per diem requests
│   ├── Logs.js              # Trip logs
│   ├── Reports.js           # Analytics & charts
│   ├── News.js              # News & events
│   └── Settings.js          # User profile
├── services/
│   └── api.js               # Axios instance + API calls
├── App.js                   # Router configuration
└── index.js                 # React entry point
```

---

## 💾 Database Models & Schema

### 1. User Model

```javascript
{
  fullName: String (required),
  username: String (required, unique),
  password: String (required, hashed with bcrypt),
  email: String (unique, sparse),
  phone: String,
  gender: Enum ['male', 'female', 'other'],
  department: String,
  role: Enum ['admin', 'manager', 'user'] (required),
  status: Enum ['active', 'inactive', 'pending', 'suspended'],
  createdAt: Date (auto),
  timestamps: true
}
```

**Business Rules:**
- Username must be unique
- Email is unique but optional (sparse index)
- Passwords are hashed with bcrypt (10 rounds)
- Role determines access permissions
- `user` role = driver

### 2. Vehicle Model

```javascript
{
  plateNumber: String (required, unique),
  type: Enum ['Automobile', 'Light Duty', 'Heavy Duty', 'Machinery', 'Other'],
  model: String (required),
  manufacturer: String,
  year: Number,
  fuelType: Enum ['Petrol', 'Diesel', 'Electric', 'Hybrid'] (required),
  currentKm: Number (required),
  serviceIntervalKm: Number (default: 5000),
  previousServiceKm: Number (default: 0),
  initialKm: Number (auto-set on creation),
  assignedDriver: ObjectId ref User (unique, sparse),
  status: Enum ['active', 'under_maintenance', 'inactive'],
  maintenanceHistory: Array,
  serviceHistory: Array [{km, date, notes, performedBy}],
  timestamps: true
}
```

**Virtual Fields:**
```javascript
serviceInfo: {
  lastServiceKm: Number,
  nextServiceKm: Number,
  kilometersUntilNextService: Number,
  servicesDue: Number
}
```

**Business Rules:**
- One driver per vehicle (enforced by unique sparse index)
- `initialKm` auto-populated from `currentKm` on creation
- Service calculations based on: `nextService = previousServiceKm + serviceIntervalKm`
- Virtual `serviceInfo` calculated in real-time

### 3. Maintenance Request Model

```javascript
{
  vehicleId: ObjectId ref Vehicle (required),
  driverId: ObjectId ref User,
  category: Enum ['Engine', 'Tires & Wheels', 'Brakes', 'Service', 
                   'Electrical', 'Cargo', 'Machinery', 'Other'],
  serviceKm: Number (for Service category),
  priority: Enum ['low', 'medium', 'high'],
  description: String (required),
  status: Enum ['pending', 'approved', 'rejected', 'completed'],
  requestedBy: ObjectId ref User (required),
  requestedDate: Date (auto),
  approvedBy: ObjectId ref User,
  approvedDate: Date,
  completedDate: Date,
  cost: Number,
  remarks: String,
  timestamps: true
}
```

**Business Rules:**
- Only one pending/approved request per vehicle+category combination
- Conflict detection returns existing request ID
- Notifications sent to requester and all admins/managers

### 4. Fuel Request Model

```javascript
{
  vehicleId: ObjectId ref Vehicle (required),
  driverId: ObjectId ref User (required),
  requestedBy: ObjectId ref User (required),
  fuelType: Enum ['petrol', 'diesel', 'electric'] (required),
  quantity: Number (required),
  pricePerLitre: Number,
  currentKm: Number (required),
  purpose: String,
  status: Enum ['pending', 'approved', 'rejected'],
  approvedBy: ObjectId ref User,
  cost: Number (auto-calculated),
  issuedDate: Date,
  createdAt: Date (auto)
}
```

**Auto-Calculation:**
- `cost = quantity × pricePerLitre` (pre-save hook)

### 5. Per Diem Request Model

```javascript
{
  vehicleId: ObjectId ref Vehicle,
  driverId: ObjectId ref User (required),
  requestedBy: ObjectId ref User (required),
  purpose: String (required),
  destination: String (required),
  startDate: Date (required),
  endDate: Date (required),
  numberOfDays: Number (required),
  calculatedAmount: Number,
  approvedAmount: Number,
  status: Enum ['pending', 'approved', 'rejected'],
  approvedBy: ObjectId ref User,
  issuedDate: Date,
  timestamps: true
}
```

### 6. Driver Log Model

```javascript
{
  driverId: ObjectId ref User (required),
  vehicleId: ObjectId ref Vehicle (required),
  date: Date (default: now),
  dateKey: String (auto, YYYY-MM-DD),
  startKm: Number (required),
  endKm: Number (required),
  distance: Number (auto-calculated),
  loggedBy: ObjectId ref User,
  remarks: String,
  isEditable: Boolean (default: true),
  timestamps: true
}
```

**Unique Constraint:**
- One log per vehicle per day (enforced by compound index on `vehicleId + dateKey`)

### 7. News Model

```javascript
{
  title: String (required),
  content: String (required),
  type: Enum ['announcement', 'employee', 'event', 'achievement', 'general'],
  eventDate: Date (required if type='event'),
  priority: Enum ['low', 'medium', 'high'],
  isActive: Boolean (default: true),
  createdBy: ObjectId ref User (required),
  timestamps: true
}
```

**Auto-Creation:**
- Employee news posts created automatically when new users are registered

### 8. Notification Model

```javascript
{
  user: ObjectId ref User (required),
  type: Enum ['maintenance', 'fuel', 'perdiem', 'general'],
  entityId: ObjectId (linked request),
  title: String (required),
  message: String (required),
  actionUrl: String,
  read: Boolean (default: false),
  meta: Object (additional data),
  createdAt: Date (auto)
}
```

---

## 🔌 Backend API Documentation

### Base URL

```
http://localhost:7001
or
http://localhost:7002
```

### Authentication Endpoints

#### Register User

```http
POST /api/auth/register
```

**Access:** Admin only (protected route)

**Request Body:**
```json
{
  "fullName": "John Doe",
  "username": "johndoe",
  "password": "password123",
  "role": "user",
  "email": "john@example.com",
  "phone": "+251912345678",
  "department": "Operations",
  "status": "active"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "fullName": "John Doe",
    "role": "user"
  }
}
```

**Side Effects:** Auto-creates employee news post

#### Login

```http
POST /api/auth/login
```

**Access:** Public

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "fullName": "John Doe",
    "role": "user",
    "email": "john@example.com",
    "department": "Operations"
  }
}
```

### User Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Admin | Get all users |
| GET | `/api/users/drivers` | Admin, Manager | Get all drivers |
| GET | `/api/users/me` | Authenticated | Get current user |
| PUT | `/api/users/me` | Authenticated | Update own profile |
| PUT | `/api/users/me/password` | Authenticated | Change own password |
| PUT | `/api/users/:id` | Admin | Update any user |
| PUT | `/api/users/:id/password` | Admin | Reset user password |
| DELETE | `/api/users/:id` | Admin | Delete user |

### Vehicle Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/vehicles` | Admin, Manager | Get all vehicles |
| GET | `/api/vehicles/mine` | Driver | Get assigned vehicle |
| GET | `/api/vehicles/:id` | Authenticated | Get vehicle by ID (includes maintenance/fuel history) |
| POST | `/api/vehicles` | Admin, Manager | Create vehicle |
| PUT | `/api/vehicles/:id` | Admin, Manager | Update vehicle |
| DELETE | `/api/vehicles/:id` | Admin | Delete vehicle |

**Response includes:**
- Vehicle data with populated `assignedDriver`
- Virtual `serviceInfo` (nextServiceKm, kmUntilService)
- Arrays: `maintenance`, `fuel` (related requests)

### Maintenance Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/maintenance` | Admin, Manager | Get all requests |
| GET | `/api/maintenance/my` | Driver | Get own requests |
| GET | `/api/maintenance/:id` | Authenticated | Get request by ID |
| POST | `/api/maintenance` | All authenticated | Create request |
| PATCH | `/api/maintenance/:id` | Admin, Manager | Update/approve request |
| DELETE | `/api/maintenance/:id` | Admin | Delete request |

**Approval Workflow:**
```javascript
// Update request status
PATCH /api/maintenance/:id
{
  "status": "approved",
  "cost": 2500,
  "remarks": "Approved for tire replacement"
}
```

### Fuel Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/fuel` | Admin, Manager | Get all requests |
| GET | `/api/fuel/my` | Driver | Get own requests |
| GET | `/api/fuel/:id` | Authenticated | Get request by ID |
| POST | `/api/fuel` | All authenticated | Create request |
| PUT | `/api/fuel/:id` | Admin, Manager | Update/approve request |
| DELETE | `/api/fuel/:id` | Admin | Delete request |

### Per Diem Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/per-diem` | Admin, Manager | Get all requests |
| GET | `/api/per-diem/my` | Driver | Get own requests |
| GET | `/api/per-diem/:id` | Authenticated | Get request by ID |
| POST | `/api/per-diem` | All authenticated | Create request |
| PUT | `/api/per-diem/:id` | Admin, Manager | Update/approve request |
| DELETE | `/api/per-diem/:id` | Admin | Delete request |

### Log Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/logs` | Admin, Manager | Get all logs |
| GET | `/api/logs/my` | Driver | Get own logs |
| GET | `/api/logs/vehicle/:id` | Admin, Manager | Get logs by vehicle |
| POST | `/api/logs` | All authenticated | Create log |
| PUT | `/api/logs/:id` | Authenticated | Update log |
| DELETE | `/api/logs/:id` | Admin, Manager | Delete log |

### News Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/news` | Authenticated | Get all news (admins see hidden) |
| GET | `/api/news/recent` | Authenticated | Get 4 recent posts |
| GET | `/api/news/:id` | Authenticated | Get news by ID |
| POST | `/api/news` | Admin | Create news post |
| PUT | `/api/news/:id` | Admin | Update news post |
| PATCH | `/api/news/:id/toggle` | Admin | Toggle visibility |
| DELETE | `/api/news/:id` | Admin | Delete news post |

### Notification Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/notifications` | Authenticated | Get user notifications |
| PATCH | `/api/notifications/:id/read` | Authenticated | Mark as read |
| DELETE | `/api/notifications/:id` | Authenticated | Delete notification |

---

## 🎨 Frontend Structure

### Routing System

```javascript
// Unauthenticated Routes:
/ → Landing Page
/login → Login Page
/register → Registration (admin creates users)

// Authenticated Routes (protected by Layout):
/dashboard → Main Dashboard
/users → User Management (admin only)
/vehicles → Fleet Management (admin/manager)
/maintenance → Maintenance Requests
/fuel → Fuel Requests
/perdiem → Per Diem Requests
/logs → Trip Logs
/reports → Analytics & Reports (admin/manager)
/news → News & Events
/settings → Profile Settings
```

### Component Architecture

#### Layout Component (`Layout.js`)

**Purpose:** Wrapper for authenticated pages

**Features:**
- **Sidebar Navigation:** Collapsible, role-based menu items
- **Top Header:** Logo, quick stats, notifications, user menu
- **Notification Panel:** Real-time notifications with deduplication
- **Breadcrumbs:** Page navigation

**Key Functions:**
```javascript
// Fetch notifications and pending requests
useEffect(() => {
  // Deduplicate: pending items by _id/entityId
  // Filter out notifications matching pending items
  // Deduplicate remaining notifications
}, [user]);
```

#### AuthContext (`AuthContext.js`)

**Purpose:** Global authentication state management

**State:**
```javascript
{
  user: {id, username, fullName, role, email, ...},
  loading: boolean,
  login: (username, password) => Promise,
  register: (userData) => Promise,
  logout: () => void,
  updateUser: (userData) => void
}
```

**Token Management:**
- Stored in `localStorage`
- Auto-attached to requests via axios interceptor
- Auto-logout on 401 responses

#### API Service (`api.js`)

**Purpose:** Centralized HTTP client

**Features:**
```javascript
// Request Interceptor: Add JWT token
config.headers.Authorization = `Bearer ${token}`;

// Response Interceptor: Handle 401 errors
if (status === 401) {
  localStorage.clear();
  window.location = '/login';
}
```

---

## 🔐 Authentication & Authorization

### Authentication Flow

```
1. User submits login form
   ↓
2. Frontend sends POST /api/auth/login
   ↓
3. Backend validates credentials (bcrypt.compare)
   ↓
4. Backend generates JWT token (1 hour expiry)
   ↓
5. Frontend stores token + user in localStorage
   ↓
6. All subsequent requests include: Authorization: Bearer <token>
   ↓
7. Backend verifyToken middleware decodes JWT
   ↓
8. Request proceeds with req.user = {id, role, username}
```

### Authorization Middleware Chain

```javascript
// Example: Create maintenance request
router.post(
  "/",
  verifyToken,  // Step 1: Verify JWT
  authorizeRoles("driver", "manager", "admin", "user"),  // Step 2: Check role
  createMaintenance  // Step 3: Execute controller
);
```

### Role-Based Access

| Feature | Admin | Manager | Driver/User |
|---------|-------|---------|-------------|
| Manage Users | ✅ | ❌ | ❌ |
| Manage Vehicles | ✅ | ✅ | View assigned |
| Approve Requests | ✅ | ✅ | ❌ |
| Submit Requests | ✅ | ✅ | ✅ |
| View Reports | ✅ | ✅ | ❌ |
| Manage News | ✅ | ❌ | View only |
| View All Logs | ✅ | ✅ | Own only |

---

## ⚙️ Key Features & Workflows

### 1. Maintenance Request Workflow

```
Driver submits request
   ↓
System checks for duplicates (vehicle + category + pending/approved)
   ↓
If exists → Return 409 Conflict with existing request ID
If new → Create request with status='pending'
   ↓
Notifications sent to:
  - Requester (confirmation)
  - All admins/managers (approval needed)
   ↓
Admin/Manager reviews request
   ↓
Approves/Rejects (PATCH /api/maintenance/:id)
   ↓
If approved → status='approved', approvedBy, approvedDate
If completed → status='completed', completedDate, cost
   ↓
Vehicle previousServiceKm updated (if Service category)
   ↓
Notification sent to requester
```

### 2. Service Alert System

**Dashboard displays alerts when:**
```javascript
kilometersUntilNextService < 500

Priority Levels:
- Critical (Red): < 100 km
- Warning (Orange): 100-249 km
- Attention (Yellow): 250-499 km
```

**Calculation:**
```javascript
currentKm = 45000
previousServiceKm = 40000
serviceIntervalKm = 5000

nextServiceKm = 40000 + 5000 = 45000
kmUntilService = 45000 - 45000 = 0 ⚠️ SERVICE DUE
```

### 3. News & Events System

**Types:**
- `announcement`: Company announcements
- `employee`: New employee welcome (auto-created)
- `event`: Upcoming events with eventDate
- `achievement`: Team achievements
- `general`: General news

**Visibility:**
- `isActive: true` → Visible to all
- `isActive: false` → Visible only to admins
- Dashboard shows 4 most recent active posts
- News page shows all (paginated, searchable)

### 4. Notification System

**Deduplication Logic:**
```javascript
1. Get pending requests (maintenance, fuel, perdiem)
2. Deduplicate pending items by _id/entityId
3. Filter out notifications matching pending items
4. Deduplicate remaining notifications
5. Display: "Pending Actions" + "Recent Activity"
```

**Notification Types:**
- `maintenance`: Maintenance request updates
- `fuel`: Fuel request updates
- `perdiem`: Per diem updates
- `general`: System messages

---

## 📊 Data Flow Diagrams

### Request Approval Flow

```
┌─────────┐
│ Driver  │ Creates Request
└────┬────┘
     │
     ▼
┌─────────────────┐
│ MongoDB         │ Status: pending
│ RequestsDB      │ Notifications created
└────┬────────────┘
     │
     ▼
┌──────────────┐
│ Admin/Manager│ Reviews Request
└────┬─────────┘
     │
     ▼
┌─────────────────┐
│ Update Request  │ Status: approved/rejected
│ Send Notification│ approvedBy, approvedDate
└────┬────────────┘
     │
     ▼
┌──────────────┐
│ Driver       │ Receives Notification
│ Dashboard    │ Sees updated status
└──────────────┘
```

### Vehicle Service Tracking

```
Vehicle Created
   ↓
currentKm = 10000
initialKm = 10000 (auto-set)
previousServiceKm = 0
serviceIntervalKm = 5000
   ↓
Virtual serviceInfo calculates:
nextServiceKm = 0 + 5000 = 5000
kmUntilService = 5000 - 10000 = -5000 (OVERDUE!)
   ↓
Dashboard shows SERVICE ALERT
   ↓
Service completed at 15000 km
   ↓
previousServiceKm updated = 15000
   ↓
New calculation:
nextServiceKm = 15000 + 5000 = 20000
kmUntilService = 20000 - currentKm
```

---

## 🚀 Setup & Deployment

### Prerequisites

- Node.js v14+
- MongoDB v4.4+
- npm or yarn

### Backend Setup

```bash
cd backend
npm install

# Create .env file
PORT=7001
CONNECTION_STRING=mongodb://localhost:27017/fleet-management
JWT_SECRET=your_super_secret_key_here

# Run development server
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Update api.js baseURL if needed
# baseURL: 'http://localhost:7001'

# Run development server
npm start
```

### Create Admin User

```bash
cd backend
node src/scripts/createAdmin.js
```

### Environment Variables

**Backend `.env`:**
```env
PORT=7001
CONNECTION_STRING=mongodb://localhost:27017/fleet-management
JWT_SECRET=random_secret_key_minimum_32_characters
```

**Frontend:** (Update `src/services/api.js`)
```javascript
baseURL: 'http://localhost:7001'  // or production URL
```

---

## 🔒 Security Features

### 1. Password Security

- Bcrypt hashing (10 rounds)
- Salted hashes stored in DB
- Password change requires current password

### 2. JWT Authentication

- 1-hour token expiry
- Signed with secret key
- Payload: `{id, role, username}`

### 3. Authorization

- Role-based middleware
- Route-level protection
- Frontend route guards

### 4. Data Validation

- Mongoose schema validation
- Required fields enforcement
- Enum constraints
- Unique constraints (username, email, plateNumber)

### 5. CORS

- Enabled for cross-origin requests
- Configurable allowed origins

---

## 📱 Responsive Design

### Mobile-First Approach

- **Breakpoints:**
  - `sm`: 640px (tablets)
  - `md`: 768px (small laptops)
  - `lg`: 1024px (desktops) - Sidebar shows
  - `xl`: 1280px (large screens)

### Adaptive Features

- **Sidebar**: Hidden on mobile, collapsible on desktop
- **Tables**: Horizontal scroll on small screens
- **Grids**: Responsive columns (1 → 2 → 4)
- **Navigation**: Hamburger menu on mobile

---

## 🎨 Design System

### Color Palette

```javascript
Primary (Blue):
- primary-600: #2563eb (main actions)
- primary-700: #1d4ed8 (hover states)

Accent Colors:
- Purple: Users dashboard
- Orange: Vehicles dashboard  
- Indigo: Settings
- Yellow: Maintenance
- Green: Success states
- Red: Alerts/errors
```

### Typography

- **Font:** Barlow (Google Fonts)
- **Weights:** 300, 400, 500, 600, 700, 800, 900
- **Styles:**
  - `font-black`: Headings (900)
  - `font-bold`: Subheadings (700)
  - `font-semibold`: Body text (600)

### Spacing

- Consistent `space-y-*` and `gap-*` utilities
- **Cards**: `p-5` or `p-6`
- **Sections**: `space-y-6` or `space-y-8`

---

## 🚨 Error Handling

### Backend

```javascript
try {
  // Operation
  res.json({ success: true, data });
} catch (error) {
  res.status(500).json({ 
    success: false, 
    message: error.message 
  });
}
```

### Frontend

```javascript
try {
  await api.someCall();
  toast.success('Success message');
} catch (error) {
  const message = error.response?.data?.message || 'Operation failed';
  toast.error(message);
}
```

### HTTP Status Codes

- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **409**: Conflict (duplicate request)
- **500**: Server Error (internal issues)

---

## 📦 Export & Reporting

### Excel Export

- Uses `XLSX` library
- Generates multi-sheet workbooks
- Includes:
  - Cover sheet (company info)
  - Vehicle details
  - Maintenance history
  - Fuel history

### Print Reports

- Opens new window with formatted HTML
- Company header
- Tables with borders
- Print-optimized styles

---

## 🎯 Key Features Summary

### Dashboard

- **Welcome card**: User info, role, date, system status
- **Stats cards**: Users, vehicles, pending requests
- **Service alerts sidebar**: Vehicles needing service (<500km)
- **Recent requests**: Last 5 requests with status
- **Quick actions**: Shortcuts to create requests
- **News sidebar**: Latest company news and events

### Fleet Management

- Vehicle CRUD operations
- Driver assignment (one-to-one)
- Service interval tracking
- Service history with KM records
- Real-time service due calculations
- Export vehicle history (Excel + Print)

### Request Management

- **Maintenance**: 8 categories, priority levels, cost tracking
- **Fuel**: Auto-cost calculation, fuel type tracking
- **Per Diem**: Date range, destination, days calculation
- Conflict detection (prevents duplicate pending requests)
- Approval workflow with notifications
- Status tracking: pending → approved/rejected → completed

### Trip Logs

- One log per vehicle per day (enforced)
- Auto-distance calculation (endKm - startKm)
- Driver assignment
- Editable flag for modifications

### Reports & Analytics

- **Charts**: Donut (costs), Area (trends), Horizontal bars (top vehicles)
- **Filters**: Date range, vehicle, status
- **Tables**: Detailed breakdowns with sorting
- **Export**: Print-friendly reports

### News & Events

- 5 post types with color coding
- Event date tracking
- Priority levels
- Visibility toggle (active/hidden)
- Auto-creation for new employees
- Searchable and filterable

### Notifications

- Real-time updates on request status changes
- Deduplication logic (no duplicate entries)
- Separate pending actions vs recent activity
- Mark as read functionality

---

## 🔄 State Management

### Global State

- **AuthContext**: User authentication state
- **ThemeContext**: Dark/light mode preferences

### Local State

- Each page manages its own data
- React hooks: `useState`, `useEffect`, `useCallback`
- API calls in `useEffect` on mount

### Data Fetching Pattern

```javascript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await someAPI.getAll();
      setData(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

---

## 🎯 Business Logic Highlights

### 1. Service Interval Calculation

Vehicles track when they need service based on kilometers driven.

### 2. Request Conflict Detection

Prevents duplicate pending requests for same vehicle+category.

### 3. One Driver Per Vehicle

Database constraint ensures no driver is assigned to multiple vehicles.

### 4. One Log Per Vehicle Per Day

Prevents duplicate trip logs for the same vehicle on the same date.

### 5. Auto News Creation

When admin creates a new user, an "employee" news post is automatically generated.

### 6. Cost Auto-Calculation

Fuel cost = quantity × pricePerLitre (calculated in pre-save hook).

---

## 🚀 Future Enhancements

### Technical Enhancements

- Real-time updates with WebSockets
- Mobile app (React Native)
- Advanced analytics with AI predictions
- GPS tracking integration
- Document upload for maintenance receipts

### Feature Additions

- Multi-language support
- Dark mode toggle (ThemeContext ready)
- Email notifications
- SMS alerts for critical issues
- Automated report scheduling

### Performance

- Database indexing optimization
- Caching strategies (Redis)
- Image optimization
- Lazy loading for large datasets

### Integration

- Accounting software integration
- Third-party fuel card APIs
- Vehicle telematics systems
- HR system integration

---

## 📝 Conclusion

This Fleet Management System provides a comprehensive solution for managing vehicle fleets with modern web technologies. The system features:

- ✅ Role-based access control
- ✅ Real-time service alerts
- ✅ Automated workflows
- ✅ Modern, responsive UI
- ✅ Secure authentication
- ✅ Comprehensive reporting

**Technology Stack:** Node.js, Express.js, MongoDB, React, Tailwind CSS

**Ready for:** Production deployment, scalability enhancements, feature expansion

---

## 📞 Support & Contact

For questions, issues, or contributions, please refer to the project repository or contact the development team.

**License:** MIT

**Version:** 1.0.0

**Last Updated:** November 4, 2025

---

*This documentation is maintained by the Fleet Management System development team.*


