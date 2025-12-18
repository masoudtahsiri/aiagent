"""
Language Detection Module for Universal AI Agent

This module provides automatic language detection based on:
1. Customer's stored language preference (highest priority)
2. Phone number prefix/country code
3. Business default language (fallback)

Supports 45+ languages with native greetings and appropriate voice selection.

Usage:
    from language_detector import detect_language, get_localized_greeting
    
    lang_info = detect_language(
        caller_phone="+905551234567",
        customer={"language": "tr"},
        business_default="en"
    )
    # Returns: {"code": "tr", "name": "Turkish", "greeting": "Merhaba", ...}
"""

from typing import Dict, Optional, Any
from dataclasses import dataclass


@dataclass
class LanguageInfo:
    """Language information container"""
    code: str
    name: str
    greeting: str
    voice: str
    source: str
    
    def to_dict(self) -> Dict[str, str]:
        return {
            "code": self.code,
            "name": self.name,
            "greeting": self.greeting,
            "voice": self.voice,
            "source": self.source
        }


# ═══════════════════════════════════════════════════════════════════════════════
# PHONE PREFIX TO LANGUAGE MAPPING
# ═══════════════════════════════════════════════════════════════════════════════

PHONE_PREFIX_LANGUAGES: Dict[str, Dict[str, str]] = {
    # ─────────────────────────────────────────────────────────────────────────────
    # EUROPE
    # ─────────────────────────────────────────────────────────────────────────────
    "+90": {
        "language": "tr",
        "name": "Turkish",
        "greeting": "Merhaba",
        "formal_greeting": "İyi günler",
        "voice": "Aoede"  # Good for Turkish
    },
    "+44": {
        "language": "en-GB",
        "name": "English (UK)",
        "greeting": "Hello",
        "formal_greeting": "Good day",
        "voice": "Kore"
    },
    "+49": {
        "language": "de",
        "name": "German",
        "greeting": "Guten Tag",
        "formal_greeting": "Guten Tag",
        "voice": "Kore"
    },
    "+33": {
        "language": "fr",
        "name": "French",
        "greeting": "Bonjour",
        "formal_greeting": "Bonjour",
        "voice": "Kore"
    },
    "+34": {
        "language": "es",
        "name": "Spanish",
        "greeting": "Hola",
        "formal_greeting": "Buenos días",
        "voice": "Kore"
    },
    "+39": {
        "language": "it",
        "name": "Italian",
        "greeting": "Buongiorno",
        "formal_greeting": "Buongiorno",
        "voice": "Kore"
    },
    "+31": {
        "language": "nl",
        "name": "Dutch",
        "greeting": "Hallo",
        "formal_greeting": "Goedendag",
        "voice": "Kore"
    },
    "+32": {
        "language": "nl",
        "name": "Dutch (Belgium)",
        "greeting": "Hallo",
        "formal_greeting": "Goedendag",
        "voice": "Kore"
    },
    "+43": {
        "language": "de-AT",
        "name": "German (Austria)",
        "greeting": "Grüß Gott",
        "formal_greeting": "Guten Tag",
        "voice": "Kore"
    },
    "+41": {
        "language": "de-CH",
        "name": "German (Swiss)",
        "greeting": "Grüezi",
        "formal_greeting": "Guten Tag",
        "voice": "Kore"
    },
    "+46": {
        "language": "sv",
        "name": "Swedish",
        "greeting": "Hej",
        "formal_greeting": "God dag",
        "voice": "Kore"
    },
    "+47": {
        "language": "no",
        "name": "Norwegian",
        "greeting": "Hei",
        "formal_greeting": "God dag",
        "voice": "Kore"
    },
    "+45": {
        "language": "da",
        "name": "Danish",
        "greeting": "Hej",
        "formal_greeting": "Goddag",
        "voice": "Kore"
    },
    "+358": {
        "language": "fi",
        "name": "Finnish",
        "greeting": "Hei",
        "formal_greeting": "Hyvää päivää",
        "voice": "Kore"
    },
    "+48": {
        "language": "pl",
        "name": "Polish",
        "greeting": "Cześć",
        "formal_greeting": "Dzień dobry",
        "voice": "Kore"
    },
    "+420": {
        "language": "cs",
        "name": "Czech",
        "greeting": "Ahoj",
        "formal_greeting": "Dobrý den",
        "voice": "Kore"
    },
    "+421": {
        "language": "sk",
        "name": "Slovak",
        "greeting": "Ahoj",
        "formal_greeting": "Dobrý deň",
        "voice": "Kore"
    },
    "+36": {
        "language": "hu",
        "name": "Hungarian",
        "greeting": "Szia",
        "formal_greeting": "Jó napot",
        "voice": "Kore"
    },
    "+40": {
        "language": "ro",
        "name": "Romanian",
        "greeting": "Salut",
        "formal_greeting": "Bună ziua",
        "voice": "Kore"
    },
    "+30": {
        "language": "el",
        "name": "Greek",
        "greeting": "Γεια σου",
        "formal_greeting": "Γεια σας",
        "voice": "Kore"
    },
    "+351": {
        "language": "pt",
        "name": "Portuguese",
        "greeting": "Olá",
        "formal_greeting": "Bom dia",
        "voice": "Kore"
    },
    "+7": {
        "language": "ru",
        "name": "Russian",
        "greeting": "Привет",
        "formal_greeting": "Здравствуйте",
        "voice": "Kore"
    },
    "+380": {
        "language": "uk",
        "name": "Ukrainian",
        "greeting": "Привіт",
        "formal_greeting": "Вітаю",
        "voice": "Kore"
    },
    "+375": {
        "language": "be",
        "name": "Belarusian",
        "greeting": "Прывітанне",
        "formal_greeting": "Добры дзень",
        "voice": "Kore"
    },
    "+359": {
        "language": "bg",
        "name": "Bulgarian",
        "greeting": "Здравей",
        "formal_greeting": "Здравейте",
        "voice": "Kore"
    },
    "+381": {
        "language": "sr",
        "name": "Serbian",
        "greeting": "Здраво",
        "formal_greeting": "Добар дан",
        "voice": "Kore"
    },
    "+385": {
        "language": "hr",
        "name": "Croatian",
        "greeting": "Bok",
        "formal_greeting": "Dobar dan",
        "voice": "Kore"
    },
    "+386": {
        "language": "sl",
        "name": "Slovenian",
        "greeting": "Živjo",
        "formal_greeting": "Dober dan",
        "voice": "Kore"
    },
    "+353": {
        "language": "en-IE",
        "name": "English (Ireland)",
        "greeting": "Hello",
        "formal_greeting": "Good day",
        "voice": "Kore"
    },
    "+354": {
        "language": "is",
        "name": "Icelandic",
        "greeting": "Halló",
        "formal_greeting": "Góðan dag",
        "voice": "Kore"
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # AMERICAS
    # ─────────────────────────────────────────────────────────────────────────────
    "+1": {
        "language": "en-US",
        "name": "English (US)",
        "greeting": "Hello",
        "formal_greeting": "Good day",
        "voice": "Kore"
    },
    "+52": {
        "language": "es-MX",
        "name": "Spanish (Mexico)",
        "greeting": "Hola",
        "formal_greeting": "Buenos días",
        "voice": "Kore"
    },
    "+55": {
        "language": "pt-BR",
        "name": "Portuguese (Brazil)",
        "greeting": "Olá",
        "formal_greeting": "Bom dia",
        "voice": "Kore"
    },
    "+54": {
        "language": "es-AR",
        "name": "Spanish (Argentina)",
        "greeting": "Hola",
        "formal_greeting": "Buen día",
        "voice": "Kore"
    },
    "+56": {
        "language": "es-CL",
        "name": "Spanish (Chile)",
        "greeting": "Hola",
        "formal_greeting": "Buenos días",
        "voice": "Kore"
    },
    "+57": {
        "language": "es-CO",
        "name": "Spanish (Colombia)",
        "greeting": "Hola",
        "formal_greeting": "Buenos días",
        "voice": "Kore"
    },
    "+58": {
        "language": "es-VE",
        "name": "Spanish (Venezuela)",
        "greeting": "Hola",
        "formal_greeting": "Buenos días",
        "voice": "Kore"
    },
    "+51": {
        "language": "es-PE",
        "name": "Spanish (Peru)",
        "greeting": "Hola",
        "formal_greeting": "Buenos días",
        "voice": "Kore"
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # MIDDLE EAST & AFRICA
    # ─────────────────────────────────────────────────────────────────────────────
    "+971": {
        "language": "ar",
        "name": "Arabic (UAE)",
        "greeting": "مرحبا",
        "formal_greeting": "السلام عليكم",
        "voice": "Kore"
    },
    "+966": {
        "language": "ar",
        "name": "Arabic (Saudi)",
        "greeting": "مرحبا",
        "formal_greeting": "السلام عليكم",
        "voice": "Kore"
    },
    "+20": {
        "language": "ar-EG",
        "name": "Arabic (Egypt)",
        "greeting": "أهلا",
        "formal_greeting": "السلام عليكم",
        "voice": "Kore"
    },
    "+212": {
        "language": "ar-MA",
        "name": "Arabic (Morocco)",
        "greeting": "مرحبا",
        "formal_greeting": "السلام عليكم",
        "voice": "Kore"
    },
    "+972": {
        "language": "he",
        "name": "Hebrew",
        "greeting": "שלום",
        "formal_greeting": "שלום",
        "voice": "Kore"
    },
    "+98": {
        "language": "fa",
        "name": "Persian (Farsi)",
        "greeting": "سلام",
        "formal_greeting": "سلام",
        "voice": "Kore"
    },
    "+27": {
        "language": "en-ZA",
        "name": "English (South Africa)",
        "greeting": "Hello",
        "formal_greeting": "Good day",
        "voice": "Kore"
    },
    "+234": {
        "language": "en-NG",
        "name": "English (Nigeria)",
        "greeting": "Hello",
        "formal_greeting": "Good day",
        "voice": "Kore"
    },
    "+254": {
        "language": "sw",
        "name": "Swahili (Kenya)",
        "greeting": "Habari",
        "formal_greeting": "Habari",
        "voice": "Kore"
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # ASIA
    # ─────────────────────────────────────────────────────────────────────────────
    "+86": {
        "language": "zh-CN",
        "name": "Chinese (Mandarin)",
        "greeting": "你好",
        "formal_greeting": "您好",
        "voice": "Kore"
    },
    "+852": {
        "language": "zh-HK",
        "name": "Chinese (Cantonese)",
        "greeting": "你好",
        "formal_greeting": "您好",
        "voice": "Kore"
    },
    "+886": {
        "language": "zh-TW",
        "name": "Chinese (Taiwan)",
        "greeting": "你好",
        "formal_greeting": "您好",
        "voice": "Kore"
    },
    "+81": {
        "language": "ja",
        "name": "Japanese",
        "greeting": "こんにちは",
        "formal_greeting": "こんにちは",
        "voice": "Kore"
    },
    "+82": {
        "language": "ko",
        "name": "Korean",
        "greeting": "안녕하세요",
        "formal_greeting": "안녕하십니까",
        "voice": "Kore"
    },
    "+91": {
        "language": "hi",
        "name": "Hindi",
        "greeting": "नमस्ते",
        "formal_greeting": "नमस्कार",
        "voice": "Kore"
    },
    "+92": {
        "language": "ur",
        "name": "Urdu",
        "greeting": "سلام",
        "formal_greeting": "السلام علیکم",
        "voice": "Kore"
    },
    "+880": {
        "language": "bn",
        "name": "Bengali",
        "greeting": "হ্যালো",
        "formal_greeting": "নমস্কার",
        "voice": "Kore"
    },
    "+66": {
        "language": "th",
        "name": "Thai",
        "greeting": "สวัสดี",
        "formal_greeting": "สวัสดีครับ/ค่ะ",
        "voice": "Kore"
    },
    "+84": {
        "language": "vi",
        "name": "Vietnamese",
        "greeting": "Xin chào",
        "formal_greeting": "Xin chào",
        "voice": "Kore"
    },
    "+62": {
        "language": "id",
        "name": "Indonesian",
        "greeting": "Halo",
        "formal_greeting": "Selamat siang",
        "voice": "Kore"
    },
    "+60": {
        "language": "ms",
        "name": "Malay",
        "greeting": "Hai",
        "formal_greeting": "Selamat sejahtera",
        "voice": "Kore"
    },
    "+63": {
        "language": "fil",
        "name": "Filipino",
        "greeting": "Kumusta",
        "formal_greeting": "Magandang araw",
        "voice": "Kore"
    },
    "+65": {
        "language": "en-SG",
        "name": "English (Singapore)",
        "greeting": "Hello",
        "formal_greeting": "Good day",
        "voice": "Kore"
    },
    "+94": {
        "language": "si",
        "name": "Sinhala",
        "greeting": "ආයුබෝවන්",
        "formal_greeting": "ආයුබෝවන්",
        "voice": "Kore"
    },
    "+977": {
        "language": "ne",
        "name": "Nepali",
        "greeting": "नमस्ते",
        "formal_greeting": "नमस्कार",
        "voice": "Kore"
    },
    
    # ─────────────────────────────────────────────────────────────────────────────
    # OCEANIA
    # ─────────────────────────────────────────────────────────────────────────────
    "+61": {
        "language": "en-AU",
        "name": "English (Australia)",
        "greeting": "G'day",
        "formal_greeting": "Hello",
        "voice": "Kore"
    },
    "+64": {
        "language": "en-NZ",
        "name": "English (New Zealand)",
        "greeting": "Hello",
        "formal_greeting": "Good day",
        "voice": "Kore"
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# LANGUAGE CODE TO INFO MAPPING (for customer preferences)
# ═══════════════════════════════════════════════════════════════════════════════

def _build_language_code_map() -> Dict[str, Dict[str, str]]:
    """Build a mapping from language codes to language info"""
    code_map = {}
    for prefix, info in PHONE_PREFIX_LANGUAGES.items():
        lang_code = info["language"]
        # Use the first entry for each base language code
        base_code = lang_code.split("-")[0]
        if base_code not in code_map:
            code_map[base_code] = info
        if lang_code not in code_map:
            code_map[lang_code] = info
    return code_map

LANGUAGE_CODE_MAP = _build_language_code_map()


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN DETECTION FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

def detect_language(
    caller_phone: str,
    customer: Optional[Dict[str, Any]] = None,
    business_default: str = "en"
) -> Dict[str, str]:
    """
    Detect the appropriate language for a call.
    
    Priority:
    1. Customer's stored language preference
    2. Phone number prefix
    3. Business default language
    
    Args:
        caller_phone: The caller's phone number (with + prefix)
        customer: Customer record dict (may contain 'language' key)
        business_default: Default language code for the business
    
    Returns:
        Dictionary with:
        - code: Language code (e.g., "tr", "en-US")
        - name: Human-readable name (e.g., "Turkish")
        - greeting: Native greeting (e.g., "Merhaba")
        - voice: Recommended voice for Gemini
        - source: How the language was determined
    
    Example:
        >>> detect_language("+905551234567", None, "en")
        {"code": "tr", "name": "Turkish", "greeting": "Merhaba", 
         "voice": "Aoede", "source": "phone_prefix"}
    """
    
    # Priority 1: Customer's stored language preference
    if customer and customer.get("language"):
        lang_code = customer["language"]
        
        # Look up in our language code map
        if lang_code in LANGUAGE_CODE_MAP:
            info = LANGUAGE_CODE_MAP[lang_code]
            return {
                "code": info["language"],
                "name": info["name"],
                "greeting": info.get("formal_greeting", info["greeting"]),
                "voice": info.get("voice", "Kore"),
                "source": "customer_preference"
            }
        
        # Check base language code
        base_code = lang_code.split("-")[0]
        if base_code in LANGUAGE_CODE_MAP:
            info = LANGUAGE_CODE_MAP[base_code]
            return {
                "code": info["language"],
                "name": info["name"],
                "greeting": info.get("formal_greeting", info["greeting"]),
                "voice": info.get("voice", "Kore"),
                "source": "customer_preference"
            }
        
        # Unknown language code - use it anyway with defaults
        return {
            "code": lang_code,
            "name": lang_code.upper(),
            "greeting": "Hello",
            "voice": "Kore",
            "source": "customer_preference"
        }
    
    # Priority 2: Phone number prefix
    if caller_phone:
        phone = _normalize_phone(caller_phone)
        
        # Sort prefixes by length (longest first) for accurate matching
        # e.g., +971 should match before +97
        sorted_prefixes = sorted(
            PHONE_PREFIX_LANGUAGES.keys(),
            key=len,
            reverse=True
        )
        
        for prefix in sorted_prefixes:
            if phone.startswith(prefix):
                info = PHONE_PREFIX_LANGUAGES[prefix]
                return {
                    "code": info["language"],
                    "name": info["name"],
                    "greeting": info.get("formal_greeting", info["greeting"]),
                    "voice": info.get("voice", "Kore"),
                    "source": "phone_prefix"
                }
    
    # Priority 3: Business default
    if business_default in LANGUAGE_CODE_MAP:
        info = LANGUAGE_CODE_MAP[business_default]
        return {
            "code": info["language"],
            "name": info["name"],
            "greeting": info.get("formal_greeting", info["greeting"]),
            "voice": info.get("voice", "Kore"),
            "source": "business_default"
        }
    
    # Check base language code for business default
    base_default = business_default.split("-")[0]
    if base_default in LANGUAGE_CODE_MAP:
        info = LANGUAGE_CODE_MAP[base_default]
        return {
            "code": info["language"],
            "name": info["name"],
            "greeting": info.get("formal_greeting", info["greeting"]),
            "voice": info.get("voice", "Kore"),
            "source": "business_default"
        }
    
    # Ultimate fallback: English
    return {
        "code": "en",
        "name": "English",
        "greeting": "Hello",
        "voice": "Kore",
        "source": "fallback"
    }


def _normalize_phone(phone: str) -> str:
    """Normalize phone number for prefix matching"""
    # Remove spaces, dashes, parentheses
    phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    # Ensure + prefix
    if not phone.startswith("+"):
        phone = "+" + phone
    
    return phone


# ═══════════════════════════════════════════════════════════════════════════════
# GREETING GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

def get_localized_greeting(
    language_code: str,
    business_name: str,
    customer_name: Optional[str] = None,
    is_formal: bool = True
) -> str:
    """
    Generate a localized greeting for the start of a call.
    
    Args:
        language_code: The language code (e.g., "tr", "en-US")
        business_name: Name of the business
        customer_name: Customer's name (for returning customers)
        is_formal: Whether to use formal greeting
    
    Returns:
        Localized greeting string
    
    Example:
        >>> get_localized_greeting("tr", "Kuaför Salonu", "Ahmet")
        "Merhaba Ahmet, Kuaför Salonu'na hoş geldiniz."
    """
    
    # Get language info
    info = LANGUAGE_CODE_MAP.get(language_code) or LANGUAGE_CODE_MAP.get(language_code.split("-")[0])
    
    if not info:
        # Fallback to English
        base_greeting = "Hello"
        if customer_name:
            return f"{base_greeting} {customer_name}, thank you for calling {business_name}."
        return f"{base_greeting}, thank you for calling {business_name}."
    
    greeting = info.get("formal_greeting" if is_formal else "greeting", info["greeting"])
    lang = info["language"]
    
    # Language-specific greeting formats
    if lang == "tr":
        if customer_name:
            return f"{greeting} {customer_name}, {business_name}'e hoş geldiniz. Size nasıl yardımcı olabilirim?"
        return f"{greeting}, {business_name}'e hoş geldiniz. Size nasıl yardımcı olabilirim?"
    
    elif lang.startswith("en"):
        if customer_name:
            return f"{greeting} {customer_name}, thank you for calling {business_name}. How can I help you today?"
        return f"{greeting}, thank you for calling {business_name}. How can I help you today?"
    
    elif lang.startswith("es"):
        if customer_name:
            return f"{greeting} {customer_name}, gracias por llamar a {business_name}. ¿En qué puedo ayudarle?"
        return f"{greeting}, gracias por llamar a {business_name}. ¿En qué puedo ayudarle?"
    
    elif lang == "de" or lang.startswith("de-"):
        if customer_name:
            return f"{greeting} {customer_name}, willkommen bei {business_name}. Wie kann ich Ihnen helfen?"
        return f"{greeting}, willkommen bei {business_name}. Wie kann ich Ihnen helfen?"
    
    elif lang == "fr":
        if customer_name:
            return f"{greeting} {customer_name}, bienvenue chez {business_name}. Comment puis-je vous aider?"
        return f"{greeting}, bienvenue chez {business_name}. Comment puis-je vous aider?"
    
    elif lang == "it":
        if customer_name:
            return f"{greeting} {customer_name}, benvenuto a {business_name}. Come posso aiutarla?"
        return f"{greeting}, benvenuto a {business_name}. Come posso aiutarla?"
    
    elif lang.startswith("pt"):
        if customer_name:
            return f"{greeting} {customer_name}, obrigado por ligar para {business_name}. Como posso ajudá-lo?"
        return f"{greeting}, obrigado por ligar para {business_name}. Como posso ajudá-lo?"
    
    elif lang == "ru":
        if customer_name:
            return f"{greeting} {customer_name}, добро пожаловать в {business_name}. Чем могу помочь?"
        return f"{greeting}, добро пожаловать в {business_name}. Чем могу помочь?"
    
    elif lang.startswith("ar"):
        if customer_name:
            return f"{greeting} {customer_name}، أهلاً بكم في {business_name}. كيف يمكنني مساعدتك؟"
        return f"{greeting}، أهلاً بكم في {business_name}. كيف يمكنني مساعدتك؟"
    
    elif lang == "ja":
        if customer_name:
            return f"{greeting}{customer_name}様、{business_name}にお電話いただきありがとうございます。ご用件は何でしょうか？"
        return f"{greeting}、{business_name}にお電話いただきありがとうございます。ご用件は何でしょうか？"
    
    elif lang == "ko":
        if customer_name:
            return f"{greeting} {customer_name}님, {business_name}에 전화 주셔서 감사합니다. 무엇을 도와드릴까요?"
        return f"{greeting}, {business_name}에 전화 주셔서 감사합니다. 무엇을 도와드릴까요?"
    
    elif lang.startswith("zh"):
        if customer_name:
            return f"{greeting} {customer_name}，欢迎致电{business_name}。请问有什么可以帮您？"
        return f"{greeting}，欢迎致电{business_name}。请问有什么可以帮您？"
    
    elif lang == "hi":
        if customer_name:
            return f"{greeting} {customer_name}, {business_name} में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूं?"
        return f"{greeting}, {business_name} में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूं?"
    
    elif lang == "nl":
        if customer_name:
            return f"{greeting} {customer_name}, welkom bij {business_name}. Hoe kan ik u helpen?"
        return f"{greeting}, welkom bij {business_name}. Hoe kan ik u helpen?"
    
    elif lang == "pl":
        if customer_name:
            return f"{greeting} {customer_name}, witamy w {business_name}. W czym mogę pomóc?"
        return f"{greeting}, witamy w {business_name}. W czym mogę pomóc?"
    
    # Default format for other languages
    if customer_name:
        return f"{greeting} {customer_name}, {business_name}. How can I help you?"
    return f"{greeting}, {business_name}. How can I help you?"


def get_language_by_code(language_code: str) -> Optional[Dict[str, str]]:
    """
    Get language information by language code.
    
    Args:
        language_code: Language code (e.g., "tr", "en-US")
    
    Returns:
        Language info dict or None if not found
    """
    return LANGUAGE_CODE_MAP.get(language_code) or LANGUAGE_CODE_MAP.get(language_code.split("-")[0])


def get_supported_languages() -> Dict[str, str]:
    """
    Get all supported languages.
    
    Returns:
        Dict mapping language codes to language names
    """
    return {
        info["language"]: info["name"]
        for info in PHONE_PREFIX_LANGUAGES.values()
    }


# ═══════════════════════════════════════════════════════════════════════════════
# VOICE SELECTION
# ═══════════════════════════════════════════════════════════════════════════════

def get_voice_for_language(language_code: str) -> str:
    """
    Get the recommended Gemini voice for a language.
    
    Args:
        language_code: Language code
    
    Returns:
        Voice name (e.g., "Aoede", "Kore")
    """
    info = get_language_by_code(language_code)
    if info:
        return info.get("voice", "Kore")
    return "Kore"  # Default voice


# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def is_rtl_language(language_code: str) -> bool:
    """Check if language is right-to-left"""
    rtl_codes = {"ar", "he", "fa", "ur"}
    base_code = language_code.split("-")[0]
    return base_code in rtl_codes


def get_country_from_phone(phone: str) -> Optional[str]:
    """
    Extract country name from phone number.
    
    Args:
        phone: Phone number with country code
    
    Returns:
        Country name or None
    """
    phone = _normalize_phone(phone)
    sorted_prefixes = sorted(PHONE_PREFIX_LANGUAGES.keys(), key=len, reverse=True)
    
    for prefix in sorted_prefixes:
        if phone.startswith(prefix):
            name = PHONE_PREFIX_LANGUAGES[prefix]["name"]
            # Extract country from "Language (Country)" format
            if "(" in name:
                return name.split("(")[1].rstrip(")")
            return name
    return None
