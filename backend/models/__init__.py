"""Pydantic models"""
from .auth import UserSignup, UserLogin, Token, TokenData, UserResponse
from .business import BusinessCreate, BusinessUpdate, BusinessResponse, PhoneNumberLookup
from .staff import (
    StaffCreate, StaffUpdate, StaffResponse,
    AvailabilityTemplateCreate, AvailabilityTemplateUpdate, AvailabilityTemplateResponse,
    AvailabilityExceptionCreate, AvailabilityExceptionResponse,
    BulkAvailabilityCreate
)
from .customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    CustomerLookup, CustomerLookupResponse
)
from .appointment import (
    AppointmentCreate, AppointmentUpdate, AppointmentResponse,
    AppointmentWithDetails, TimeSlot
)
from .ai_config import AIRoleCreate, AIRoleUpdate, AIRoleResponse

__all__ = [
    # Auth
    "UserSignup", "UserLogin", "Token", "TokenData", "UserResponse",
    # Business
    "BusinessCreate", "BusinessUpdate", "BusinessResponse", "PhoneNumberLookup",
    # Staff
    "StaffCreate", "StaffUpdate", "StaffResponse",
    "AvailabilityTemplateCreate", "AvailabilityTemplateUpdate", "AvailabilityTemplateResponse",
    "AvailabilityExceptionCreate", "AvailabilityExceptionResponse", "BulkAvailabilityCreate",
    # Customer
    "CustomerCreate", "CustomerUpdate", "CustomerResponse",
    "CustomerLookup", "CustomerLookupResponse",
    # Appointment
    "AppointmentCreate", "AppointmentUpdate", "AppointmentResponse",
    "AppointmentWithDetails", "TimeSlot",
    # AI Config
    "AIRoleCreate", "AIRoleUpdate", "AIRoleResponse",
]

