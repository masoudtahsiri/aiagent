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
from .service import ServiceCreate, ServiceUpdate, ServiceResponse
from .knowledge_base import FAQCreate, FAQUpdate, FAQResponse
from .call_log import CallLogCreate, CallLogUpdate, CallLogResponse
from .business_hours import BusinessHourEntry, BusinessHoursSet, BusinessClosureCreate, BusinessClosureResponse

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
    # Service
    "ServiceCreate", "ServiceUpdate", "ServiceResponse",
    # Knowledge Base
    "FAQCreate", "FAQUpdate", "FAQResponse",
    # Call Log
    "CallLogCreate", "CallLogUpdate", "CallLogResponse",
    # Business Hours
    "BusinessHourEntry", "BusinessHoursSet", "BusinessClosureCreate", "BusinessClosureResponse",
]

