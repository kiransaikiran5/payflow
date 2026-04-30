from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import List
from dateutil.relativedelta import relativedelta

from app.core.database import get_db
from app.api.dependencies import require_role
from app.models.models import Employee, Payroll, Overtime, Bonus, User
from app.schemas.schemas import (
    AnalyticsResponse, DepartmentAnalytics, MonthlyTrend,
    OvertimeAnalysis, BonusDistribution, EmployeeCost
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/", response_model=AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("HR"))
):
    today = date.today()
    current_month_start = today.replace(day=1)

    # ----- KPI TOTALS -----
    total_employees = db.query(Employee).count()

    current_month_payroll = db.query(func.sum(Payroll.net_salary)).filter(
        Payroll.month == current_month_start
    ).scalar() or 0.0

    pending_payslips = db.query(Payroll).filter(Payroll.status != 'PAID').count()

    # FIX: Overtime.month is a DATE – compare with a date
    total_overtime_this_month = db.query(func.sum(Overtime.total_amount)).filter(
        Overtime.month == current_month_start
    ).scalar() or 0.0

    total_bonuses_this_month = db.query(func.sum(Bonus.bonus_amount)).filter(
        Bonus.created_at >= current_month_start,
        Bonus.created_at <= today
    ).scalar() or 0.0

    # ----- DEPARTMENT BREAKDOWN -----
    dept_rows = db.query(
        Employee.department,
        func.sum(Employee.base_salary).label("total_salary"),
        func.count(Employee.id).label("employee_count")
    ).group_by(Employee.department).all()

    department_breakdown = []
    for row in dept_rows:
        emp_count = row.employee_count or 0
        total_sal = float(row.total_salary or 0)
        avg_sal = total_sal / emp_count if emp_count else 0.0
        department_breakdown.append(
            DepartmentAnalytics(
                department=row.department or "Unassigned",
                total_salary=total_sal,
                employee_count=emp_count,
                avg_salary=avg_sal
            )
        )

    # ----- LAST 6 MONTHS -----
    months_list = []
    for i in range(5, -1, -1):
        month_start = today.replace(day=1) - relativedelta(months=i)
        months_list.append(month_start)

    # ----- PAYROLL TREND -----
    payroll_raw = db.query(
        Payroll.month,
        func.sum(Payroll.net_salary).label("net_payout")
    ).filter(Payroll.month.in_(months_list)).group_by(Payroll.month).all()
    payroll_map = {row.month: float(row.net_payout or 0) for row in payroll_raw}

    # ----- OVERTIME TREND (use date filter) -----
    overtime_raw = db.query(
        func.date_format(Overtime.month, '%Y-%m').label('month_str'),   # YYYY-MM string
        func.sum(Overtime.total_amount).label("overtime_total")
    ).filter(
        Overtime.month >= months_list[0],
        Overtime.month <= months_list[-1].replace(day=28) + relativedelta(days=6)   # cover full last month
    ).group_by('month_str').all()
    overtime_map = {row.month_str: float(row.overtime_total or 0) for row in overtime_raw}

    # ----- BONUS TREND (group by month in Python) -----
    all_bonuses = db.query(Bonus).filter(Bonus.created_at >= months_list[0]).all()
    bonus_map = {}
    for b in all_bonuses:
        month_key = b.created_at.strftime('%Y-%m')
        bonus_map[month_key] = bonus_map.get(month_key, 0.0) + float(b.bonus_amount)

    payroll_trend = []
    for month_start in months_list:
        month_str = month_start.strftime("%b %Y")
        month_ym = month_start.strftime('%Y-%m')
        payroll_trend.append(
            MonthlyTrend(
                month=month_str,
                net_payout=payroll_map.get(month_start, 0.0),
                total_overtime=overtime_map.get(month_ym, 0.0),
                total_bonuses=bonus_map.get(month_ym, 0.0)
            )
        )

    # ----- OVERTIME ANALYSIS (last 6 months) -----
    overtime_analysis_raw = db.query(
        func.date_format(Overtime.month, '%Y-%m').label('month_str'),
        func.sum(Overtime.hours_worked).label('total_hours'),
        func.sum(Overtime.total_amount).label('total_amount'),
        func.count(Overtime.employee_id.distinct()).label('employee_count')
    ).filter(
        Overtime.month >= months_list[0],
        Overtime.month <= months_list[-1].replace(day=28) + relativedelta(days=6)
    ).group_by('month_str').all()

    overtime_analysis = []
    for row in overtime_analysis_raw:
        overtime_analysis.append(
            OvertimeAnalysis(
                month=row.month_str,
                total_hours=float(row.total_hours or 0),
                total_amount=float(row.total_amount or 0),
                employee_count=row.employee_count or 0
            )
        )

    # ----- BONUS DISTRIBUTION (group by month, Python) -----
    bonus_dist_raw = {}
    for b in all_bonuses:
        month_key = b.created_at.strftime('%Y-%m')
        if month_key not in bonus_dist_raw:
            bonus_dist_raw[month_key] = {'total_bonus': 0.0, 'employees': set()}
        bonus_dist_raw[month_key]['total_bonus'] += float(b.bonus_amount)
        bonus_dist_raw[month_key]['employees'].add(b.employee_id)

    bonus_distribution = []
    for month_key in sorted(bonus_dist_raw.keys()):
        d = bonus_dist_raw[month_key]
        bonus_distribution.append(
            BonusDistribution(
                month=month_key,
                total_bonus=d['total_bonus'],
                employee_count=len(d['employees'])
            )
        )

    # ----- EMPLOYEE COST ANALYSIS -----
    base_salary_q = db.query(
        Employee.department,
        func.sum(Employee.base_salary).label('total_salary')
    ).group_by(Employee.department).all()

    overtime_dept_q = db.query(
        Employee.department,
        func.sum(Overtime.total_amount).label('total_overtime')
    ).join(Overtime, Overtime.employee_id == Employee.id).group_by(Employee.department).all()

    bonus_dept_q = db.query(
        Employee.department,
        func.sum(Bonus.bonus_amount).label('total_bonus')
    ).join(Bonus, Bonus.employee_id == Employee.id).group_by(Employee.department).all()

    overtime_map_dept = {r.department: float(r.total_overtime or 0) for r in overtime_dept_q}
    bonus_map_dept = {r.department: float(r.total_bonus or 0) for r in bonus_dept_q}

    employee_cost = []
    for row in base_salary_q:
        dept = row.department or "Unassigned"
        salary = float(row.total_salary or 0)
        ovt = overtime_map_dept.get(dept, 0.0)
        bon = bonus_map_dept.get(dept, 0.0)
        total_cost = salary + ovt + bon
        employee_cost.append(
            EmployeeCost(
                department=dept,
                total_salary=salary,
                total_overtime=ovt,
                total_bonuses=bon,
                total_cost=total_cost
            )
        )

    return AnalyticsResponse(
        total_employees=total_employees,
        current_month_payroll=float(current_month_payroll),
        pending_payslips=pending_payslips,
        total_overtime_this_month=float(total_overtime_this_month),
        total_bonuses_this_month=float(total_bonuses_this_month),
        department_breakdown=department_breakdown,
        payroll_trend=payroll_trend,
        overtime_analysis=overtime_analysis,
        bonus_distribution=bonus_distribution,
        employee_cost=employee_cost
    )