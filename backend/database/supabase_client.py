from supabase import create_client, Client, ClientOptions

from backend.config import settings


class SupabaseClient:
    _instance: Client = None
    
    @classmethod
    def get_client(cls) -> Client:
        if cls._instance is None:
            try:
                options = ClientOptions(schema="public")
                cls._instance = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_KEY,
                    options=options
                )
            except Exception:
                cls._instance = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_KEY
                )
        return cls._instance


def get_db() -> Client:
    """Get Supabase database client"""
    return SupabaseClient.get_client()
