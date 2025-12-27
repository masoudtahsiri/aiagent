from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


# Valid industry/business types - must match frontend config
class IndustryType(str, Enum):
    RESTAURANT = "restaurant"
    MEDICAL = "medical"
    SALON = "salon"
    SPA = "spa"
    REAL_ESTATE = "real_estate"
    LEGAL = "legal"
    HOME_SERVICES = "home_services"
    AUTO_REPAIR = "auto_repair"
    FITNESS = "fitness"
    VET = "vet"
    HOTEL = "hotel"
    THERAPY = "therapy"
    MED_SPA = "med_spa"
    CLEANING = "cleaning"
    PHOTOGRAPHY = "photography"
    GENERIC = "generic"


# List of valid industry values for validation
VALID_INDUSTRIES = [e.value for e in IndustryType]

# Common industry aliases for normalization
INDUSTRY_ALIASES = {
    "healthcare": "medical",
    "dental": "medical",
    "doctor": "medical",
    "clinic": "medical",
    "hair_salon": "salon",
    "beauty": "salon",
    "barbershop": "salon",
    "barber": "salon",
    "wellness": "spa",
    "massage": "spa",
    "realtor": "real_estate",
    "realestate": "real_estate",
    "property": "real_estate",
    "law": "legal",
    "attorney": "legal",
    "lawyer": "legal",
    "plumber": "home_services",
    "plumbing": "home_services",
    "hvac": "home_services",
    "electrician": "home_services",
    "contractor": "home_services",
    "handyman": "home_services",
    "mechanic": "auto_repair",
    "auto": "auto_repair",
    "automotive": "auto_repair",
    "car_repair": "auto_repair",
    "gym": "fitness",
    "yoga": "fitness",
    "pilates": "fitness",
    "personal_training": "fitness",
    "veterinary": "vet",
    "veterinarian": "vet",
    "pet": "vet",
    "animal": "vet",
    "motel": "hotel",
    "lodging": "hotel",
    "accommodation": "hotel",
    "counseling": "therapy",
    "therapist": "therapy",
    "psychologist": "therapy",
    "psychiatrist": "therapy",
    "medspa": "med_spa",
    "aesthetics": "med_spa",
    "cosmetic": "med_spa",
    "house_cleaning": "cleaning",
    "maid": "cleaning",
    "janitorial": "cleaning",
    "photo": "photography",
    "photographer": "photography",
    "videography": "photography",
    "food": "restaurant",
    "cafe": "restaurant",
    "bar": "restaurant",
    "dining": "restaurant",
}


def normalize_industry_value(value: str) -> str:
    """
    Normalize an industry value to a valid IndustryType.
    Handles common aliases and variations.
    Returns 'generic' for unknown types.
    """
    if not value:
        return "generic"

    # Convert to lowercase and replace spaces/hyphens with underscores
    normalized = str(value).lower().strip().replace(" ", "_").replace("-", "_")

    # Check aliases first
    if normalized in INDUSTRY_ALIASES:
        return INDUSTRY_ALIASES[normalized]

    # Check if it's a valid industry
    if normalized in VALID_INDUSTRIES:
        return normalized

    # Default to generic for unknown types
    return "generic"


class BusinessBase(BaseModel):
    business_name: str
    industry: str = "generic"  # Default to generic
    phone_number: Optional[str] = None  # Business contact (not AI phone)
    ai_phone_number: Optional[str] = None  # Dedicated AI receptionist number
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    website: Optional[str] = None
    timezone: str = "America/New_York"

    @field_validator('industry', mode='before')
    @classmethod
    def validate_industry(cls, v):
        """Normalize industry value to valid type or default to generic"""
        if v is None:
            return "generic"
        return normalize_industry_value(v)


class BusinessCreate(BusinessBase):
    owner_email: EmailStr


class BusinessUpdate(BaseModel):
    business_name: Optional[str] = None
    industry: Optional[str] = None
    phone_number: Optional[str] = None
    ai_phone_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    website: Optional[str] = None
    timezone: Optional[str] = None

    @field_validator('industry', mode='before')
    @classmethod
    def validate_industry(cls, v):
        """Normalize industry value to valid type (skip if None for optional update)"""
        if v is None:
            return None  # Don't normalize None - field is optional
        return normalize_industry_value(v)


class BusinessResponse(BusinessBase):
    id: str
    owner_email: str
    subscription_tier: str
    subscription_status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# For phone number lookup
class PhoneNumberLookup(BaseModel):
    phone_number: str
