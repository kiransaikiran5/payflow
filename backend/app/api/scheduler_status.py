from fastapi import APIRouter, Depends
from app.api.dependencies import require_role
from app.services.scheduler import scheduler

router = APIRouter(prefix="/api/scheduler", tags=["Scheduler"])

@router.get("/status")
def get_scheduler_status(_=Depends(require_role("HR"))):
    """Return whether the payroll scheduler is running and its next job time."""
    jobs = scheduler.get_jobs()
    return {
        "running": scheduler.running,
        "jobs": [
            {
                "name": job.name,
                "next_run": str(job.next_run_time) if job.next_run_time else None,
                "trigger": str(job.trigger)
            }
            for job in jobs
        ]
    }