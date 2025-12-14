"""Knowledge base / FAQ endpoints"""

from fastapi import APIRouter, Depends, Query

from typing import List, Optional



from backend.models.knowledge_base import FAQCreate, FAQUpdate, FAQResponse

from backend.services.knowledge_base_service import KnowledgeBaseService

from backend.middleware.auth import get_current_active_user



router = APIRouter(prefix="/api/knowledge-base", tags=["Knowledge Base"])





@router.get("/business/{business_id}", response_model=List[FAQResponse])

async def get_business_faqs(

    business_id: str,

    category: Optional[str] = Query(None)

):

    """Get all FAQs for a business (no auth - for AI agent)"""

    return await KnowledgeBaseService.get_business_faqs(business_id, category)





@router.get("/search/{business_id}")

async def search_faqs(

    business_id: str,

    q: str = Query(..., min_length=2)

):

    """Search FAQs (no auth - for AI agent)"""

    return await KnowledgeBaseService.search_faqs(business_id, q)





@router.post("", response_model=FAQResponse)

async def create_faq(

    faq_data: FAQCreate,

    current_user: dict = Depends(get_current_active_user)

):

    """Create a new FAQ entry"""

    return await KnowledgeBaseService.create_faq(faq_data.model_dump(), current_user["id"])





@router.put("/{faq_id}", response_model=FAQResponse)

async def update_faq(

    faq_id: str,

    faq_data: FAQUpdate,

    current_user: dict = Depends(get_current_active_user)

):

    """Update FAQ entry"""

    return await KnowledgeBaseService.update_faq(faq_id, faq_data.model_dump(exclude_unset=True), current_user["id"])





@router.delete("/{faq_id}")

async def delete_faq(

    faq_id: str,

    current_user: dict = Depends(get_current_active_user)

):

    """Delete FAQ entry"""

    return await KnowledgeBaseService.delete_faq(faq_id, current_user["id"])









