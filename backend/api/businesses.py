from fastapi import APIRouter, Depends, HTTPException, status
import sys
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from models.business import BusinessCreate, BusinessUpdate, BusinessResponse
from services.business_service import BusinessService
from middleware.auth import get_current_active_user


router = APIRouter(prefix="/api/businesses", tags=["Business Management"])


@router.post("", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_business(
    business_data: BusinessCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Create a new business (during onboarding)
    
    - **business_name**: Name of the business
    - **industry**: Industry type (medical, salon, legal, etc.)
    - **phone_number**: Business phone number (optional)
    - **address**: Business address (optional)
    """
    business_dict = business_data.model_dump()
    return await BusinessService.create_business(business_dict, current_user["id"])


@router.get("/me", response_model=Optional[BusinessResponse])
async def get_my_business(current_user: dict = Depends(get_current_active_user)):
    """
    Get current user's business
    """
    business = await BusinessService.get_user_business(current_user["id"])
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business found for this user"
        )
    return business


@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(
    business_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get business by ID
    """
    # Verify user has access to this business
    user_business = await BusinessService.get_user_business(current_user["id"])
    if not user_business or user_business["id"] != business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this business"
        )
    
    return await BusinessService.get_business(business_id)


@router.put("/{business_id}", response_model=BusinessResponse)
async def update_business(
    business_id: str,
    business_data: BusinessUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update business information
    """
    update_dict = business_data.model_dump(exclude_unset=True)
    return await BusinessService.update_business(business_id, update_dict, current_user["id"])


@router.delete("/{business_id}")
async def delete_business(
    business_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Delete/deactivate business
    """
    return await BusinessService.delete_business(business_id, current_user["id"])


@router.get("/{business_id}/stats")
async def get_business_stats(
    business_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get business statistics (staff count, customer count, etc.)
    """
    return await BusinessService.get_business_stats(business_id, current_user["id"])

