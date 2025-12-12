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

@override_settings(DATABASES=SQLITE_DB)
class ItemRatingTests(TestCase):
    """FR5: Ratings CRUD & Retrieval Tests"""

    def setUp(self):
        self.user = AppUser.objects.create(username="rater", email="r@e.com", password="p")
        self.movie = Movie.objects.create(title='Test Movie', genre='Drama', description='Desc')
        self.client = self._client_for(self.user)

    def _client_for(self, user):
        client = APIClient()
        session = client.session
        session['user_id'] = user.user_id
        session['username'] = user.username
        session.save()
        return client

    def _post_rating(self, client, payload):
        return client.post(f'/api/ratings/{self.movie.movie_id}/', payload, format='json')

    def _put_rating(self, client, rating, payload):
        return client.put(f'/api/ratings/{rating.rating_id}/edit/', payload, format='json')

    def test_create_rating_requires_auth_and_valid_value(self):
        """Create rating: requires session auth, 1-5 integer, no duplicates."""
        self.assertEqual(
            self._post_rating(APIClient(), {"rating": 5}).status_code, 401
        )

        invalid_payloads = [{}, {"rating": "bad"}, {"rating": 6}]
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                self.assertEqual(self._post_rating(self.client, payload).status_code, 400)

        resp = self._post_rating(self.client, {"rating": 5})
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Rating.objects.filter(user=self.user, movie=self.movie).exists())

        self.assertEqual(self._post_rating(self.client, {"rating": 4}).status_code, 400)

    def test_edit_rating_happy_path_and_validations(self):
        """Edit rating: owner-only, 1-5 integer, must change value."""
        rating = Rating.objects.create(user=self.user, movie=self.movie, score=3)

        self.assertEqual(self._put_rating(APIClient(), rating, {"rating": 4}).status_code, 401)

        other = AppUser.objects.create(username="other", email="o@e.com", password="p")
        self.assertEqual(
            self._put_rating(self._client_for(other), rating, {"rating": 4}).status_code,
            403,
        )

        invalid_payloads = [{}, {"rating": "bad"}, {"rating": 0}, {"rating": 3}]
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                self.assertEqual(self._put_rating(self.client, rating, payload).status_code, 400)

        resp = self._put_rating(self.client, rating, {"rating": 5})
        self.assertEqual(resp.status_code, 200)
        rating.refresh_from_db()
        self.assertEqual(rating.score, 5)

    def test_delete_rating_requires_owner(self):
        rating = Rating.objects.create(user=self.user, movie=self.movie, score=4)

        self.assertEqual(
            APIClient().delete(f'/api/ratings/{rating.rating_id}/delete/').status_code,
            401,
        )

        other = AppUser.objects.create(username="other2", email="o2@e.com", password="p")
        other_client = self._client_for(other)
        self.assertEqual(
            other_client.delete(f'/api/ratings/{rating.rating_id}/delete/').status_code,
            403,
        )

        resp = self.client.delete(f'/api/ratings/{rating.rating_id}/delete/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Rating.objects.filter(pk=rating.pk).exists())

    def test_get_movie_ratings_stats_and_payload(self):
        """Retrieve ratings for a movie with stats and entries."""
        # No ratings: expect 404-like behavior from view (returns error)
        resp = self.client.get(f'/api/movies/{self.movie.movie_id}/ratings/')
        self.assertIn(resp.status_code, (200, 404))

        # Add ratings
        u2 = AppUser.objects.create(username="u2", email="u2@e.com", password="p")
        Rating.objects.create(user=self.user, movie=self.movie, score=4)
        Rating.objects.create(user=u2, movie=self.movie, score=2)

        resp = self.client.get(f'/api/movies/{self.movie.movie_id}/ratings/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['movie_id'], self.movie.movie_id)
        self.assertEqual(body['total_ratings'], 2)
        self.assertAlmostEqual(body['average_rating'], 3.0, places=4)
        self.assertEqual(len(body['ratings']), 2)


@override_settings(DATABASES=SQLITE_DB)
class InteractionHistoryTests(TestCase):
    """FR7: Interaction History (Ratings & Recommendations) Tests"""

    def setUp(self):
        self.user = AppUser.objects.create(username="historyuser", email="h@e.com", password="p")
        self.client = self._auth_client()

    def _auth_client(self, user=None):
        user = user or self.user
        client = APIClient()
        session = client.session
        session['user_id'] = user.user_id
        session['username'] = user.username
        session.save()
        return client

    def _assert_requires_auth(self, path):
        self.assertEqual(APIClient().get(path).status_code, 401)

    def _create_movies(self, titles):
        return [
            Movie.objects.create(title=t, genre=f"G{idx}", description=f"D{idx}")
            for idx, t in enumerate(titles, start=1)
        ]

    def test_list_my_ratings_requires_auth(self):
        """GET /api/ratings/mine/ requires authentication."""
        self._assert_requires_auth('/api/ratings/mine/')

    def test_list_my_ratings_empty_case(self):
        """Empty ratings returns 200 with empty list."""
        resp = self.client.get('/api/ratings/mine/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['total_ratings'], 0)
        self.assertEqual(body['ratings'], [])

    def test_list_my_ratings_populated_and_includes_details(self):
        """List user's ratings with movie details and basic fields."""
        m1, m2, m3 = self._create_movies(['M1', 'M2', 'M3'])
        ratings = [
            Rating.objects.create(user=self.user, movie=m1, score=4.0),
            Rating.objects.create(user=self.user, movie=m2, score=3.5),
            Rating.objects.create(user=self.user, movie=m3, score=5.0),
        ]

        resp = self.client.get('/api/ratings/mine/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()

        self.assertEqual(body['user_id'], self.user.user_id)
        self.assertEqual(body['total_ratings'], 3)
        self.assertEqual(len(body['ratings']), 3)

        rating_ids = {r['rating_id'] for r in body['ratings']}
        self.assertSetEqual(rating_ids, {r.rating_id for r in ratings})

        for rating in body['ratings']:
            for field in ('rating_id', 'score', 'created_at', 'movie_id'):
                self.assertIn(field, rating)

    def test_list_my_ratings_isolation(self):
        """User only sees own ratings, not others."""
        m = Movie.objects.create(title='Movie', genre='Genre', description='Desc')
        other = AppUser.objects.create(username="other3", email="o3@e.com", password="p")

        Rating.objects.create(user=self.user, movie=m, score=5.0)
        Rating.objects.create(user=other, movie=m, score=2.0)

        resp = self.client.get('/api/ratings/mine/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body['total_ratings'], 1)

    def test_list_my_recommendations_requires_auth(self):
        """GET /api/recommendations/mine/ requires authentication."""
        self._assert_requires_auth('/api/recommendations/mine/')

    def test_list_my_recommendations_lazy_loading(self):
        """Recommendations trigger generation if empty."""
        # No recommendations yet - should trigger _generate_recommendations
        resp = self.client.get('/api/recommendations/mine/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()

        self.assertEqual(body['user_id'], self.user.user_id)
        # After lazy-loading, recommendations may be generated or empty
        # depending on whether user has ratings
        self.assertIn('recommendations', body)
        self.assertIn('total_recommendations', body)

    def test_list_my_recommendations_with_existing_recs(self):
        """Return existing recommendations with movie details."""
        from .models import Recommendation  # Import here to avoid issues

        m1 = Movie.objects.create(title='Rec1', genre='A', description='D1')
        m2 = Movie.objects.create(title='Rec2', genre='B', description='D2')

        rec1 = Recommendation.objects.create(user=self.user, movie=m1, predicted_score=4.5)
        rec2 = Recommendation.objects.create(user=self.user, movie=m2, predicted_score=3.8)

        resp = self.client.get('/api/recommendations/mine/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()

        self.assertEqual(body['user_id'], self.user.user_id)
        self.assertEqual(body['total_recommendations'], 2)
        self.assertEqual(len(body['recommendations']), 2)

        # Verify structure: ordered by predicted_score desc
        recs = body['recommendations']
        # rec1 has higher score (4.5 > 3.8), should be first
        self.assertEqual(recs[0]['predicted_score'], 4.5)
        self.assertEqual(recs[0]['rec_id'], rec1.rec_id)
        self.assertEqual(recs[0]['movie']['id'], m1.movie_id)
        self.assertEqual(recs[0]['movie']['title'], 'Rec1')

        self.assertEqual(recs[1]['predicted_score'], 3.8)
        self.assertEqual(recs[1]['rec_id'], rec2.rec_id)
        self.assertEqual(recs[1]['movie']['id'], m2.movie_id)

    def test_list_my_recommendations_isolation(self):
        """User only sees own recommendations."""
        from .models import Recommendation

        m = Movie.objects.create(title='Shared', genre='G', description='D')
        other = AppUser.objects.create(username="other4", email="o4@e.com", password="p")

        Recommendation.objects.create(user=self.user, movie=m, predicted_score=5.0)
        Recommendation.objects.create(user=other, movie=m, predicted_score=2.0)

        resp = self.client.get('/api/recommendations/mine/')
        self.assertEqual(resp.status_code, 200)
        body = resp.json()

        # Should only have 1 recommendation (the one for self.user)
        self.assertEqual(body['total_recommendations'], 1)
        self.assertEqual(body['recommendations'][0]['predicted_score'], 5.0)


@override_settings(DATABASES=SQLITE_DB)
class SystemAdministrationTests(TestCase):
    """FR8: System Administration Tests (Admin Movie Management & Statistics)"""

    def setUp(self):
        self.client = APIClient()
        # Create admin user
        self.admin = AppUser.objects.create(
            username="admin", email="admin@e.com", password="p", is_admin=True
        )
        # Create regular user
        self.regular_user = AppUser.objects.create(
            username="regular", email="regular@e.com", password="p", is_admin=False
        )
        self._login_admin()

    def _auth_client(self, user):
        client = APIClient()
        session = client.session
        session['user_id'] = user.user_id
        session['username'] = user.username
        session.save()
        return client

    def _login_admin(self):
        """Helper to login as admin."""
        session = self.client.session
        session['user_id'] = self.admin.user_id
        session['username'] = self.admin.username
        session.save()

    def _login_regular(self):
        """Helper to login as regular user."""
        session = self.client.session
        session['user_id'] = self.regular_user.user_id
        session['username'] = self.regular_user.username
        session.save()

    def _post_add(self, payload, client=None):
        return (client or self.client).post('/api/admin/movies/add/', payload, format='json')

    def _put_edit(self, movie_id, payload, client=None):
        return (client or self.client).put(f'/api/admin/movies/{movie_id}/edit/', payload, format='json')

    def _delete_movie(self, movie_id, client=None):
        return (client or self.client).delete(f'/api/admin/movies/{movie_id}/delete/')

    def _get_stats(self, client=None):
        return (client or self.client).get('/api/admin/statistics/')

    # --- Admin Add Movie Tests ---

    def test_add_movie_requires_auth(self):
        """Adding a movie requires authentication."""
        payload = {"title": "Test", "genre": "Drama", "description": "Desc"}
        resp = self._post_add(payload, client=APIClient())
        self.assertEqual(resp.status_code, 401)

    def test_add_movie_requires_admin(self):
        """Adding a movie requires admin role."""
        self.client.session.flush()
        self._login_regular()
        
        payload = {"title": "Test", "genre": "Drama", "description": "Desc"}
        resp = self._post_add(payload)
        self.assertEqual(resp.status_code, 403)

    def test_add_movie_validates_required_fields(self):
        """Adding a movie validates required fields: title, genre, description."""
        test_cases = [
            {"genre": "Drama", "description": "Desc"},  # Missing title
            {"title": "Test", "description": "Desc"},   # Missing genre
            {"title": "Test", "genre": "Drama"},        # Missing description
            {"title": "", "genre": "Drama", "description": "Desc"},  # Empty title
            {"title": "Test", "genre": "", "description": "Desc"},   # Empty genre
            {"title": "Test", "genre": "Drama", "description": ""},  # Empty description
        ]
        
        for payload in test_cases:
            with self.subTest(payload=payload):
                resp = self._post_add(payload)
                self.assertEqual(resp.status_code, 400)

    def test_add_movie_validates_field_lengths(self):
        """Adding a movie validates field length constraints."""
        cases = [
            {"title": "A" * 513, "genre": "Drama", "description": "Desc"},
            {"title": "Test", "genre": "A" * 513, "description": "Desc"},
            {"title": "Test", "genre": "Drama", "description": "Desc", "director": "A" * 256},
            {"title": "Test", "genre": "Drama", "description": "Desc", "poster_url": "A" * 513},
        ]
        for payload in cases:
            with self.subTest(payload=payload):
                self.assertEqual(self._post_add(payload).status_code, 400)

    def test_add_movie_validates_year_format(self):
        """Adding a movie validates year is a valid integer."""
        payload = {"title": "Test", "genre": "Drama", "description": "Desc", "year": "invalid"}
        self.assertEqual(self._post_add(payload).status_code, 400)

    def test_add_movie_success(self):
        """Successfully add a movie with required fields."""
        payload = {
            "title": "New Movie",
            "genre": "Action",
            "description": "An action-packed thriller"
        }
        resp = self._post_add(payload)
        self.assertEqual(resp.status_code, 201)
        
        body = resp.json()
        self.assertEqual(body['message'], 'Movie added successfully')
        self.assertIn('movie', body)
        self.assertEqual(body['movie']['title'], 'New Movie')
        self.assertEqual(body['movie']['genre'], 'Action')
        
        # Verify movie was created in DB
        self.assertTrue(Movie.objects.filter(title='New Movie').exists())

    def test_add_movie_success_with_optional_fields(self):
        """Successfully add a movie with all optional fields."""
        payload = {
            "title": "Complete Movie",
            "director": "John Doe",
            "genre": "Drama",
            "year": 2023,
            "description": "A complete movie entry",
            "poster_url": "https://example.com/poster.jpg"
        }
        resp = self._post_add(payload)
        self.assertEqual(resp.status_code, 201)
        
        body = resp.json()
        movie = body['movie']
        self.assertEqual(movie['title'], 'Complete Movie')
        self.assertEqual(movie['director'], 'John Doe')
        self.assertEqual(movie['year'], 2023)
        self.assertEqual(movie['poster_url'], 'https://example.com/poster.jpg')

    # --- Admin Edit Movie Tests ---

    def test_edit_movie_requires_auth(self):
        """Editing a movie requires authentication."""
        movie = Movie.objects.create(
            title='Original', genre='Drama', description='Desc'
        )
        payload = {"title": "Updated", "genre": "Action", "description": "New"}
        resp = self._put_edit(movie.movie_id, payload, client=APIClient())
        self.assertEqual(resp.status_code, 401)

    def test_edit_movie_requires_admin(self):
        """Editing a movie requires admin role."""
        movie = Movie.objects.create(
            title='Original', genre='Drama', description='Desc'
        )
        self.client.session.flush()
        self._login_regular()
        
        payload = {"title": "Updated", "genre": "Action", "description": "New"}
        resp = self._put_edit(movie.movie_id, payload)
        self.assertEqual(resp.status_code, 403)

    def test_edit_movie_requires_movie_exists(self):
        """Editing requires the movie to exist."""
        self._login_admin()
        payload = {"title": "Updated", "genre": "Action", "description": "New"}
        resp = self._put_edit(999, payload)
        self.assertEqual(resp.status_code, 404)

    def test_edit_movie_validates_required_fields(self):
        """Editing a movie validates required fields."""
        movie = Movie.objects.create(
            title='Original', genre='Drama', description='Desc'
        )
        
        test_cases = [
            {"genre": "Action", "description": "New"},  # Missing title
            {"title": "Updated", "description": "New"},  # Missing genre
            {"title": "Updated", "genre": "Action"},     # Missing description
        ]
        
        for payload in test_cases:
            with self.subTest(payload=payload):
                self.assertEqual(self._put_edit(movie.movie_id, payload).status_code, 400)

    def test_edit_movie_validates_field_lengths(self):
        """Editing a movie validates field length constraints."""
        movie = Movie.objects.create(
            title='Original', genre='Drama', description='Desc'
        )
        
        # Title max 512
        payload = {
            "title": "A" * 513,
            "genre": "Drama",
            "description": "Desc"
        }
        self.assertEqual(self._put_edit(movie.movie_id, payload).status_code, 400)

        # Genre max 512
        payload = {
            "title": "Test",
            "genre": "A" * 513,
            "description": "Desc"
        }
        self.assertEqual(self._put_edit(movie.movie_id, payload).status_code, 400)

    def test_edit_movie_success(self):
        """Successfully edit a movie."""
        movie = Movie.objects.create(
            title='Original',
            director='Old Director',
            genre='Drama',
            year=2020,
            description='Original desc',
            poster_url='http://old.url'
        )
        
        payload = {
            "title": "Updated Title",
            "director": "New Director",
            "genre": "Action",
            "year": 2023,
            "description": "Updated description",
            "poster_url": "http://new.url"
        }
        resp = self.client.put(f'/api/admin/movies/{movie.movie_id}/edit/', payload, format='json')
        self.assertEqual(resp.status_code, 200)
        
        body = resp.json()
        self.assertEqual(body['message'], 'Movie updated successfully')
        
        updated = body['movie']
        self.assertEqual(updated['title'], 'Updated Title')
        self.assertEqual(updated['director'], 'New Director')
        self.assertEqual(updated['genre'], 'Action')
        self.assertEqual(updated['year'], 2023)
        
        # Verify in DB
        movie.refresh_from_db()
        self.assertEqual(movie.title, 'Updated Title')
        self.assertEqual(movie.director, 'New Director')

    # --- Admin Delete Movie Tests ---

    def test_delete_movie_requires_auth(self):
        """Deleting a movie requires authentication."""
        movie = Movie.objects.create(
            title='To Delete', genre='Drama', description='Desc'
        )
        resp = self._delete_movie(movie.movie_id, client=APIClient())
        self.assertEqual(resp.status_code, 401)

    def test_delete_movie_requires_admin(self):
        """Deleting a movie requires admin role."""
        movie = Movie.objects.create(
            title='To Delete', genre='Drama', description='Desc'
        )
        self.client.session.flush()
        self._login_regular()
        
        resp = self._delete_movie(movie.movie_id)
        self.assertEqual(resp.status_code, 403)

    def test_delete_movie_requires_movie_exists(self):
        """Deleting requires the movie to exist."""
        self._login_admin()
        resp = self._delete_movie(999)
        self.assertEqual(resp.status_code, 404)

    def test_delete_movie_success(self):
        """Successfully delete a movie."""
        movie = Movie.objects.create(
            title='To Delete', genre='Drama', description='Desc'
        )
        movie_id = movie.movie_id
        
        resp = self._delete_movie(movie_id)
        self.assertEqual(resp.status_code, 200)
        
        body = resp.json()
        self.assertEqual(body['message'], 'Movie deleted successfully')
        
        # Verify deleted from DB
        self.assertFalse(Movie.objects.filter(movie_id=movie_id).exists())

    # --- System Statistics Tests ---

    def test_statistics_requires_auth(self):
        """Statistics endpoint requires authentication."""
        self.assertEqual(self._get_stats(client=APIClient()).status_code, 401)

    def test_statistics_requires_admin(self):
        """Statistics endpoint requires admin role."""
        self.client.session.flush()
        self._login_regular()
        
        resp = self._get_stats()
        self.assertEqual(resp.status_code, 403)

    def test_statistics_returns_correct_counts(self):
        """Statistics returns correct user, movie, and rating counts."""
        # Create test data
        m1 = Movie.objects.create(title='M1', genre='A', description='D1')
        m2 = Movie.objects.create(title='M2', genre='B', description='D2')
        
        u1 = self.regular_user  # Already exists
        u2 = AppUser.objects.create(username="u2", email="u2@e.com", password="p")
        
        Rating.objects.create(user=u1, movie=m1, score=4.0)
        Rating.objects.create(user=u1, movie=m2, score=5.0)
        Rating.objects.create(user=u2, movie=m1, score=3.0)
        
        # Call statistics
        resp = self._get_stats()
        self.assertEqual(resp.status_code, 200)
        
        body = resp.json()
        # Should have: admin, regular_user, u2 = 3 users
        self.assertEqual(body['total_users'], 3)
        # Should have: m1, m2 = 2 movies
        self.assertEqual(body['total_movies'], 2)
        # Should have: 3 ratings
        self.assertEqual(body['total_ratings'], 3)

    def test_statistics_top_movies_most_ratings(self):
        """Statistics returns top 5 movies by rating count."""
        m1 = Movie.objects.create(title='M1', genre='A', description='D1')
        m2 = Movie.objects.create(title='M2', genre='B', description='D2')
        m3 = Movie.objects.create(title='M3', genre='C', description='D3')
        
        u1 = self.regular_user
        u2 = AppUser.objects.create(username="u2", email="u2@e.com", password="p")
        u3 = AppUser.objects.create(username="u3", email="u3@e.com", password="p")
        
        # m1: 3 ratings (most)
        Rating.objects.create(user=u1, movie=m1, score=4.0)
        Rating.objects.create(user=u2, movie=m1, score=5.0)
        Rating.objects.create(user=u3, movie=m1, score=3.0)
        
        # m2: 2 ratings
        Rating.objects.create(user=u1, movie=m2, score=4.0)
        Rating.objects.create(user=u2, movie=m2, score=5.0)
        
        # m3: 1 rating
        Rating.objects.create(user=u1, movie=m3, score=3.0)
        
        resp = self._get_stats()
        self.assertEqual(resp.status_code, 200)
        
        body = resp.json()
        top_movies = body['top_movies_most_ratings']
        
        # First should be m1 with 3 ratings
        self.assertEqual(top_movies[0]['title'], 'M1')
        self.assertEqual(top_movies[0]['num_ratings'], 3)
        
        # Second should be m2 with 2 ratings
        self.assertEqual(top_movies[1]['title'], 'M2')
        self.assertEqual(top_movies[1]['num_ratings'], 2)

    def test_statistics_top_movies_highest_average(self):
        """Statistics returns top 5 movies by average rating."""
        m1 = Movie.objects.create(title='M1', genre='A', description='D1')
        m2 = Movie.objects.create(title='M2', genre='B', description='D2')
        m3 = Movie.objects.create(title='M3', genre='C', description='D3')
        
        u1 = self.regular_user
        u2 = AppUser.objects.create(username="u2", email="u2@e.com", password="p")
        
        # m1: avg 4.5
        Rating.objects.create(user=u1, movie=m1, score=4.0)
        Rating.objects.create(user=u2, movie=m1, score=5.0)
        
        # m2: avg 4.0
        Rating.objects.create(user=u1, movie=m2, score=4.0)
        Rating.objects.create(user=u2, movie=m2, score=4.0)
        
        # m3: avg 3.5 (only one rating, but still valid)
        Rating.objects.create(user=u1, movie=m3, score=3.5)
        
        resp = self._get_stats()
        self.assertEqual(resp.status_code, 200)
        
        body = resp.json()
        top_avg = body['top_movies_highest_avg']
        
        # First should be m1 with 4.5
        self.assertEqual(top_avg[0]['title'], 'M1')
        self.assertAlmostEqual(top_avg[0]['avg_rating'], 4.5, places=2)
        
        # Second should be m2 with 4.0
        self.assertEqual(top_avg[1]['title'], 'M2')
        self.assertAlmostEqual(top_avg[1]['avg_rating'], 4.0, places=2)

    def test_statistics_with_no_data(self):
        """Statistics works correctly when database has minimal data."""
        # Delete all ratings and movies (keep users)
        Rating.objects.all().delete()
        Movie.objects.all().delete()
        
        resp = self._get_stats()
        self.assertEqual(resp.status_code, 200)
        
        body = resp.json()
        self.assertEqual(body['total_users'], 2)  # admin + regular_user
        self.assertEqual(body['total_movies'], 0)
        self.assertEqual(body['total_ratings'], 0)
        self.assertEqual(len(body['top_movies_most_ratings']), 0)
        self.assertEqual(len(body['top_movies_highest_avg']), 0)