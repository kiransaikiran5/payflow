from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.dependencies import require_role
from app.models.models import AuditLog
from app.schemas.schemas import AuditLogResponse

router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])

@router.get("/", response_model=list[AuditLogResponse])
def get_audit_logs(
    entity: str = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_role("ADMIN"))
):
    query = db.query(AuditLog)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    return query.order_by(AuditLog.timestamp.desc()).limit(500).all()