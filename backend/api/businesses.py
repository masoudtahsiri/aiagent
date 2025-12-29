from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Optional, List
import uuid

from backend.models.business import (
    BusinessCreate,
    BusinessUpdate,
    BusinessResponse,
    IndustryType,
    VALID_INDUSTRIES,
    SUPPORTED_CURRENCIES,
)
from backend.services.business_service import BusinessService
from backend.database.supabase_client import get_db
from backend.middleware.auth import get_current_active_user


router = APIRouter(prefix="/api/businesses", tags=["Business Management"])

# Allowed image types for logo upload
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.get("/industries", response_model=List[str])
async def get_available_industries():
    """Get list of available industry types for business registration"""
    return VALID_INDUSTRIES


@router.get("/currencies")
async def get_available_currencies():
    """Get list of supported currencies"""
    return SUPPORTED_CURRENCIES


@router.post("", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_business(
    business_data: BusinessCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new business (during onboarding)"""
    business_dict = business_data.model_dump()
    return await BusinessService.create_business(business_dict, current_user["id"])


@router.get("/me", response_model=Optional[BusinessResponse])
async def get_my_business(current_user: dict = Depends(get_current_active_user)):
    """Get current user's business"""
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
    """Get business by ID"""
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
    """Update business information"""
    update_dict = business_data.model_dump(exclude_unset=True)
    return await BusinessService.update_business(business_id, update_dict, current_user["id"])


@router.delete("/{business_id}")
async def delete_business(
    business_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete/deactivate business"""
    return await BusinessService.delete_business(business_id, current_user["id"])


@router.get("/{business_id}/stats")
async def get_business_stats(
    business_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get business statistics"""
    return await BusinessService.get_business_stats(business_id, current_user["id"])


@router.post("/me/logo", response_model=dict)
async def upload_business_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user)
):
    """Upload business logo to Supabase Storage"""
    db = get_db()

    # Get user's business
    user_result = db.table("users").select("business_id").eq("id", current_user["id"]).execute()
    if not user_result.data or not user_result.data[0].get("business_id"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business found for this user"
        )

    business_id = user_result.data[0]["business_id"]

    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{business_id}/{uuid.uuid4()}.{file_extension}"

    try:
        # Upload to Supabase Storage
        storage_response = db.storage.from_("business-logos").upload(
            filename,
            content,
            {"content-type": file.content_type}
        )

        # Get public URL
        public_url = db.storage.from_("business-logos").get_public_url(filename)

        # Update business with logo URL
        db.table("businesses").update({
            "logo_url": public_url
        }).eq("id", business_id).execute()

        return {
            "logo_url": public_url,
            "message": "Logo uploaded successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload logo: {str(e)}"
        )


@router.delete("/me/logo")
async def delete_business_logo(
    current_user: dict = Depends(get_current_active_user)
):
    """Delete business logo"""
    db = get_db()

    # Get user's business
    user_result = db.table("users").select("business_id").eq("id", current_user["id"]).execute()
    if not user_result.data or not user_result.data[0].get("business_id"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business found for this user"
        )

    business_id = user_result.data[0]["business_id"]

    # Get current logo URL
    business_result = db.table("businesses").select("logo_url").eq("id", business_id).execute()
    if business_result.data and business_result.data[0].get("logo_url"):
        logo_url = business_result.data[0]["logo_url"]

        # Extract file path from URL and delete from storage
        try:
            # The URL format is: https://xxx.supabase.co/storage/v1/object/public/business-logos/path
            if "business-logos/" in logo_url:
                file_path = logo_url.split("business-logos/")[-1]
                db.storage.from_("business-logos").remove([file_path])
        except Exception:
            pass  # Ignore storage deletion errors

    # Clear logo URL in database
    db.table("businesses").update({
        "logo_url": None
    }).eq("id", business_id).execute()

    return {"message": "Logo deleted successfully"}
