# API Documentation

## Base URL

```
http://localhost:8000
```

## Authentication

Most endpoints require authentication via Bearer token:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login and get access token
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout

### Businesses

- `POST /api/businesses` - Create business
- `GET /api/businesses/me` - Get current user's business
- `GET /api/businesses/{business_id}` - Get business by ID
- `PUT /api/businesses/{business_id}` - Update business
- `DELETE /api/businesses/{business_id}` - Delete business
- `GET /api/businesses/{business_id}/stats` - Get business statistics

### Staff

- `POST /api/staff` - Create staff member
- `GET /api/staff/business/{business_id}` - Get all staff for business
- `GET /api/staff/{staff_id}` - Get staff by ID
- `PUT /api/staff/{staff_id}` - Update staff
- `DELETE /api/staff/{staff_id}` - Delete staff
- `POST /api/staff/availability` - Create availability template
- `GET /api/staff/{staff_id}/availability` - Get staff availability
- `POST /api/staff/{staff_id}/generate-slots` - Generate time slots

### Customers

- `POST /api/customers/lookup` - Lookup customer by phone (no auth)
- `POST /api/customers/create` - Create customer (for AI agent, no auth)
- `POST /api/customers` - Create customer
- `GET /api/customers/business/{business_id}` - Get business customers
- `GET /api/customers/{customer_id}` - Get customer by ID
- `PUT /api/customers/{customer_id}` - Update customer
- `DELETE /api/customers/{customer_id}` - Delete customer

### Appointments

- `GET /api/appointments/staff/{staff_id}/slots` - Get available slots (no auth)
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/business/{business_id}` - Get business appointments
- `GET /api/appointments/{appointment_id}` - Get appointment by ID
- `PUT /api/appointments/{appointment_id}` - Update appointment
- `DELETE /api/appointments/{appointment_id}` - Cancel appointment

### AI Configuration

- `POST /api/ai/lookup-by-phone` - Lookup business by phone (no auth)
- `POST /api/ai/roles` - Create AI role
- `GET /api/ai/roles/{business_id}` - Get AI roles for business
- `PUT /api/ai/roles/{role_id}` - Update AI role

## Health Check

- `GET /health` - Health check endpoint

