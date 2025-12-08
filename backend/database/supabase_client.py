from supabase import create_client, Client, ClientOptions
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import settings


class SupabaseClient:
    _instance: Client = None
    
    @classmethod
    def get_client(cls) -> Client:
        if cls._instance is None:
            # Try to use public schema explicitly
            # If that fails, the schema needs to be exposed via SQL
            try:
                options = ClientOptions(schema="public")
                cls._instance = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_KEY,
                    options=options
                )
            except Exception:
                # Fallback to default (will fail if schema not exposed)
                cls._instance = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_KEY
                )
        return cls._instance


def get_db() -> Client:
    """Get Supabase database client"""
    return SupabaseClient.get_client()

