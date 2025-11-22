from django.db import models


class AppUser(models.Model):
    # Primary key - matches  SQL: user_id BIGSERIAL PRIMARY KEY
    user_id = models.BigAutoField(primary_key=True)
    
    username = models.CharField(max_length=512, unique=True)
    email = models.EmailField(max_length=512, unique=True)
    password = models.CharField(max_length=512)
    is_admin = models.BooleanField(default=False)

    class Meta:
        db_table = 'appuser'
        constraints = [
            models.UniqueConstraint(fields=['username', 'email'], name='unique_username_email')
        ]

    def __str__(self):
        return self.username


class Movie(models.Model):
    # Primary key - matches SQL: movie_id BIGSERIAL PRIMARY KEY
    movie_id = models.BigAutoField(primary_key=True)

    title = models.CharField(max_length=512)
    genre = models.CharField(max_length=512)
    description = models.CharField(max_length=512)

    class Meta:
        db_table = 'movie'

    def __str__(self):
        return self.title


class Rating(models.Model):
    score = models.FloatField()
    created_at = models.DateField(auto_now_add=True)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='ratings')

    class Meta:
        db_table = 'rating'

    def __str__(self):
        return f"{self.user.username} rated {self.movie.title}: {self.score}"


class Recommendation(models.Model):
    predicted_score = models.FloatField(null=True, blank=True)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='recommendations')
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name='recommendations')

    class Meta:
        db_table = 'recommendation'

    def __str__(self):
        return f"Rec: {self.movie.title} for {self.user.username}"