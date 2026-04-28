from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.models import User, Employee
from app.schemas.schemas import TokenData

# OAuth2 scheme – tells FastAPI where to get the token for Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Decode the JWT token and return the corresponding User from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        # Store the role from the token for possible use (e.g., logging)
        token_data = TokenData(username=username, role=payload.get("role"))
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Return the current user if active.
    (If your User model has an `is_active` column, uncomment the check.)
    """
    # if not current_user.is_active:
    #     raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_role(required_role: str):
    """
    Dependency factory to enforce that the current user has the required role
    (or is ADMIN, which overrides).
    """
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role != required_role and current_user.role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {required_role} (or ADMIN). Your role: {current_user.role}"
            )
        return current_user
    return role_checker


def get_current_employee(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Return the Employee record linked to the current user."""
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    return employee  # May be None for HR/Admin without employee profile