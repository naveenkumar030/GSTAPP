# GST ReconGraph (gstapp1)

GST ReconGraph is a modern enterprise web application designed for GST filing, Input Tax Credit (ITC) reconciliation, and invoice fraud detection. It uses a graph-based representation of transactions to identify circular trading, mirror transactions, and high-risk tax evaders.

---

## Key Features

1. **ITC Reconciliation**: Cross-references internal Purchase Registers (PR) against official government GSTR-2B data to detect matches, differences, duplicate records, and omissions.
2. **Fraud Detection Graph**: Analyzes transaction networks to expose anomalous tax behaviors like circular trading loops (mock invoice generation without movement of goods).
3. **Interactive Visualizations**: High-performance force-directed graph to visually inspect connections between suppliers, buyers, bank accounts, and locations.
4. **Secure OTP Authentication**: Dual-factor user authentication with secure email OTP generation and validation.

---

## Architecture Overview

```
              ┌───────────────────────────┐
              │      React Frontend       │
              │  (Vite + Tailwind + G2D)  │
              └─────────────┬─────────────┘
                            │ (REST APIs)
                            ▼
              ┌───────────────────────────┐
              │      FastAPI Backend      │
              │         (Python)          │
              └───────┬───────────┬───────┘
                      │           │
         ┌────────────┘           └────────────┐
         ▼                                     ▼
┌──────────────────┐                 ┌──────────────────┐
│     MongoDB      │                 │      AWS S3      │
│  (Users & OTPs)  │                 │  (Core/Ref Data) │
└──────────────────┘                 └──────────────────┘
```

The application is split into:
- **Frontend**: A React single-page application built on Vite and Tailwind CSS. It uses `react-force-graph-2d` for interactive network visualizations. All API requests are proxied dynamically to the backend.
- **Backend**: A FastAPI (Python) backend handling application security, business logic, MongoDB user management, SMTP email OTP dispatch, and S3 queries.
- **Databases & Storage**:
  - **MongoDB**: Stores user credentials, registration states, and temporal OTP codes.
  - **AWS S3**: Represents core and reference storage mapping tax-paying entities and invoice structures to detect fraud patterns.

---

## Setup & Run Instructions

## 1. Environment Configuration

1. Copy the example environment file at the root:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your connection strings and secrets for MongoDB, AWS S3, JWT, and SMTP credentials.

---

### 2. Quick Start (Single-Port via Python)

To run both the frontend and backend on a single port (port `8000`) using Python:

1. Make sure Node.js (v18+) and Python 3.10+ are installed.
2. Run the startup orchestrator from the project root:
   ```bash
   python start.py
   ```
   *Note: This script will build the frontend assets using `npm run build` and launch the FastAPI server, serving both the React frontend and backend APIs on http://127.0.0.1:8000.*

---

### 3. Backend Setup (FastAPI)

Ensure you have Python 3.10+ installed.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend API will run on `http://127.0.0.1:8000`. API documentation is available at `http://127.0.0.1:8000/docs`.

---

### 4. Frontend Setup (React + Vite)

Ensure you have Node.js (v18+) installed.

1. In the project root (`GSTAPP`), install node packages:
   ```bash
   npm install
   ```
2. Run the frontend development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`. Vite will automatically proxy `/api` calls to the local backend port `8000`.

---

## Testing & Quality Control

### Unit Tests
This project uses **Vitest** for running unit tests on critical functions (such as GST calculations and formatting).
Run the suite using:
```bash
npm run test
```

### Code Linting
Lints are managed using **Oxlint** for lightning-fast JavaScript and React inspection.
Run linting:
```bash
npx oxlint
```

---

## License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.
