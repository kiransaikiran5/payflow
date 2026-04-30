# PayFlow – Payroll & Salary Management System

A full‑stack enterprise payroll platform built with **FastAPI**, **React**, and **MySQL**.  
PayFlow automates salary processing, handles statutory deductions, manages employee loans, generates payslips, and provides role‑based dashboards for HR, Admin, and Employees.

---

## 📌 Overview

PayFlow simulates a real‑world payroll system, covering the entire employee compensation lifecycle – from maintaining employee profiles and salary structures to processing monthly payroll, deducting taxes & compliance amounts, tracking attendance, granting loans, and generating exportable reports.  

The application is split into two phases:

- **Phase 1** (Core Payroll): Authentication, employee management, salary components, payroll generation, tax & deductions, payslips, attendance, bonuses, basic reports, and notifications.
- **Phase 2** (Advanced Automation & Compliance): Payroll approval workflow, salary revision history, loan & advance management, multi‑currency support, statutory compliance (PF/ESI), bulk payroll processing, CSV/PDF exports, audit logs, enhanced RBAC, and advanced notifications.
- **Phase 3** (Employee Self‑Service & Advanced Analytics): Reimbursements with receipt upload & HR approval/rejection workflow, overtime recording & automatic payroll integration, tax report generation, payroll dispute & support system, document management & upload, employee self‑service hub, payroll schedule view, and an advanced analytics dashboard with KPI cards, department‑wise charts, payroll trends, overtime & bonus analysis, and employee cost breakdown.

---

## ✨ Key Features

### Phase 1 – Foundation
- JWT‑based authentication with role‑based access (EMPLOYEE / HR / ADMIN)
- Employee salary profile management
- Configurable salary components (FIXED / PERCENTAGE) with dynamic assignment
- Automated monthly payroll calculation (earnings, deductions, tax, attendance adjustments)
- Tax management with per‑employee percentage
- PDF payslip generation and download
- Attendance tracking with salary deduction for absences and overtime bonus
- Bonus & incentives system (included in payroll)
- Dashboard with payroll trend charts and department‑wise distribution
- Notification bell with real‑time updates (payroll generated, payslip available, etc.)

### Phase 2 – Enterprise Features
- **Payroll Approval Workflow** – HR generates payroll; Admin approves/rejects before payment
- **Salary Revision History** – Track all salary changes with effective dates
- **Loan & Advance Salary** – Apply loans, automatic EMI deduction in payroll, repayment tracking
- **Multi‑Currency Support** – Store salary in different currencies; UI displays correct symbol
- **Compliance Management** – Configure PF/ESI amounts per employee; automatic deduction
- **Bulk Payroll Processing** – Generate payroll for all (or selected) employees at once
- **Exportable Reports** – Download payroll data as CSV or PDF
- **Audit Logs** – Track every important action (create, update, approve, etc.) with Admin‑only view
- **Enhanced RBAC** – Employees see only their own data; HR manages operations; Admin oversees approvals & logs
- **Advanced Notifications** – Alerts for loan deductions, salary revisions, approval status, etc.
  
---

**Phase 3 – Employee Self‑Service & Analytics**

- **Reimbursements** – Submit expense requests with receipt upload; HR/Admin approval/rejection workflow.

- **Overtime Management** – Record overtime hours and pay rates; automatically included in payroll calculations.

- **Tax Reports** – Generate annual tax reports per employee with income and tax‑paid summaries.

- **Payroll Disputes** – Employees raise payroll concerns; HR resolves with comments and status tracking.

- **Documents** – Upload and manage employee‑related documents (contracts, certificates, etc.).

- **Employee Self‑Service Hub** – Central dashboard with shortcuts to payslips, attendance, reimbursements, overtime, disputes, and documents.

- **Payroll Schedule** – View upcoming payroll dates; month‑end reminders; auto‑generation on the 1st of each month.

- **Analytics Dashboard** – Department‑wise salary breakdown, monthly payroll trends, overtime analysis, bonus distribution, and employee cost analysis.

- **Advanced Notifications** – Real‑time alerts for reimbursement status, overtime approval, dispute updates, tax report generation, and payroll events (both for employees and HR/Admin).

---

---

## 🛠️ Tech Stack

| Layer       | Technology |
|-------------|------------|
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy, Pydantic |
| **Frontend**| React 18, TypeScript, Material UI, Recharts |
| **Database**| MySQL |
| **Auth**    | JWT (python‑jose), bcrypt |
| **PDF**     | ReportLab |
| **Tooling** | Uvicorn, Axios, React Router, React Toastify |

---


---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 16+
- MySQL 8
- Git

# Backend Setup

##1. **Clone the repository** and navigate to the backend folder:
   ```bash
   cd payflow/backend

##2. Create a virtual environment (recommended):

python -m venv venv
venv\Scripts\activate   # Windows
source venv/bin/activate # Mac/Linux

##3. Install dependencies:

pip install -r requirements.txt

##4. Configure environment variables – copy .env.example to .env and edit:

DATABASE_URL=mysql+pymysql://root:password@localhost:3306/payflow
SECRET_KEY=your-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

##5. Create the database in MySQL:

CREATE DATABASE payflow;

Tables will be created automatically on first run (using SQLAlchemy Base.metadata.create_all).

##6 Start the server:

uvicorn app.main:app --reload --port 8000
API documentation is available at http://localhost:8000/docs.

# Frontend Setup:

##1. Navigate to the frontend folder:

cd payflow/frontend

##2. Install dependencies:

npm install

##3. Create .env file (copy from .env.example):

REACT_APP_API_URL=http://localhost:8000/api

##4. Start the development server:

npm start

The application will open at http://localhost:3000.
