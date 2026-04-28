from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.database import engine, Base
from app.api import (
    auth, employees, salary_components, employee_salary,
    payroll, tax, payslips, bonuses, notifications, reports
)
import os
from app.api import attendance
from app.api import (payroll_approvals, salary_history, loans, compliance, bulk_payroll, reports_export, audit_logs)



# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PayFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("payslips", exist_ok=True)

# Mount static files for payslips - use a different path
app.mount("/files/payslips", StaticFiles(directory="payslips"), name="payslips")

# Include routers - order matters! API routes first
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(salary_components.router)
app.include_router(employee_salary.router)
app.include_router(payroll.router)
app.include_router(tax.router)
app.include_router(payslips.router)  # This must come AFTER static mount
app.include_router(bonuses.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(attendance.router)

app.include_router(payroll_approvals.router)
app.include_router(salary_history.router)
app.include_router(loans.router)
app.include_router(compliance.router)  # we'll need compliance router too
app.include_router(bulk_payroll.router)
app.include_router(reports_export.router)
app.include_router(audit_logs.router)

@app.get("/")
def root():
    return {"message": "PayFlow API is running"}