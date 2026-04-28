from sqlalchemy.orm import Session
from app.models.models import AuditLog

def log_action(db: Session, user_id: int, action: str, entity: str = None, entity_id: int = None, details: str = None):
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=details
    )
    db.add(log)
    db.commit()