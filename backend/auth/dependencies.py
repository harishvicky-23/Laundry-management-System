from jose import JWTError, jwt
from fastapi import (Depends,HTTPException,status)
from fastapi.security import (OAuth2PasswordBearer)
from sqlalchemy.orm import Session
from config.db import get_db
from models.user import User
from auth.jwt_handler import (SECRET_KEY,ALGORITHM)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme),db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
        user_id = payload.get("user_id")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )
    user = (db.query(User).filter(User.id == user_id).first())

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )
    return user

