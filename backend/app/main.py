from contextlib import asynccontextmanager
import os
from app.api import scheduler_status
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import engine, Base
from app.services.scheduler import start_scheduler, scheduler

# Phase 1 routers
from app.api import (
    auth, employees, salary_components, employee_salary,
    payroll, tax, payslips, bonuses, notifications, reports,
    attendance
)
# Phase 2 routers
from app.api import (
    payroll_approvals, salary_history, loans, compliance,
    bulk_payroll, reports_export, audit_logs
)
# Phase 3 routers
from app.api import (
    reimbursements, overtime, tax_reports, disputes, documents
)

# Create all tables in the database (if they don't exist)
Base.metadata.create_all(bind=engine)

# ---------- Lifespan for scheduler ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the background scheduler (monthly payroll on 1st at 02:00)
    start_scheduler()
    yield
    # Gracefully shutdown the scheduler when the app stops
    scheduler.shutdown()

app = FastAPI(
    title="PayFlow API",
    version="3.0.0",
    lifespan=lifespan
)

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Static files ----------
# Payslips (generated PDFs)
os.makedirs("payslips", exist_ok=True)
app.mount("/files/payslips", StaticFiles(directory="payslips"), name="payslips_files")

# Uploads (receipts and documents from employees)
os.makedirs("uploads/receipts", exist_ok=True)
os.makedirs("uploads/documents", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ---------- API Routers ----------
# Phase 1
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(salary_components.router)
app.include_router(employee_salary.router)
app.include_router(payroll.router)
app.include_router(tax.router)
app.include_router(payslips.router)
app.include_router(bonuses.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(attendance.router)

# Phase 2
app.include_router(payroll_approvals.router)
app.include_router(salary_history.router)
app.include_router(loans.router)
app.include_router(compliance.router)
app.include_router(bulk_payroll.router)
app.include_router(reports_export.router)
app.include_router(audit_logs.router)

# Phase 3
app.include_router(reimbursements.router)
app.include_router(overtime.router)
app.include_router(tax_reports.router)
app.include_router(disputes.router)
app.include_router(documents.router)
app.include_router(scheduler_status.router)

from app.api import analytics
app.include_router(analytics.router)

@app.get("/")
def root():
    return {"message": "PayFlow API is running"}