from django.test import TestCase, override_settings
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta
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

  # ...existing code...

    def test_recommendations_mix_collaborative_and_content(self):
        """
        Testa se o sistema recomenda m2 (SciFi 2) para a Alice.
        - Content: Ela gosta de Sci-Fi.
        - Collaborative: O Bob (similar) gostou de m2.
        """
        # 1. Login como Alice via session
        session = self.client.session
        session['user_id'] = self.alice.user_id
        session['username'] = self.alice.username
        session.save()

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
        
        # 1. Login como Viewer (Sem histórico) via session
        session = self.client.session
        session['user_id'] = self.viewer.user_id
        session['username'] = self.viewer.username
        session.save()

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

@override_settings(DATABASES=SQLITE_DB)
class ProfileManagementTests(TestCase):
    """FR2: Profile Management Tests (Refactored & Fixed)"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = AppUser.objects.create(
            username="testuser", email="test@example.com", password=make_password("pass")
        )
        self._login()

    def _login(self):
        session = self.client.session
        session['user_id'] = self.user.user_id
        session['username'] = self.user.username
        session.save()

    def test_profile_access_and_updates(self):
        """Combines profile GET, Auth check, and PUT scenarios"""
        
        # 1. GET Authenticated (Already logged in via setUp)
        resp = self.client.get('/api/profile/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['username'], 'testuser')
        
        # 2. GET Unauthenticated (Flush session)
        self.client.session.flush()
        self.assertEqual(self.client.get('/api/profile/').status_code, 401)
        
        # 3. PUT Success (Re-init client to ensure clean state, then login)
        self.client = APIClient()
        self._login()
        
        resp = self.client.put('/api/profile/', {'username': 'newname', 'email': 'new@e.com'})
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'newname')

        # 4. PUT Failures (Invalid char, Duplicate, Invalid Email)
        AppUser.objects.create(username='taken', email='taken@e.com', password='p')
        fail_cases = [
            {'username': 'bad user!', 'email': 'new@e.com'},
            {'username': 'taken', 'email': 'new@e.com'},
            {'username': 'newname', 'email': 'bad-email'}
        ]
        for data in fail_cases:
            self.assertEqual(self.client.put('/api/profile/', data).status_code, 400)

    def test_rating_history_workflow(self):
        """Combines empty history, populated history, and ordering"""
        # (Already logged in via setUp)
        
        # 1. Empty check
        self.assertEqual(len(self.client.get('/api/profile/ratings/').json()), 0)

        # 2. Populate
        m1 = Movie.objects.create(title='M1', genre='A', description='D')
        m2 = Movie.objects.create(title='M2', genre='B', description='D')
        
        # Create ratings with forced timestamps
        r1 = Rating.objects.create(user=self.user, movie=m1, score=4.5)
        r2 = Rating.objects.create(user=self.user, movie=m2, score=3.5)
        
        Rating.objects.filter(pk=r1.pk).update(created_at=timezone.now() - timedelta(days=1))
        Rating.objects.filter(pk=r2.pk).update(created_at=timezone.now())

        # 3. Verify
        data = self.client.get('/api/profile/ratings/').json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['id'], r2.rating_id) # Newest first
        self.assertEqual(data[1]['id'], r1.rating_id) 

    def test_rec_history_auth(self):
        self.client.session.flush()
        self.assertEqual(self.client.get('/api/profile/recommendations/').status_code, 401)


@override_settings(DATABASES=SQLITE_DB)
class MovieCatalogTests(TestCase):
    """FR3: Item Catalog Tests (Refactored)"""
    
    @classmethod
    def setUpTestData(cls):
        # Create movies once for the whole class
        cls.m1 = Movie.objects.create(title='The Matrix', director='Wachowski', genre='Sci-Fi', year=1999, poster_url='http://u.rl')
        cls.m2 = Movie.objects.create(title='Inception', director='Nolan', genre='Sci-Fi', year=2010)
        cls.m3 = Movie.objects.create(title='Dark Knight', director='Nolan', genre='Action', year=2008)

    def setUp(self):
        self.client = APIClient()

    def test_list_movies(self):
        """Test listing, sorting, and fields"""
        data = self.client.get('/api/movies/').json()
        self.assertEqual(data['total'], 3)
        self.assertEqual(data['movies'][0]['title'], 'Dark Knight') # Alphabetical default
        self.assertIn('average_rating', data['movies'][0])

    def test_movie_detail_workflow(self):
        """Combines Found/NotFound and Auth/Unauth rating checks"""
        # 1. Not Found
        self.assertEqual(self.client.get('/api/movies/999/').status_code, 404)

        # 2. Detail Unauthenticated
        resp = self.client.get(f'/api/movies/{self.m1.movie_id}/').json()
        self.assertEqual(resp['title'], 'The Matrix')
        self.assertNotIn('user_rating', resp)

        # 3. Detail Authenticated (with rating)
        user = AppUser.objects.create(username="u", email="u@e.com", password="p")
        Rating.objects.create(user=user, movie=self.m1, score=4.5)
        
        session = self.client.session
        session['user_id'] = user.user_id
        session.save()

        resp = self.client.get(f'/api/movies/{self.m1.movie_id}/').json()
        self.assertEqual(resp['user_rating'], 4.5)


@override_settings(DATABASES=SQLITE_DB)
class MovieSearchTests(TestCase):
    """FR4: Search Tests (Refactored & Fixed)"""

    @classmethod
    def setUpTestData(cls):
        cls.dummy_user = AppUser.objects.create(username="rater", email="r@e.com", password="p")

        # 1. Create Movies
        m1 = Movie.objects.create(title='The Matrix', director='Wachowski', genre='Sci-Fi', year=1999)
        m2 = Movie.objects.create(title='Inception', director='Nolan', genre='Sci-Fi', year=2010)
        m3 = Movie.objects.create(title='Dark Knight', director='Nolan', genre='Action', year=2008)
        m4 = Movie.objects.create(title='Interstellar', director='Nolan', genre='Sci-Fi', year=2014)
        m5 = Movie.objects.create(title='Pulp Fiction', director='Tarantino', genre='Crime', year=1994)

        # 2. Create Ratings to generate the average scores
        Rating.objects.create(user=cls.dummy_user, movie=m1, score=4.0)
        Rating.objects.create(user=cls.dummy_user, movie=m2, score=5.0)
        Rating.objects.create(user=cls.dummy_user, movie=m3, score=4.5)
        Rating.objects.create(user=cls.dummy_user, movie=m4, score=4.2)
        Rating.objects.create(user=cls.dummy_user, movie=m5, score=4.8)

    def setUp(self):
        self.client = APIClient()

    def test_search_scenarios(self):
        """Data-driven test for all search/filter combinations"""
        scenarios = [
            ('?q=Matrix', 1),                # Title
            ('?q=nolan', 3),                 # Director (case-insensitive)
            ('?genre=Sci-Fi', 3),            # Genre
            ('?year_min=2010', 2),           # Year Min (Inception, Interstellar)
            # FIX: Updated count to 3 to include Pulp Fiction (1994)
            ('?year_max=2008', 3),           
            ('?q=Nolan&genre=Sci-Fi', 2),    # Combined
            ('?q=None', 0),                  # No results
            ('?q=', 5),                      # Empty query (All 5 movies)
        ]

        for query, expected_count in scenarios:
            with self.subTest(query=query):
                data = self.client.get(f'/api/movies/search/{query}').json()
                self.assertEqual(data['count'], expected_count, f"Failed on {query}")

    def test_sorting(self):
        """Test sorting logic separately"""
        # Sort Year Desc
        res = self.client.get('/api/movies/search/?sort=year').json()['movies']
        self.assertEqual(res[0]['year'], 2014) 
        
        # Sort Title (Asc)
        res = self.client.get('/api/movies/search/?sort=title').json()['movies']
        self.assertEqual(res[0]['title'], 'Dark Knight')