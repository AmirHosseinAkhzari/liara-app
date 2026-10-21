from django.db import models
class Post(models.Model):
    title = models.CharField(max_length=200)
    cover = models.ImageField(upload_to="covers/")
    body = models.TextField()
