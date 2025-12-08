from django.db import models
from django.db.models import Avg, Count

class AppUser(models.Model):
    user_id = models.BigAutoField(primary_key=True)
    username = models.CharField(max_length=512, unique=True)
    email = models.EmailField(max_length=512, unique=True)
    password = models.CharField(max_length=512)
    is_admin = models.BooleanField(default=False)

    class Meta:
        db_table = 'appuser'

    def __str__(self):
        return self.username


class Movie(models.Model):
    movie_id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=512)
    director = models.CharField(max_length=255, null=True, blank=True)
    genre = models.CharField(max_length=512)
    year = models.IntegerField(null=True, blank=True)
    description = models.TextField()
    poster_url = models.URLField(max_length=512, null=True, blank=True)

    class Meta:
        db_table = 'movie'
     

    def __str__(self):
        return self.title
    
    @property
    def average_rating(self):
        """Calculate average rating from user ratings"""
        result = self.ratings.aggregate(avg=Avg('score'))
        return round(result['avg'], 2) if result['avg'] is not None else 0.0
    
    @property
    def rating_count(self):
        """Get total number of ratings"""
        return self.ratings.count()



class Rating(models.Model):
    rating_id = models.BigAutoField(primary_key=True)
    score = models.FloatField()
    created_at = models.DateField(auto_now_add=True)
    

    movie = models.ForeignKey(
        Movie, 
        on_delete=models.CASCADE, 
        related_name='ratings',
        db_column='movie_movie_id'  # Matches  SQL
    )
    user = models.ForeignKey(
        AppUser, 
        on_delete=models.CASCADE, 
        related_name='ratings',
        db_column='appuser_user_id'  # Matches  SQL
    )

    class Meta:
        db_table = 'rating'

    def __str__(self):
        return f"{self.user.username} rated {self.movie.title}: {self.score}"


class Recommendation(models.Model):
    rec_id = models.BigAutoField(primary_key=True)
    predicted_score = models.FloatField(null=True, blank=True)
    

    movie = models.ForeignKey(
        Movie, 
        on_delete=models.CASCADE, 
        related_name='recommendations',
        db_column='movie_movie_id'  # Matches SQL
    )
    user = models.ForeignKey(
        AppUser, 
        on_delete=models.CASCADE, 
        related_name='recommendations',
        db_column='appuser_user_id'  # Matches SQL
    )

    class Meta:
        db_table = 'recommendation'

    def __str__(self):
        return f"Rec: {self.movie.title} for {self.user.username}"