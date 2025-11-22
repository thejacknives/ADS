from django.contrib import admin
from .models import AppUser, Movie, Rating, Recommendation

admin.site.register(AppUser)
admin.site.register(Movie)
admin.site.register(Rating)
admin.site.register(Recommendation)