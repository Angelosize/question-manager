from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta
from typing import Dict, Any

from app.models.user import UserCreate, UserResponse, Token
from app.core.user_manager import UserManager, get_user_manager
from app.core.auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _public_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """过滤掉 hashed_password 等敏感字段"""
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user.get("full_name"),
        "created_at": user["created_at"],
        "is_active": user.get("is_active", True),
        "role": user.get("role", "user"),
    }


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, um: UserManager = Depends(get_user_manager)):
    """用户注册"""
    if um.get_by_username(user.username):
        raise HTTPException(status_code=400, detail="用户名已被注册")
    if um.get_by_email(user.email):
        raise HTTPException(status_code=400, detail="邮箱已被注册")

    created = um.create(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hash_password(user.password),
    )
    print(f"✅ 用户注册成功: {user.username}")
    return _public_user(created)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    um: UserManager = Depends(get_user_manager),
):
    """用户登录（OAuth2 password 表单）"""
    user = um.get_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="账号已被禁用")

    token = create_access_token(
        data={"sub": user["username"], "uid": user["id"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    print(f"🔑 用户登录: {user['username']}")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _public_user(user),
    }


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    um: UserManager = Depends(get_user_manager),
) -> Dict[str, Any]:
    """
    ⭐ 供其他路由使用的鉴权依赖。
    用法：
        @router.get("/something")
        async def foo(current_user = Depends(get_current_user)):
            ...
    """
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="登录已失效，请重新登录",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if not payload:
        raise cred_exc

    username = payload.get("sub")
    if not username:
        raise cred_exc

    user = um.get_by_username(username)
    if not user:
        raise cred_exc
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="账号已被禁用")

    return user


@router.get("/me", response_model=UserResponse)
async def me(current: Dict[str, Any] = Depends(get_current_user)):
    """获取当前登录用户信息（前端启动时可调一次校验 token）"""
    return _public_user(current)


@router.get("/test")
async def test_auth():
    return {"message": "认证模块正常工作"}