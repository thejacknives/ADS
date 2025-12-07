from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="AppUser",
            fields=[
                ("user_id", models.BigAutoField(primary_key=True, serialize=False)),
                ("username", models.CharField(max_length=512, unique=True)),
                ("email", models.EmailField(max_length=512, unique=True)),
                ("password", models.CharField(max_length=512)),
                ("is_admin", models.BooleanField(default=False)),
            ],
            options={"db_table": "appuser"},
        ),
        migrations.CreateModel(
            name="Movie",
            fields=[
                ("movie_id", models.BigAutoField(primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=512)),
                ("genre", models.CharField(max_length=512)),
                ("description", models.CharField(max_length=512)),
            ],
            options={"db_table": "movie"},
        ),
        migrations.CreateModel(
            name="Rating",
            fields=[
                ("rating_id", models.BigAutoField(primary_key=True, serialize=False)),
                ("score", models.FloatField()),
                ("created_at", models.DateField(auto_now_add=True)),
                (
                    "movie",
                    models.ForeignKey(
                        db_column="movie_movie_id",
                        on_delete=models.CASCADE,
                        related_name="ratings",
                        to="movies.movie",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        db_column="appuser_user_id",
                        on_delete=models.CASCADE,
                        related_name="ratings",
                        to="movies.appuser",
                    ),
                ),
            ],
            options={"db_table": "rating"},
        ),
        migrations.CreateModel(
            name="Recommendation",
            fields=[
                ("rec_id", models.BigAutoField(primary_key=True, serialize=False)),
                ("predicted_score", models.FloatField(blank=True, null=True)),
                (
                    "movie",
                    models.ForeignKey(
                        db_column="movie_movie_id",
                        on_delete=models.CASCADE,
                        related_name="recommendations",
                        to="movies.movie",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        db_column="appuser_user_id",
                        on_delete=models.CASCADE,
                        related_name="recommendations",
                        to="movies.appuser",
                    ),
                ),
            ],
            options={"db_table": "recommendation"},
        ),
    ]
