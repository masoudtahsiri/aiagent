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

# Supported currencies (expanded to support worldwide)
SUPPORTED_CURRENCIES = [
    {"code": "USD", "symbol": "$", "name": "US Dollar"},
    {"code": "EUR", "symbol": "€", "name": "Euro"},
    {"code": "GBP", "symbol": "£", "name": "British Pound"},
    {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar"},
    {"code": "AUD", "symbol": "A$", "name": "Australian Dollar"},
    {"code": "NZD", "symbol": "NZ$", "name": "New Zealand Dollar"},
    {"code": "CHF", "symbol": "CHF", "name": "Swiss Franc"},
    {"code": "SEK", "symbol": "kr", "name": "Swedish Krona"},
    {"code": "NOK", "symbol": "kr", "name": "Norwegian Krone"},
    {"code": "DKK", "symbol": "kr", "name": "Danish Krone"},
    {"code": "PLN", "symbol": "zł", "name": "Polish Zloty"},
    {"code": "CZK", "symbol": "Kč", "name": "Czech Koruna"},
    {"code": "HUF", "symbol": "Ft", "name": "Hungarian Forint"},
    {"code": "RON", "symbol": "lei", "name": "Romanian Leu"},
    {"code": "BGN", "symbol": "лв", "name": "Bulgarian Lev"},
    {"code": "TRY", "symbol": "₺", "name": "Turkish Lira"},
    {"code": "RUB", "symbol": "₽", "name": "Russian Ruble"},
    {"code": "UAH", "symbol": "₴", "name": "Ukrainian Hryvnia"},
    {"code": "JPY", "symbol": "¥", "name": "Japanese Yen"},
    {"code": "CNY", "symbol": "¥", "name": "Chinese Yuan"},
    {"code": "KRW", "symbol": "₩", "name": "South Korean Won"},
    {"code": "INR", "symbol": "₹", "name": "Indian Rupee"},
    {"code": "SGD", "symbol": "S$", "name": "Singapore Dollar"},
    {"code": "HKD", "symbol": "HK$", "name": "Hong Kong Dollar"},
    {"code": "TWD", "symbol": "NT$", "name": "New Taiwan Dollar"},
    {"code": "THB", "symbol": "฿", "name": "Thai Baht"},
    {"code": "MYR", "symbol": "RM", "name": "Malaysian Ringgit"},
    {"code": "IDR", "symbol": "Rp", "name": "Indonesian Rupiah"},
    {"code": "PHP", "symbol": "₱", "name": "Philippine Peso"},
    {"code": "VND", "symbol": "₫", "name": "Vietnamese Dong"},
    {"code": "AED", "symbol": "د.إ", "name": "UAE Dirham"},
    {"code": "SAR", "symbol": "﷼", "name": "Saudi Riyal"},
    {"code": "QAR", "symbol": "﷼", "name": "Qatari Riyal"},
    {"code": "KWD", "symbol": "د.ك", "name": "Kuwaiti Dinar"},
    {"code": "BHD", "symbol": ".د.ب", "name": "Bahraini Dinar"},
    {"code": "OMR", "symbol": "﷼", "name": "Omani Rial"},
    {"code": "ILS", "symbol": "₪", "name": "Israeli Shekel"},
    {"code": "EGP", "symbol": "£", "name": "Egyptian Pound"},
    {"code": "ZAR", "symbol": "R", "name": "South African Rand"},
    {"code": "NGN", "symbol": "₦", "name": "Nigerian Naira"},
    {"code": "KES", "symbol": "KSh", "name": "Kenyan Shilling"},
    {"code": "MAD", "symbol": "د.م.", "name": "Moroccan Dirham"},
    {"code": "BRL", "symbol": "R$", "name": "Brazilian Real"},
    {"code": "MXN", "symbol": "$", "name": "Mexican Peso"},
    {"code": "ARS", "symbol": "$", "name": "Argentine Peso"},
    {"code": "CLP", "symbol": "$", "name": "Chilean Peso"},
    {"code": "COP", "symbol": "$", "name": "Colombian Peso"},
    {"code": "PEN", "symbol": "S/", "name": "Peruvian Sol"},
    {"code": "PKR", "symbol": "₨", "name": "Pakistani Rupee"},
    {"code": "BDT", "symbol": "৳", "name": "Bangladeshi Taka"},
    {"code": "LKR", "symbol": "₨", "name": "Sri Lankan Rupee"},
    {"code": "NPR", "symbol": "₨", "name": "Nepalese Rupee"},
]

VALID_CURRENCY_CODES = [c["code"] for c in SUPPORTED_CURRENCIES]

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
    currency: str = "USD"  # Default to US Dollar
    phone_number: Optional[str] = None  # Business contact (not AI phone)
    ai_phone_number: Optional[str] = None  # Dedicated AI receptionist number
    email: Optional[str] = None  # Business contact email
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "US"  # ISO 3166-1 alpha-2 country code
    website: Optional[str] = None
    timezone: str = "America/New_York"
    logo_url: Optional[str] = None  # Business logo URL
    instagram_url: Optional[str] = None  # Instagram profile URL
    facebook_url: Optional[str] = None  # Facebook page URL

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
    currency: Optional[str] = None
    phone_number: Optional[str] = None
    ai_phone_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None  # ISO 3166-1 alpha-2 country code
    website: Optional[str] = None
    timezone: Optional[str] = None
    logo_url: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None

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
