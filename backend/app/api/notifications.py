from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.api.dependencies import get_current_active_user, require_role
from app.models.models import Notification, User
from app.schemas.schemas import NotificationResponse
from app.services.notification_service import (
    create_notification,
    create_notification_for_role,
    create_notification_for_all_hr,
    create_notification_for_department
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = Query(False, description="Show only unread notifications"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get notifications for the current user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    return query.order_by(Notification.created_at.desc()).limit(limit).all()


@router.get("/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get count of unread notifications."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


@router.post("/mark-all-read")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a notification."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()
    return {"message": "Notification deleted"}


@router.delete("/")
def delete_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete all notifications for the current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": "All notifications deleted"}


# ----- Admin/HR Endpoints -----

@router.post("/send")
def send_notification(
    user_id: int,
    title: str,
    message: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """HR/Admin: Send notification to a specific user."""
    notification = create_notification(db, user_id, title, message)
    return {"message": "Notification sent", "notification_id": notification.id}


@router.post("/send/role/{role}")
def send_notification_to_role(
    role: str,
    title: str,
    message: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """HR/Admin: Send notification to all users with a specific role."""
    count = create_notification_for_role(db, role, title, message)
    return {"message": f"Notification sent to {count} users"}


@router.post("/send/department/{department}")
def send_notification_to_department(
    department: str,
    title: str,
    message: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    """HR/Admin: Send notification to all employees in a department."""
    count = create_notification_for_department(db, department, title, message)
    return {"message": f"Notification sent to {count} employees"}


@router.post("/send/all-hr")
def send_notification_to_all_hr(
    title: str,
    message: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    """Admin: Send notification to all HR and Admin users."""
    count = create_notification_for_all_hr(db, title, message)
    return {"message": f"Notification sent to {count} HR/Admin users"}


@router.get("/all", response_model=List[NotificationResponse])
def get_all_notifications(
    user_id: Optional[int] = Query(None),
    unread_only: bool = Query(False),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    """Admin: Get all notifications (for monitoring)."""
    query = db.query(Notification)

    if user_id:
        query = query.filter(Notification.user_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)

    return query.order_by(Notification.created_at.desc()).limit(limit).all()