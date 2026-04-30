from apscheduler.schedulers.background import BackgroundScheduler
from app.services.payroll_service import generate_payroll_for_employee
from app.core.database import SessionLocal
from app.models.models import Employee
from datetime import date
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def monthly_payroll_job():
    db = SessionLocal()
    try:
        employees = db.query(Employee).all()
        for emp in employees:
            try:
                generate_payroll_for_employee(emp.id, date.today().replace(day=1), db)
            except Exception as e:
                logger.error(f"Payroll generation failed for employee {emp.id}: {e}")
        logger.info("Monthly payroll job completed")
    except Exception as e:
        logger.error(f"Payroll scheduler error: {e}")
    finally:
        db.close()

scheduler = BackgroundScheduler()

def start_scheduler():
    # Run on the 1st of every month at 02:00 AM
    scheduler.add_job(monthly_payroll_job, 'cron', day=1, hour=2, minute=0)
    scheduler.start()
    logger.info("Payroll scheduler started")