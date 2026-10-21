import os
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
DEBUG = False
ALLOWED_HOSTS = ["myblog.ir", "www.myblog.ir"]
CSRF_TRUSTED_ORIGINS = ["https://myblog.ir"]
INSTALLED_APPS = ["django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes", "storages", "blog"]
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": os.environ["DB_NAME"], "USER": os.environ["DB_USER"],
        "PASSWORD": os.environ["DB_PASSWORD"], "HOST": os.environ["DB_HOST"], "PORT": "3306",
    }
}
STORAGES = {
    "default": {"BACKEND": "storages.backends.s3.S3Storage", "OPTIONS": {"bucket_name": os.environ["S3_BUCKET"], "endpoint_url": os.environ["S3_ENDPOINT"]}},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
