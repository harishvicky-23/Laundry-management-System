# MIT Campus Laundry Hub

A centralized, automated laundry management platform designed for students, laundry attendants, and system administrators at the **Madras Institute of Technology (MIT), Anna University** campus.

This repository features a decoupled monorepo structure containing both the FastAPI backend and the React SPA frontend.

---

## 📂 Project Structure

```
laundry-management-system/
├── backend/                  # FastAPI backend service
│   ├── app/                  # Application core logic and main entry (main.py)
│   ├── auth/                 # Authentication routers and JWT dependency logic
│   ├── config/               # Database engine, base model, and connection setup
│   ├── models/               # SQLAlchemy schema definitions
│   ├── schemas/              # Pydantic input/validation models
│   ├── .env.example          # Sample environment credentials configuration
│   └── requirements.txt      # Python package dependencies list
│
└── frontend/                 # React frontend application
    └── laundry_ms/
        ├── src/
        │   ├── assets/       # Branding assets (MIT logos, Anna Univ seal, etc.)
        │   ├── components/   # Shared components (DashboardLayout, etc.)
        │   ├── pages/        # App entry pages (RootPortal, Admin, Student, Attendant)
        │   └── utils/        # API network client and helpers
        ├── index.html        # App HTML template wrapper
        └── package.json      # Node package manifest
```

---

## 🛠️ Technology Stack

### Backend
* **Language:** Python 3.10+
* **Framework:** FastAPI
* **ORM:** SQLAlchemy
* **Server:** Uvicorn
* **Database Support:** PostgreSQL (Neon Cloud / Local) & SQLite fallback

### Frontend
* **Core:** React 19, JavaScript (ES6+)
* **Styling:** TailwindCSS v4
* **Build System:** Vite v8
* **Routing:** React Router v7

---

## 🚀 Setup & Installation

### 1. Backend Service Configuration

1. **Navigate to the Backend Directory**:
   ```bash
   cd backend
   ```

2. **Create a Virtual Environment**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the Virtual Environment**:
   * **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\activate
     ```
   * **Linux/macOS**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` root directory and specify your database connection details:
   ```env
   DATABASE_URL=postgresql://[user]:[password]@[hostname]:5432/laundry_db
   ```
   *For local SQLite development, you can use: `sqlite:///./local.db`*

6. **Initialize Database & Seed Data**:
   To set up database schemas and insert dummy students, attendants, and catalog items, execute:
   ```bash
   python create_dummy.py
   ```

7. **Start Backend Server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend API will run at [http://127.0.0.1:8000](http://127.0.0.1:8000) and Swagger API documentation will be accessible at `/docs`.

---

### 2. Frontend SPA Configuration

1. **Navigate to the Frontend Directory**:
   ```bash
   cd frontend/laundry_ms
   ```

2. **Install Packages**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The frontend app will launch at [http://localhost:5173](http://localhost:5173).

4. **Production Build**:
   ```bash
   npm run build
   ```
   Compiles static assets into the `dist/` directory for hosting.

---

## 🔑 Authentication & Authorization System

The application relies on a secure **Role-Based Access Control (RBAC)** architecture managed via JSON Web Tokens (JWT) and Bcrypt password hashing.

### 1. Authentication Lifecycle
* **Registration & Hashing:** User passwords are encrypted using `bcrypt` (defined in `auth/hashing.py`) before storage in the database.
* **Token Issuance:** On successful authentication at `/login`, the backend issues a signed JWT containing the user's ID, Username, and Role (`auth/jwt_handler.py`).
* **Session Persistence:** The client stores the JWT in `localStorage` as `token`. The API client automatically appends this token to the `Authorization: Bearer <token>` header of every outgoing request.

### 2. Authorization & Middleware Guard Layer
The backend utilizes custom dependencies (`auth/dependencies.py` and `auth/permissions.py`) to restrict endpoint access according to roles:
* `require_student`: Grants access only to users with the `STUDENT` role.
* `require_attendant`: Grants access only to users with the `ATTENDANT` role.
* `require_admin`: Grants access only to users with the `ADMIN` role.
* `require_staff`: Grants access to both `ATTENDANT` and `ADMIN` users for shared statistics.

---

## 📡 API Endpoints Specification

### 1. Unauthenticated Endpoints
* `GET /`: Health check endpoint. Returns API online status.
* `POST /login`: Receives username and password, returns bearer access token.

### 2. Student Endpoints (Requires Student Role)
* `GET /student/profile`: Returns the logged-in student's details, including active wallet balance, roll number, and phone number.
* `GET /student/orders`: Returns a complete array of orders submitted by the student, sorted chronologically (newest first).
* `GET /student/recentOrders`: Returns the 5 most recent orders for summary widgets.
* `GET /student/dashboard`: Aggregated endpoint combining student profile details, all orders, and recent orders in a single payload.

### 3. Laundry Attendant Endpoints (Requires Attendant Role)
* `GET /attendant/profile`: Returns the attendant's staff record.
* `GET /attendant/orders/active`: Returns all active orders in the queue (status: `PENDING`, `WASHING`, `DRYING`, `IRONING`, `READY`), sorted oldest first.
* `GET /attendant/orders/collected`: Paginated array of all orders that have been successfully picked up (status: `COLLECTED`).
* `POST /attendant/createOrders`: Registers a new intake. Validates student balance against the total order amount. If insufficient, rolls back and raises a `400 Bad Request`. Deducts the amount automatically on success.
* `GET /attendant/orders/{order_id}`: Fetches details for a specific order.
* `PATCH /attendant/updateOrderStatus/{order_id}/status`: Updates order state progress (`PENDING` ➔ `WASHING` ➔ `DRYING` ➔ `IRONING` ➔ `READY` ➔ `COLLECTED`).

### 4. Admin Endpoints (Requires Admin Role)
* `GET /dashboard/summary`: Fetches real-time operational metrics (orders placed today, count of orders in-process, orders ready for pickup, and orders collected today).
* `GET /admin/students`: Lists registered students. Supports query parameters `search` (filters by name or roll number) and pagination (`page`, `limit`).
* `POST /admin/createStudents`: Registers a new student user profile and creates a corresponding credential pair in the authentication directory.
* `PATCH /admin/updateStudents/{student_id}`: Modifies student profile properties.
* `DELETE /admin/students/{student_id}`: Deletes the student profile and disables their database user login.
* `POST /admin/students/{student_id}/topup`: Replenishes a student's virtual wallet by a specified currency amount.
* `GET /services`: Retrieves the full service catalog.
* `POST /services`: Adds a new service offering (e.g., Dry Clean, Blanket Washing) to the operational list.
* `PATCH /services/{service_id}`: Modifies an existing service's description, status, or pricing structure.
* `DELETE /services/{service_id}`: Deactivates a service (marks `is_active=False`). Soft-deactivation prevents new orders while preserving historical records.
* `GET /admin/attendants`: Lists active laundry staff.
* `POST /admin/createAttendants`: Creates an attendant profile and issues credentials.
* `PATCH /admin/attendants/{attendant_id}`: Updates staff records.
* `DELETE /admin/attendants/{attendant_id}`: Deletes an attendant profile and disables their user login.

---

## ✨ Features of the Application

### 👤 Student Portal
* **Wallet Balance Tracking:** Students can view their real-time remaining wallet balance.
* **Order Tracking Pipeline:** Interactive timeline showing whether their clothes are currently being Washed, Dried, Ironed, or are Ready for pickup.
* **Transaction History:** Access a full historical ledger of all orders registered under their account.

### 👕 Attendant Intake & Workflow Board
* **Automatic Overdraft Prevention:** The system automatically prevents order creation if a student's card or wallet has insufficient funds, eliminating manual accounting errors.
* **Intake Form:** Add items dynamically from the service list, calculates costs, and registers them.
* **Active Queue Board:** Quick action controls to push clothes through the washing, drying, and ironing pipelines.
* **Collected History:** Access records of completed historical intakes.

### 👑 Admin Management Control Center
* **Attendant & Student Registries:** Add, edit, or delete student and attendant profiles.
* **Wallet Top-Up Console:** Replenish student accounts directly.
* **Dynamic Service Catalog:** Add new laundry types or update prices. Includes safe deactivation toggles to prevent menu corruption.
* **KPI Dashboard:** Monitor overall metrics of daily laundry operational load.
