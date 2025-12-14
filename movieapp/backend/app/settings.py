import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url
import sys

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# ALLOWED_HOSTS dinâmico
ALLOWED_HOSTS = [h.strip() for h in os.getenv(
    "ALLOWED_HOSTS",
    ".onrender.com,localhost,127.0.0.1"
).split(",") if h.strip()]


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "movies",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

ROOT_URLCONF = "app.urls"
WSGI_APPLICATION = "app.wsgi.application"


# Configuração de Base de Dados
if "test" in sys.argv or "pytest" in sys.argv[0]:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }
elif os.getenv("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.parse(os.environ["DATABASE_URL"], conn_max_age=600)
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "NAME": os.getenv("DB_NAME", "movieapp"),
            "USER": os.getenv("DB_USER", "movieapp"),
            "PASSWORD": os.getenv("DB_PASSWORD", "movieapp"),
        }
    }

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# --- CONFIGURAÇÃO DE CORS E CSRF (DINÂMICA) ---

# 1. URLs locais (Desenvolvimento)
CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]

CSRF_TRUSTED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]

# 2. Ler URL do Frontend do Render (Variável de Ambiente)
FRONTEND_URL = os.getenv("FRONTEND_URL")

if FRONTEND_URL:
    # Remove barras finais para evitar erros de validação
    clean_url = FRONTEND_URL.rstrip('/')
    CORS_ALLOWED_ORIGINS.append(clean_url)
    CSRF_TRUSTED_ORIGINS.append(clean_url)

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False  # Segurança: Bloquear origens não listadas

# --- CONFIGURAÇÃO DE COOKIES (SOLUÇÃO LOOP DE LOGIN) ---

# Deteta se estamos no Render (Variável automática do Render)
RENDER = os.getenv('RENDER')

if RENDER:
    # Produção (Render): Cookies Cross-Site Seguros
    SESSION_COOKIE_SAMESITE = 'None'
    CSRF_COOKIE_SAMESITE = 'None'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_DOMAIN = None 
else:
    # Local: Configuração padrão
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False


# DRF Settings
REST_FRAMEWORK = { 
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"] 
}

# Proxy Headers (Necessário para HTTPS no Render)
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')