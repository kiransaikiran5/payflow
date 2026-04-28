from sqlalchemy.orm import Session
from app.models.models import Notification, User, Employee


def create_notification(db: Session, user_id: int, title: str, message: str):
    """Create a single notification for a user."""
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        is_read=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def create_notification_for_role(db: Session, role: str, title: str, message: str):
    """Create notifications for all users with a specific role."""
    users = db.query(User).filter(User.role == role).all()
    notifications = []
    for user in users:
        notif = Notification(
            user_id=user.id,
            title=title,
            message=message,
            is_read=False
        )
        db.add(notif)
        notifications.append(notif)
    db.commit()
    return len(notifications)


def create_notification_for_all_hr(db: Session, title: str, message: str):
    """Create notifications for all HR and Admin users."""
    users = db.query(User).filter(User.role.in_(['HR', 'ADMIN'])).all()
    notifications = []
    for user in users:
        notif = Notification(
            user_id=user.id,
            title=title,
            message=message,
            is_read=False
        )
        db.add(notif)
        notifications.append(notif)
    db.commit()
    return len(notifications)


def create_notification_for_department(db: Session, department: str, title: str, message: str):
    """Create notifications for all employees in a department."""
    employees = db.query(Employee).filter(Employee.department == department).all()
    notifications = []
    for emp in employees:
        if emp.user_id:
            notif = Notification(
                user_id=emp.user_id,
                title=title,
                message=message,
                is_read=False
            )
            db.add(notif)
            notifications.append(notif)
    db.commit()
    return len(notifications)


def notify_payroll_generated(db: Session, employee_id: int, month: str, net_salary: float):
    """Notify employee that payroll has been generated."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee and employee.user_id:
        create_notification(
            db,
            user_id=employee.user_id,
            title="💰 Payroll Generated",
            message=f"Your salary for {month} has been processed. Net amount: ₹{net_salary:,.2f}"
        )


def notify_salary_credited(db: Session, employee_id: int, month: str, net_salary: float):
    """Notify employee that salary has been credited."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee and employee.user_id:
        create_notification(
            db,
            user_id=employee.user_id,
            title="✅ Salary Credited",
            message=f"Your salary for {month} (₹{net_salary:,.2f}) has been credited to your account."
        )


def notify_payslip_available(db: Session, employee_id: int, month: str):
    """Notify employee that payslip is ready."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee and employee.user_id:
        create_notification(
            db,
            user_id=employee.user_id,
            title="📄 Payslip Available",
            message=f"Your payslip for {month} is ready for download."
        )


def notify_bonus_added(db: Session, employee_id: int, amount: float, reason: str = ""):
    """Notify employee about bonus addition."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee and employee.user_id:
        reason_text = f" for {reason}" if reason else ""
        create_notification(
            db,
            user_id=employee.user_id,
            title="🎁 Bonus Added",
            message=f"A bonus of ₹{amount:,.2f}{reason_text} has been added to your account."
        )


def notify_attendance_issue(db: Session, employee_id: int, month: str, absent_days: int):
    """Notify employee about attendance issues."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee and employee.user_id:
        create_notification(
            db,
            user_id=employee.user_id,
            title="⚠️ Attendance Alert",
            message=f"You have {absent_days} absent days recorded for {month}. This may affect your salary."
        )