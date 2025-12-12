from django.contrib.auth.hashers import make_password
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import AppUser, Movie, Rating

SQLITE_DB = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}


@override_settings(DATABASES=SQLITE_DB)
class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_user_can_register(self):
        payload = {
            "name": "newuser",
            "email": "new@example.com",
            "password": "Secret123!",
        }
        response = self.client.post("/api/auth/register/", payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(AppUser.objects.filter(email="new@example.com").exists())

    def test_user_can_login_with_valid_credentials(self):
        AppUser.objects.create(
            username="loginuser",
            email="login@example.com",
            password=make_password("Pass1234!"),
        )

        response = self.client.post(
            "/api/auth/login/",
            {"email": "login@example.com", "password": "Pass1234!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("user", body)
        self.assertEqual(body["user"]["email"], "login@example.com")


@override_settings(DATABASES=SQLITE_DB)
class RecommendationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.alice = AppUser.objects.create(
            username="alice", email="alice@example.com", password="dummy"
        )
        cls.bob = AppUser.objects.create(
            username="bob", email="bob@example.com", password="dummy"
        )
        cls.cara = AppUser.objects.create(
            username="cara", email="cara@example.com", password="dummy"
        )
        cls.viewer = AppUser.objects.create(
            username="viewer", email="viewer@example.com", password="dummy"
        )

        cls.m1 = Movie.objects.create(
            title="Inception", genre="Sci-Fi", description="Dream heist."
        )
        cls.m2 = Movie.objects.create(
            title="The Matrix", genre="Sci-Fi", description="Virtual reality revolt."
        )
        cls.m3 = Movie.objects.create(
            title="Die Hard", genre="Action", description="Nakatomi tower."
        )
        cls.m4 = Movie.objects.create(
            title="Pride & Prejudice", genre="Romance", description="Classic romance."
        )

        Rating.objects.create(user=cls.alice, movie=cls.m1, score=9.5)
        Rating.objects.create(user=cls.alice, movie=cls.m3, score=8.0)

        Rating.objects.create(user=cls.bob, movie=cls.m3, score=7.0)
        Rating.objects.create(user=cls.bob, movie=cls.m2, score=9.0)

        Rating.objects.create(user=cls.cara, movie=cls.m4, score=9.4)

    def setUp(self):
        self.client = APIClient()

    def test_recommendations_mix_collaborative_and_content(self):
        """
        Testa se o sistema recomenda m2 (SciFi 2) para a Alice.
        - Content: Ela gosta de Sci-Fi.
        - Collaborative: O Bob (similar) gostou de m2.
        """
        # 1. Login como Alice
        self.force_login(self.alice)

        # 2. Chamar endpoint "mine"
        response = self.client.get("/api/recommendations/mine/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        
        # A estrutura agora é { user_id:..., recommendations: [ { movie: { id: ... } } ] }
        recs_list = payload["recommendations"]
        
        # Mapear ID do filme para a entrada completa para facilitar verificação
        # Nota: O serializer retorna 'id' dentro do objeto 'movie'
        recs_map = {entry["movie"]["id"]: entry for entry in recs_list}

        # Verificações
        self.assertIn(self.m2.movie_id, recs_map)  # SciFi 2 deve ser recomendado
        self.assertNotIn(self.m1.movie_id, recs_map)  # Já viu SciFi 1
        self.assertNotIn(self.m3.movie_id, recs_map)  # Já viu Romance 1
        
        # O score deve ser alto
        self.assertGreater(recs_map[self.m2.movie_id]["predicted_score"], 3.0)

    def test_cold_start_user_gets_top_rated_fallback(self):
        """
        Testa se um user sem avaliações recebe o Top 10 global.
        """
        # Adiciona reviews globais para criar um "Top Rated"
        Rating.objects.create(user=self.bob, movie=self.m4, score=5.0) # Romance 2 é Top
        
        # 1. Login como Viewer (Sem histórico)
        self.force_login(self.viewer)

        # 2. Chamar endpoint
        response = self.client.get("/api/recommendations/mine/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        recs_list = payload["recommendations"]

        # Deve retornar fallback (não vazio)
        self.assertTrue(len(recs_list) > 0)
        
        # O filme m4 tem média 5.0, deve estar lá
        recs_ids = [r["movie"]["id"] for r in recs_list]
        self.assertIn(self.m4.movie_id, recs_ids)
