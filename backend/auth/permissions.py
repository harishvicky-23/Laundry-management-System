from fastapi import Depends, HTTPException
from auth.dependencies import get_current_user
from models.user import User
from models.enums import UserRole


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user

def require_attendant(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ATTENDANT:
        raise HTTPException(
            status_code=403,
            detail="Attendant access required"
        )
    return current_user

def require_student(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=403,
            detail="Student access required"
        )
    return current_user

def require_staff(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN.value, UserRole.ATTENDANT.value]:
        raise HTTPException(
            status_code=403, 
            detail="Staff clearance required to access dashboard metrics"
        )
    return current_user