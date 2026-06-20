# MIT Campus Laundry Hub

A centralized, automated laundry management platform designed for students, laundry attendants, and system administrators at the **Madras Institute of Technology (MIT), Anna University** campus.

This repository features a decoupled monorepo structure containing both the FastAPI backend and the React SPA frontend.

---

## 📂 Project Structure

```
laundry-management-system/
├── backend/                  # FastAPI backend service
│   ├── app/                  # Application core logic and main entry
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

## 🔒 Security & Browser Navigation Guards

This application enforces a secure session guard system and a tailored navigation history flow:

* **Session Gateway / Auto-Login:** When a user lands on the main portal `/` or the login pages, if an active valid JWT token is found in browser storage, they are bypassed and automatically sent directly to their role-specific dashboard.
* **History Leak Protection:** Logging in replaces the login history item (`replace: true`). This ensures pressing the browser Back button from a dashboard takes the user back to the Root Portal page, and pressing it again takes them to the browser's default tab (leaving no duplicate intermediate landing redirects).
* **Safe Log Out & Forward Neutralization:** 
  * Logging out steps back in history (`navigate(-1)`) rather than pushing duplicate root `/` entries.
  * If a user tries to press the browser's "Forward" button after logging out to access their previous dashboard, the layout guards immediately intercept the unauthorized access, wipe credentials, and redirect them to `/`, neutralizing forward browser hijacking.

---

## 🎓 Academic Affiliation
Designed and managed as a service catalog tool for the student hostels and administrative laundry intake desk at the **Madras Institute of Technology, Anna University Campus**.
