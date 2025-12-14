"""Service management endpoints"""

from fastapi import APIRouter, Depends, Query

from typing import List, Optional



from backend.models.service import ServiceCreate, ServiceUpdate, ServiceResponse

from backend.services.service_service import ServiceService

from backend.middleware.auth import get_current_active_user



router = APIRouter(prefix="/api/services", tags=["Services"])





@router.get("/business/{business_id}", response_model=List[ServiceResponse])

async def get_business_services(

    business_id: str,

    include_inactive: bool = Query(False)

):

    """Get all services for a business (no auth - for AI agent)"""

    return await ServiceService.get_business_services(business_id, include_inactive)





@router.get("/{service_id}", response_model=ServiceResponse)

async def get_service(service_id: str):

    """Get service by ID (no auth - for AI agent)"""

    return await ServiceService.get_service(service_id)





@router.post("", response_model=ServiceResponse)

async def create_service(

    service_data: ServiceCreate,

    current_user: dict = Depends(get_current_active_user)

):

    """Create a new service"""

    return await ServiceService.create_service(service_data.model_dump(), current_user["id"])





@router.put("/{service_id}", response_model=ServiceResponse)

async def update_service(

    service_id: str,

    service_data: ServiceUpdate,

    current_user: dict = Depends(get_current_active_user)

):

    """Update service"""

    return await ServiceService.update_service(service_id, service_data.model_dump(exclude_unset=True), current_user["id"])





@router.delete("/{service_id}")

async def delete_service(

    service_id: str,

    current_user: dict = Depends(get_current_active_user)

):

    """Delete service"""

    return await ServiceService.delete_service(service_id, current_user["id"])





@router.get("/{service_id}/staff")

async def get_staff_for_service(service_id: str):

    """Get staff members who can perform this service (no auth - for AI agent)"""

    return await ServiceService.get_staff_for_service(service_id)









