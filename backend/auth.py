import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-only-key-change-in-production-min-32-chars')
ALGORITHM = 'HS256'
EXPIRE_HOURS = 24

def hash_password(password: str) -> str:
    """Hash password using bcrypt - handles 72 byte limit"""
    if len(password.encode('utf-8')) > 72:
        raise ValueError("Password too long - maximum 72 characters allowed")
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    """Verify password against hash"""
    try:
        if len(plain.encode('utf-8')) > 72:
            return False  # Invalid password length
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def create_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode['exp'] = datetime.utcnow() + timedelta(hours=EXPIRE_HOURS)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
