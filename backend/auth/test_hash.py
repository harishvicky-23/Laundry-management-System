from hashing import (
    hash_password,
    verify_password
)

password = "1234"

hashed = hash_password(password)

print(hashed)

print(
    verify_password(
        "1234",
        hashed
    )
)