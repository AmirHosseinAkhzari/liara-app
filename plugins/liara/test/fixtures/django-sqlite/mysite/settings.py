DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
MEDIA_ROOT = BASE_DIR / "media"
EMAIL_HOST = env("EMAIL_HOST")
