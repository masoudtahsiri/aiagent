from datetime import datetime, timedelta
from typing import List, Dict


def get_tools_declaration():
    """Define Gemini function calling tools"""
    return [
        {
            "name": "create_new_customer",
            "description": "Save information for a new customer calling for the first time",
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string", "description": "Customer's first name"},
                    "last_name": {"type": "string", "description": "Customer's last name"},
                    "email": {"type": "string", "description": "Customer's email (optional)"}
                },
                "required": ["first_name", "last_name"]
            }
        },
        {
            "name": "check_availability",
            "description": "Check available appointment times",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Date to start checking (YYYY-MM-DD format). Use today if not specified."
                    }
                },
                "required": []
            }
        },
        {
            "name": "book_appointment",
            "description": "Book an appointment for the customer",
            "parameters": {
                "type": "object",
                "properties": {
                    "appointment_date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format"
                    },
                    "appointment_time": {
                        "type": "string",
                        "description": "Time in HH:MM format (24-hour), like 09:00 or 14:30"
                    }
                },
                "required": ["appointment_date", "appointment_time"]
            }
        }
    ]


def format_slots_for_speech(slots: List[Dict], limit: int = 10) -> str:
    """Format available slots into natural speech"""
    if not slots:
        return "I don't see any available appointments in that time range."
    
    # Group by date
    by_date = {}
    for slot in slots[:limit]:
        date = slot["date"]
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(slot["time"])
    
    # Format for speaking
    lines = []
    for date_str in sorted(by_date.keys())[:3]:  # Max 3 days
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        day_name = date_obj.strftime("%A")
        times = ", ".join(by_date[date_str][:5])  # Max 5 times per day
        
        if len(by_date[date_str]) > 5:
            times += f", and {len(by_date[date_str]) - 5} more times"
        
        lines.append(f"{day_name}: {times}")
    
    return ". ".join(lines)

