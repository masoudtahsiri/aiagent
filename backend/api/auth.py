from fastapi import APIRouter, Depends
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from models.auth import UserSignup, UserLogin, UserResponse
from services.auth_service import AuthService
from middleware.auth import get_current_active_user


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=dict)
async def signup(user_data: UserSignup):
    """
    Create a new user account
    
    - **email**: User's email address
    - **password**: User's password (min 8 characters)
    - **full_name**: User's full name
    """
    return await AuthService.signup(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name
    )


@router.post("/login", response_model=dict)
async def login(credentials: UserLogin):
    """
    Login and receive access token
    
    - **email**: User's email address
    - **password**: User's password
    """
    return await AuthService.login(
        email=credentials.email,
        password=credentials.password
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_active_user)):
    """
    Get current user information
    
    Requires authentication token in header:
    Authorization: Bearer <token>
    """
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "business_id": current_user.get("business_id"),
        "role": current_user["role"],
        "is_active": current_user["is_active"]
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_active_user)):
    """
    Logout (client should delete token)
    """
    return {"message": "Successfully logged out"}

