"""
This file contains the API views (endpoints) that handle HTTP requests.
Each function here corresponds to a URL route defined in urls.py.

Flow:
  Frontend → HTTP Request → urls.py → views.py → Database → Response → Frontend
"""

import re
from collections import defaultdict

from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Count, Avg, Q
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import AppUser, Movie, Rating, Recommendation
from django.db.models import Avg, Count, Q
import random

#test
def _validate_user_payload(username, email, password):
    """
    Ensure the required user fields exist and there are no duplicates.
    Returns (error_response, None) if invalid, or (None, cleaned_payload) otherwise.
    """
    if not username or not email or not password:
        return Response(
            {'error': 'name/username, email, and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        ), None

    if username and not re.fullmatch(r"[A-Za-z0-9_]+", username):
        return Response(
            {'error': 'Username can only contain letters, numbers, and underscores'},
            status=status.HTTP_400_BAD_REQUEST,
        ), None

    try:
        validate_email(email)
    except ValidationError:
        return Response(
            {'error': 'Email is not valid'},
            status=status.HTTP_400_BAD_REQUEST,
        ), None

    if AppUser.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST,
        ), None

    if AppUser.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email already exists'},
            status=status.HTTP_400_BAD_REQUEST,
        ), None

    return None, {
        'username': username,
        'email': email,
        'password': password,
    }


def _serialize_user(user):
    return {
        'id': user.user_id,
        'username': user.username,
        'email': user.email,
    }


def _create_user(username, email, password):
    """
    Helper to create a user with a hashed password.
    """
    hashed_password = make_password(password)
    return AppUser.objects.create(
        username=username,
        email=email,
        password=hashed_password,
    )


def _calculate_genre_preferences(user_ratings):
    """
    Build a per-genre preference profile using the user's historical ratings.
    """
    genre_totals = defaultdict(lambda: {"sum": 0.0, "count": 0})
    for rating in user_ratings:
        genre = (rating.movie.genre or "").strip().lower()
        if not genre:
            continue
        entry = genre_totals[genre]
        entry["sum"] += rating.score
        entry["count"] += 1

    return {
        genre: bucket["sum"] / bucket["count"]
        for genre, bucket in genre_totals.items()
        if bucket["count"] > 0
    }


def _predict_content_scores(candidates, genre_preferences):
    """
    Apply the genre profile to unseen movies to estimate a score.
    """
    if not genre_preferences:
        return {}

    scores = {}
    for movie in candidates:
        genre = (movie.genre or "").strip().lower()
        pref = genre_preferences.get(genre)
        if pref is not None:
            scores[movie.movie_id] = pref
    return scores


def _predict_collaborative_scores(target_user, user_ratings_map):
    """
    Estimate scores using a lightweight user-based collaborative filter.
    """
    other_ratings = (
        Rating.objects.exclude(user=target_user)
        .select_related("user")
        .all()
    )

    ratings_by_user = defaultdict(list)
    for rating in other_ratings:
        ratings_by_user[rating.user_id].append(rating)

    similarities = {}
    for other_id, ratings in ratings_by_user.items():
        diffs = [
            abs(r.score - user_ratings_map[r.movie_id])
            for r in ratings
            if r.movie_id in user_ratings_map
        ]
        if not diffs:
            continue
        avg_diff = sum(diffs) / len(diffs)
        similarities[other_id] = 1 / (1 + avg_diff)

    movie_weights = defaultdict(lambda: {"total": 0.0, "weight": 0.0})
    for other_id, ratings in ratings_by_user.items():
        similarity = similarities.get(other_id)
        if not similarity:
            continue
        for rating in ratings:
            if rating.movie_id in user_ratings_map:
                continue
            bucket = movie_weights[rating.movie_id]
            bucket["total"] += similarity * rating.score
            bucket["weight"] += similarity

    return {
        movie_id: bucket["total"] / bucket["weight"]
        for movie_id, bucket in movie_weights.items()
        if bucket["weight"] > 0
    }

def _generate_recommendations(user):
    """
    Gera recomendações com 3 níveis de tentativa:
    1. Híbrido (Se tiver histórico e matches)
    2. Top Global (Se for user novo ou algoritmo falhar)
    3. Aleatório (Se o sistema estiver vazio de ratings e precisar de encher chouriços)
    """
    
    # Busca histórico do user
    user_ratings = list(Rating.objects.filter(user=user).select_related('movie'))
    
    # Lista de IDs que o user já viu (para não recomendar repetidos)
    watched_ids = {r.movie_id for r in user_ratings}
    
    top_entries = []

    # --- FASE 1: Tentar Algoritmo Personalizado (Só se o user tiver histórico) ---
    if user_ratings:
        user_ratings_map = {r.movie_id: r.score for r in user_ratings}
        candidates = list(Movie.objects.exclude(movie_id__in=watched_ids))
        
        if candidates:
            genre_preferences = _calculate_genre_preferences(user_ratings)
            content_predictions = _predict_content_scores(candidates, genre_preferences)
            collaborative_predictions = _predict_collaborative_scores(user, user_ratings_map)

            combined = []
            for movie in candidates:
                collab = collaborative_predictions.get(movie.movie_id)
                content = content_predictions.get(movie.movie_id)
                
                if collab is None and content is None:
                    continue
                
                if collab is None: score = content
                elif content is None: score = collab
                else: score = (0.6 * collab) + (0.4 * content)

                combined.append({'movie': movie, 'predicted_score': score})
            
            combined.sort(key=lambda x: x['predicted_score'], reverse=True)
            top_entries = combined[:10]

    # --- FASE 2: Fallback para Top Global (Se Fase 1 falhou ou User é Novo) ---
    # Se ainda não temos 10 filmes, vamos buscar os melhores da BD
    if len(top_entries) < 10:
        needed = 10 - len(top_entries)
        
        # CORREÇÃO AQUI: .filter(avg__isnull=False) garante que tem ratings!
        top_global = Movie.objects.exclude(movie_id__in=watched_ids)\
            .annotate(avg=Avg('ratings__score'))\
            .filter(avg__isnull=False)\
            .order_by('-avg')[:needed]
        
        for movie in top_global:
            # Já sabemos que tem avg, mas por segurança fazemos cast
            score = float(movie.avg) if movie.avg else 0.0
            
            # Evita duplicados caso já tenha vindo da Fase 1 (raro mas possível)
            if not any(e['movie'].movie_id == movie.movie_id for e in top_entries):
                top_entries.append({'movie': movie, 'predicted_score': score})

    # --- FASE 3: Fallback Final (Se Fase 2 não chegou - BD com poucos ratings) ---
    # Se mesmo assim não temos 10 filmes (ex: BD nova, ninguém avaliou nada),
    # enchemos com filmes aleatórios para não mostrar ecrã vazio.
    if len(top_entries) < 10:
        current_ids = {e['movie'].movie_id for e in top_entries}
        exclude_ids = watched_ids.union(current_ids)
        
        needed = 10 - len(top_entries)
        # Traz quaisquer filmes que faltem
        fillers = list(Movie.objects.exclude(movie_id__in=exclude_ids)[:needed])
        
        for movie in fillers:
            # Score 0 porque são fillers
            top_entries.append({'movie': movie, 'predicted_score': 0})

    # --- SALVAR ---
    if top_entries:
        Recommendation.objects.filter(user=user).delete()
        Recommendation.objects.bulk_create([
            Recommendation(
                user=user,
                movie=entry['movie'],
                predicted_score=round(entry['predicted_score'], 2),
            )
            for entry in top_entries
        ])
        return True
    
    return False

@api_view(['GET'])
def user_list(request):
    """
    Read-only listing of users (legacy endpoint).
    GET /api/users/ -> [{"id": 1, "username": "john", "email": "john@example.com"}, ...]
    """
    
    users = AppUser.objects.all()
    data = [
        {
            'id': u.user_id,
            'username': u.username,
            'email': u.email
        }
        for u in users
    ]
    return Response(data)


@api_view(['POST'])
def register_user(request):
    """
    Register a new user.
    Expects: {"name": "...", "email": "...", "password": "..."}
    """
    username = request.data.get('name') or request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    error_response, payload = _validate_user_payload(username, email, password)
    if error_response:
        return error_response

    user = _create_user(
        username=payload['username'],
        email=payload['email'],
        password=payload['password'],
    )
    return Response(_serialize_user(user), status=status.HTTP_201_CREATED)


@api_view(['POST'])
def login_user(request):
    """
    Authenticate a user with email + password.
    """
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response(
            {'error': 'email and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = AppUser.objects.get(email=email)
    except AppUser.DoesNotExist:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not check_password(password, user.password):
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    request.session['user_id'] = user.user_id
    request.session['username'] = user.username
    request.session.cycle_key()

    return Response(
        {
            'message': 'Login successful',
            'user': _serialize_user(user),
        }
    )

@api_view(['POST'])
def logout_user(request):
    """
    Destroy the user session.
    """
    request.session.flush()
    return Response({'message': 'Logout successful'})



def _check_user_logged_in(request):
    """
    Helper to check if user is logged in.
    """
    user_id = request.session.get('user_id')
    if not user_id:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED,
        ), None
    return None, user_id

@api_view(['POST'])
def create_rating(request, movie_id):
    """
    Create a new rating for a movie based on a scale of 1-5.
    """

    # check if user is logged in
    error_response, user_id = _check_user_logged_in(request)
    if error_response:
        return error_response
    
    # check if the movie exists
    if not Movie.objects.filter(movie_id=movie_id).exists():
        return Response(
            {'error': 'Movie not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    
    # check if rating value is between 1 and 5
    rating_value = request.data.get('rating')
    
    if rating_value is None:
        return Response(
            {'error': 'Rating is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    try:
        rating_int = int(rating_value)
    except (ValueError, TypeError):
        return Response(
            {'error': 'Rating must be a valid integer'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    if not (1 <= rating_int <= 5):
        return Response(
            {'error': 'Rating must be between 1 and 5'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # check if user has already rated this movie
    if Rating.objects.filter(user_id=user_id, movie_id=movie_id).exists():
        return Response(
            {'error': 'You have already rated this movie'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # save the new rating
    rating = Rating.objects.create(
        score=rating_int,
        movie_id=movie_id,
        user_id=user_id,
    )

    user = AppUser.objects.get(user_id=user_id)
    _generate_recommendations(user)

    return Response(
        {
            'message': 'Rating created successfully',
            'rating': {
                'score': rating.score,
                'created_at': rating.created_at,
                'movie_id': rating.movie_id,
                'user_id': rating.user_id,
            },
        },
        status=status.HTTP_201_CREATED,
    )

@api_view(['GET'])
def get_movie_ratings(request, movie_id):
    """
    Retrieve all ratings for a specific movie.
    """

    # check if the movie exists
    if not Movie.objects.filter(movie_id=movie_id).exists():
        return Response(
            {'error': 'Movie not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    
    # get all ratings
    ratings = Rating.objects.filter(movie_id=movie_id)

    if not ratings.exists():
        return Response(
            {
                'movie_id': movie_id,
                'total_ratings': 0,
                'average_rating': 0,
                'ratings': [],
            },
            status=status.HTTP_200_OK,
        )
    
    # convert django object to json
    ratings_data = []
    for rating in ratings:
        ratings_data.append({
            'rating_id': rating.rating_id,
            'score': rating.score,
            'created_at': rating.created_at,
            'user_id': rating.user_id,
        })

    # stats
    total_ratings = ratings.count()
    average_rating = sum(rating.score for rating in ratings) / total_ratings

    return Response(
        {
            'movie_id': movie_id,
            'total_ratings': total_ratings,
            'average_rating': average_rating,
            'ratings': ratings_data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(['PUT'])
def edit_rating(request, rating_id):
    """
    Edit an existing rating.
    """

    # check if user is logged in
    error_response, user_id = _check_user_logged_in(request)
    if error_response:
        return error_response
    
    # check if the rating exists
    if not Rating.objects.filter(rating_id=rating_id).exists():
        return Response(
            {'error': 'Rating not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    
    # check if user is the owner of the rating
    rating = Rating.objects.get(rating_id=rating_id)
    if rating.user_id != user_id:
        return Response(
            {'error': 'You do not have permission to edit this rating'},
            status=status.HTTP_403_FORBIDDEN,
        )
    
    # check if rating value is between 1 and 5 and if it's different
    rating_value = request.data.get('rating')
    
    if rating_value is None:
        return Response(
            {'error': 'Rating is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    try:
        rating_int = int(rating_value)
    except (ValueError, TypeError):
        return Response(
            {'error': 'Rating must be a valid integer'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    if not (1 <= rating_int <= 5):
        return Response(
            {'error': 'Rating must be between 1 and 5'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    if rating.score == rating_int:
        return Response(
            {'error': 'New rating must be different from the current rating'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # update the rating
    rating.score = rating_int
    rating.save()

    user = AppUser.objects.get(user_id=user_id)
    _generate_recommendations(user)

    return Response(
        {
            'message': 'Rating updated successfully',
            'rating': {
                'rating_id': rating.rating_id,
                'score': rating.score,
                'created_at': rating.created_at,
                'user_id': rating.user_id,
            },
        },
        status=status.HTTP_200_OK,
    )

@api_view(['DELETE'])
def delete_rating(request, rating_id):
    """
    Delete an existing rating.
    """

    # check if user is logged in
    error_response, user_id = _check_user_logged_in(request)
    if error_response:
        return error_response
    
    # check if the rating exists
    if not Rating.objects.filter(rating_id=rating_id).exists():
        return Response(
            {'error': 'Rating not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    
    # check if user is the owner of the rating
    rating = Rating.objects.get(rating_id=rating_id)
    if rating.user_id != user_id:
        return Response(
            {'error': 'You do not have permission to delete this rating'},
            status=status.HTTP_403_FORBIDDEN,
        )
    
    # delete the rating
    rating.delete()

    user = AppUser.objects.get(user_id=user_id)
    _generate_recommendations(user)

    return Response(
        {'message': 'Rating deleted successfully'},
        status=status.HTTP_204_NO_CONTENT,
    )

@api_view(['GET'])
def list_my_ratings(request):
    """
    List all ratings made by the logged-in user.
    """

    # check if user is logged in
    error_response, user_id = _check_user_logged_in(request)
    if error_response:
        return error_response
    
    # get all ratings by the user
    ratings = Rating.objects.filter(user_id=user_id)

    if not ratings.exists():
        return Response(
            {
                'user_id': user_id,
                'total_ratings': 0,
                'ratings': [],
            },
            status=status.HTTP_200_OK,
        )
    
    # convert django object to json
    ratings_data = []
    for rating in ratings:
        ratings_data.append({
            'rating_id': rating.rating_id,
            'score': rating.score,
            'created_at': rating.created_at,
            'movie_id': rating.movie_id,
        })

    total_ratings = ratings.count()

    return Response(
        {
            'user_id': user_id,
            'total_ratings': total_ratings,
            'ratings': ratings_data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(['GET'])
def list_my_recommendations(request):
    """
    Lista as recomendações do utilizador.
    Se a lista estiver vazia, tenta gerar novas automaticamente.
    """
    error_response, user_id = _check_user_logged_in(request)
    if error_response:
        return error_response
    
    # Precisamos do objeto user para as queries
    try:
        user = AppUser.objects.get(user_id=user_id)
    except AppUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    # 1. Tenta buscar o que já existe
    recommendations = Recommendation.objects.filter(user=user).select_related('movie').order_by('-predicted_score')

    # 2. Lógica "Lazy Loading": Se não existe nada, chama o Helper!
    if not recommendations.exists():
        has_generated = _generate_recommendations(user)
        if has_generated:
            # Se gerou, recarrega a query para apanhar os dados novos
            recommendations = Recommendation.objects.filter(user=user).select_related('movie').order_by('-predicted_score')

    # 3. Serializar para JSON
    data = []
    for rec in recommendations:
        # Importante: include_details=True para vir a Capa e o Título
        movie_data = _serialize_movie(rec.movie, include_details=True)
        
        data.append({
            'rec_id': rec.rec_id,
            'predicted_score': rec.predicted_score,
            'movie': movie_data 
        })

    return Response(
        {
            'user_id': user_id,
            'total_recommendations': recommendations.count(),
            'recommendations': data,
        },
        status=status.HTTP_200_OK,
    )


def _check_user_is_admin(user_id):
    """
    Helper to check if user is admin.
    """
    try:
        user = AppUser.objects.get(user_id=user_id)
    except AppUser.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND,
        ), None
    
    if not user.is_admin:
        return Response(
            {'error': 'Admin privileges required'},
            status=status.HTTP_403_FORBIDDEN,
        ), None
    
    return None, user

@api_view(['GET'])
def get_movie_details(request, movie_id):
    """
    Retorna os detalhes de um filme específico.
    Se não encontrar, devolve um JSON de erro padrão.
    """
    try:
        movie = Movie.objects.get(pk=movie_id)
        
        return Response({
            "id": movie.movie_id,
            "title": movie.title,
            "year": movie.year,
            "genre": movie.genre,
            "poster_url": movie.poster_url,
            "description": movie.description
        })
        
    except Movie.DoesNotExist:
        # Erro padrão que o teu api.ts consegue ler
        return Response(
            {'error': 'Filme não encontrado'}, 
            status=404
        )

@api_view(['POST'])
def admin_add_movie(request):
    """
    Admin endpoint to add a new movie.
    """

    # check if user is logged in
    error_response, user_id = _check_user_logged_in(request)
    if error_response:
        return error_response
    
    # validate movie data
    title = request.data.get('title')
    genre = request.data.get('genre')
    description = request.data.get('description')

    if not title or not genre or not description:
        return Response(
            {'error': 'Title, genre, and description are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # validate length constraints
    if len(title) > 512:
        return Response(
            {'error': 'Title must be 512 characters or less'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    if len(genre) > 512:
        return Response(
            {'error': 'Genre must be 512 characters or less'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    if len(description) > 512:
        return Response(
            {'error': 'Description must be 512 characters or less'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # check if user is admin
    error_response, user = _check_user_is_admin(user_id)
    if error_response:
        return error_response
    
    # create the movie
    movie = Movie.objects.create(
        title=title,
        genre=genre,
        description=description,
    )
    return Response(
        {
            'message': 'Movie added successfully',
            'movie': {
                'movie_id': movie.movie_id,
                'title': movie.title,
                'genre': movie.genre,
                'description': movie.description,
            },
        },
        status=status.HTTP_201_CREATED,
    )

@api_view(['PUT'])
def admin_edit_movie(request, movie_id):
    """
    Admin endpoint to edit an existing movie.
    """
    # check if user is logged in
    error_response, user_id = _check_user_logged_in(request)
    if error_response:
        return error_response
    
    # check if the movie exists
    try:
        movie = Movie.objects.get(movie_id=movie_id)
    except Movie.DoesNotExist:
        return Response(
            {'error': 'Movie not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    
    # check if user is admin
    error_response, user = _check_user_is_admin(user_id)
    if error_response:
        return error_response
    
    # validate movie data
    title = request.data.get('title')
    genre = request.data.get('genre')
    description = request.data.get('description')

    if not title or not genre or not description:
        return Response(
            {'error': 'Title, genre, and description are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # validate length constraints
    if len(title) > 512:
        return Response(
            {'error': 'Title must be 512 characters or less'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    if len(genre) > 512:
        return Response(
            {'error': 'Genre must be 512 characters or less'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    if len(description) > 512:
        return Response(
            {'error': 'Description must be 512 characters or less'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # update the movie
    movie.title = title
    movie.genre = genre
    movie.description = description
    movie.save()

    return Response(
        {
            'message': 'Movie updated successfully',
            'movie': {
                'movie_id': movie.movie_id,
                'title': movie.title,
                'genre': movie.genre,
                'description': movie.description,
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(['DELETE'])
def admin_delete_movie(request, movie_id):
    """
    Admin endpoint to delete an existing movie.
    """
    # check if user is logged in
    error_response, user_id = _check_user_logged_in(request)
    if error_response:
        return error_response
    
    # check if the movie exists
    try:
        movie = Movie.objects.get(movie_id=movie_id)
    except Movie.DoesNotExist:
        return Response(
            {'error': 'Movie not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    
    # check if user is admin
    error_response, user = _check_user_is_admin(user_id)
    if error_response:
        return error_response
    
    # delete the movie
    movie.delete()

    return Response(
        {'message': 'Movie deleted successfully'},
        status=status.HTTP_204_NO_CONTENT,
    )

@api_view(['GET'])
def system_statistics(request):
    """
    Admin endpoint to retrieve system statistics (number of users, movies, ratings, 
    top movies with most ratings and top movies with most average rating).
    """

    # check if user is logged in
    error_response, user_id = _check_user_logged_in(request)
    if error_response:
        return error_response
    
    # check if user is admin
    error_response, user = _check_user_is_admin(user_id)
    if error_response:
        return error_response
    
    # statistics
    total_users = AppUser.objects.count()
    total_movies = Movie.objects.count()
    total_ratings = Rating.objects.count()

    # top movies with most ratings
    top_movies_most_ratings = Movie.objects.annotate(
        num_ratings=Count('ratings')
    ).order_by('-num_ratings')[:5]

    top_movies_most_ratings_data = []
    for movie in top_movies_most_ratings:
        top_movies_most_ratings_data.append({
            'movie_id': movie.movie_id,
            'title': movie.title,
            'genre': movie.genre,
            'description': movie.description,
            'num_ratings': movie.num_ratings,
        })

    # top movies with highest average rating
    top_movies_highest_avg = Movie.objects.annotate(
        avg_rating=Avg('ratings__score')
    ).filter(avg_rating__isnull=False).order_by('-avg_rating')[:5]

    top_movies_highest_avg_data = []
    for movie in top_movies_highest_avg:
        top_movies_highest_avg_data.append({
            'movie_id': movie.movie_id,
            'title': movie.title,
            'genre': movie.genre,
            'description': movie.description,
            'avg_rating': movie.avg_rating,
        })
        

    return Response(
        {
            'total_users': total_users,
            'total_movies': total_movies,
            'total_ratings': total_ratings,
            'top_movies_most_ratings': top_movies_most_ratings_data,
            'top_movies_highest_avg': top_movies_highest_avg_data,
        },
        status=status.HTTP_200_OK,
    )


def _serialize_movie(movie, include_details=True):
    """Serialize movie object"""
    data = {
        'id': movie.movie_id,
        'title': movie.title,
        'genre': movie.genre,
        'year': movie.year,
        'average_rating': movie.average_rating,
        'rating_count': movie.rating_count,
    }
    
    if include_details:
        data.update({
            'director': movie.director,
            'description': movie.description,
            'poster_url': movie.poster_url,
        })
    
    return data


def _serialize_rating_with_movie(rating):
    """Serialize rating object with movie info"""
    return {
        'id': rating.rating_id,
        'score': rating.score,
        'created_at': rating.created_at.isoformat(),
        'movie': {
            'id': rating.movie.movie_id,
            'title': rating.movie.title,
            'genre': rating.movie.genre,
            'year': rating.movie.year,
        }
    }


def _serialize_recommendation_with_movie(rec):
    """Serialize recommendation object with movie info"""
    return {
        'id': rec.rec_id,
        'predicted_score': rec.predicted_score,
        'movie': _serialize_movie(rec.movie, include_details=True)
    }


def _get_authenticated_user_obj(request):
    """Get the currently authenticated user object (not just ID)"""
    user_id = request.session.get('user_id')
    if not user_id:
        return None
    try:
        return AppUser.objects.get(user_id=user_id)
    except AppUser.DoesNotExist:
        return None
    
@api_view(['GET', 'PUT'])
def user_profile(request):
    """
    GET /api/profile/ -> View profile
    PUT /api/profile/ -> Update profile
    """
    user = _get_authenticated_user_obj(request)
    if not user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if request.method == 'GET':
        return Response(_serialize_user(user))
    
    # PUT - Update profile
    username = request.data.get('username')
    email = request.data.get('email')
    
    if username and username != user.username:
        if not re.fullmatch(r"[A-Za-z0-9_]+", username):
            return Response(
                {'error': 'Username can only contain letters, numbers, and underscores'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if AppUser.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.username = username
    
    if email and email != user.email:
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {'error': 'Email is not valid'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if AppUser.objects.filter(email=email).exists():
            return Response(
                {'error': 'Email already exists'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.email = email
    
    user.save()
    return Response(_serialize_user(user))


@api_view(['GET'])
def user_rating_history(request):
    """
    GET /api/profile/ratings/ -> Get user's rating history
    """
    user = _get_authenticated_user_obj(request)
    if not user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    ratings = Rating.objects.filter(user=user).select_related('movie').order_by('-created_at')
    data = [_serialize_rating_with_movie(r) for r in ratings]
    return Response(data)


@api_view(['GET'])
def user_recommendation_history(request):
    """
    GET /api/profile/recommendations/ -> Get user's recommendation history
    """
    user = _get_authenticated_user_obj(request)
    if not user:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    recommendations = Recommendation.objects.filter(user=user).select_related('movie').order_by('-rec_id')
    data = [_serialize_recommendation_with_movie(r) for r in recommendations]
    return Response(data)


@api_view(['GET'])
def movie_list(request):
    """
    GET /api/movies/ -> List all movies
    """
    movies = Movie.objects.all().order_by('title')
    data = [_serialize_movie(m) for m in movies]
    
    return Response({
        'movies': data,
        'total': movies.count(),
    })


@api_view(['GET'])
def movie_detail(request, movie_id):
    """
    GET /api/movies/<id>/ -> Get detailed movie information
    """
    try:
        movie = Movie.objects.get(movie_id=movie_id)
    except Movie.DoesNotExist:
        return Response(
            {'error': 'Movie not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    data = _serialize_movie(movie, include_details=True)
    
    # Add user's rating if authenticated
    user = _get_authenticated_user_obj(request)
    if user:
        try:
            user_rating = Rating.objects.get(user=user, movie=movie)
            data['user_rating'] = user_rating.score
            data['user_rating_id'] = user_rating.rating_id
        except Rating.DoesNotExist:
            data['user_rating'] = None
            data['user_rating_id'] = None
    
    return Response(data)


@api_view(['GET'])
def movie_search(request):
    """
    GET /api/movies/search/ -> Search movies
    Query params: 
        ?q=query          (searches title, director)
        &genre=action
        &year_min=2000
        &year_max=2024
        &rating_min=3.5
        &sort=title|year|rating
    """
    movies = Movie.objects.all()
    
    # Text search (title or director)
    query = request.GET.get('q', '').strip()
    if query:
        movies = movies.filter(
            Q(title__icontains=query) | Q(director__icontains=query)
        )
    
    # Genre filter
    genre = request.GET.get('genre', '').strip()
    if genre:
        movies = movies.filter(genre__icontains=genre)
    
    # Year filters
    year_min = request.GET.get('year_min')
    if year_min:
        try:
            movies = movies.filter(year__gte=int(year_min))
        except ValueError:
            pass
    
    year_max = request.GET.get('year_max')
    if year_max:
        try:
            movies = movies.filter(year__lte=int(year_max))
        except ValueError:
            pass
    
    # Rating filter (filter in Python after loading)
    rating_min = request.GET.get('rating_min')
    if rating_min:
        try:
            rating_min = float(rating_min)
            movies_list = list(movies)
            movies_list = [m for m in movies_list if m.average_rating >= rating_min]
            
            # Apply sorting
            sort_by = request.GET.get('sort', 'title')
            if sort_by == 'year':
                movies_list.sort(key=lambda m: m.year or 0, reverse=True)
            elif sort_by == 'rating':
                movies_list.sort(key=lambda m: m.average_rating, reverse=True)
            else:
                movies_list.sort(key=lambda m: m.title.lower())
            
            data = [_serialize_movie(m) for m in movies_list]
            return Response({
                'movies': data,
                'count': len(data),
            })
        except ValueError:
            pass
    
    # Sorting (without rating filter)
    sort_by = request.GET.get('sort', 'title')
    if sort_by == 'year':
        movies = movies.order_by('-year')
    elif sort_by == 'rating':
       
        movies_list = list(movies)
        movies_list.sort(key=lambda m: m.average_rating, reverse=True)
        data = [_serialize_movie(m) for m in movies_list]
        return Response({
            'movies': data,
            'count': len(data),
        })
    else:
        movies = movies.order_by('title')
    
    data = [_serialize_movie(m) for m in movies]
    return Response({
        'movies': data,
        'count': len(data),
    })


@api_view(['GET'])
def list_my_ratings_details(request):
    """
    Endpoint PESADO: Traz as ratings e os detalhes completos dos filmes.
    Usado apenas na página 'As Minhas Avaliações'.
    """
    error_response, user_id = _check_user_logged_in(request)
    if error_response:
        return error_response
    
    # Fazemos o Join (select_related) para ser eficiente
    ratings = Rating.objects.filter(user_id=user_id).select_related('movie').order_by('-created_at')

    ratings_data = []
    for rating in ratings:
        # Aqui serializamos o filme COMPLETO (com director, poster, etc)
        movie_data = _serialize_movie(rating.movie, include_details=True)
        
        ratings_data.append({
            'rating_id': rating.rating_id,
            'score': rating.score,
            'created_at': rating.created_at,
            'movie_id': rating.movie_id,
            'movie': movie_data, # O filme vai aninhado aqui
        })

    return Response(
        {
            'user_id': user_id,
            'total_ratings': ratings.count(),
            'ratings': ratings_data,
        },
        status=status.HTTP_200_OK,
    )