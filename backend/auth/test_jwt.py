from jwt_handler import create_access_token,SECRET_KEY,ALGORITHM

token = create_access_token(
    {
        "user_id": 1,
        "role": "ADMIN"
    }
)

print(token)

from jose import jwt

payload = jwt.decode(
    token,
    SECRET_KEY,
    algorithms=[ALGORITHM]
)

print(payload)