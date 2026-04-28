from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import Optional
import jwt
import bcrypt
import uuid

from app.models.user import UserCreate, UserLogin, UserResponse, Token

router = APIRouter()

# 临时用户存储（实际应该用数据库）
fake_users_db = {}

# JWT配置（应该放在config.py中）
SECRET_KEY = "your-super-secret-jwt-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    """用户注册"""
    if user.username in fake_users_db:
        raise HTTPException(
            status_code=400,
            detail="用户名已被注册"
        )
    
    # 密码加密
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    
    user_data = {
        "id": str(uuid.uuid4()),
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "hashed_password": hashed_password.decode('utf-8'),
        "created_at": datetime.now().isoformat(),
        "is_active": True
    }
    
    fake_users_db[user.username] = user_data
    print(f"用户注册成功: {user.username}")
    
    return user_data

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """用户登录"""
    user = fake_users_db.get(form_data.username)
    if not user or not bcrypt.checkpw(form_data.password.encode('utf-8'), user["hashed_password"].encode('utf-8')):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 创建JWT token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 健康检查端点
@router.get("/test")
async def test_auth():
    return {"message": "认证模块正常工作"}