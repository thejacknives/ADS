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
from django.db.models import Avg
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import AppUser, Movie, Rating, Recommendation


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


@api_view(['GET'])
def user_recommendations(request, user_id):
    """
    Generate hybrid (collaborative + content) recommendations for a user.
    """
    try:
        user = AppUser.objects.get(user_id=user_id)
    except AppUser.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    user_ratings = list(
        Rating.objects.filter(user=user).select_related('movie')
    )

    if not user_ratings:
        fallback = (
            Movie.objects.annotate(avg_score=Avg('ratings__score'))
            .filter(avg_score__isnull=False)
            .order_by('-avg_score')[:10]
        )
        suggestions = [
            {
                'movie_id': movie.movie_id,
                'title': movie.title,
                'genre': movie.genre,
                'description': movie.description,
                'predicted_score': round(movie.avg_score, 2) if movie.avg_score else None,
                'method': 'global_top_rated',
            }
            for movie in fallback
        ]
        return Response(
            {
                'user': _serialize_user(user),
                'recommendations': suggestions,
                'note': 'User has no ratings yet; showing top-rated movies overall.',
            }
        )

    user_movie_ids = {rating.movie_id for rating in user_ratings}
    user_ratings_map = {rating.movie_id: rating.score for rating in user_ratings}

    candidates = list(
        Movie.objects.exclude(movie_id__in=user_movie_ids)
    )
    if not candidates:
        return Response(
            {
                'user': _serialize_user(user),
                'recommendations': [],
                'note': 'User has already rated every movie.',
            }
        )

    genre_preferences = _calculate_genre_preferences(user_ratings)
    content_predictions = _predict_content_scores(candidates, genre_preferences)
    collaborative_predictions = _predict_collaborative_scores(user, user_ratings_map)

    combined = []
    for movie in candidates:
        collab_score = collaborative_predictions.get(movie.movie_id)
        content_score = content_predictions.get(movie.movie_id)
        if collab_score is None and content_score is None:
            continue

        if collab_score is None:
            final_score = content_score
            method = 'content'
        elif content_score is None:
            final_score = collab_score
            method = 'collaborative'
        else:
            final_score = (0.6 * collab_score) + (0.4 * content_score)
            method = 'hybrid'

        combined.append({
            'movie': movie,
            'predicted_score': final_score,
            'collaborative_score': collab_score,
            'content_score': content_score,
            'method': method,
        })

    if not combined:
        fallback = (
            Movie.objects.exclude(movie_id__in=user_movie_ids)
            .annotate(avg_score=Avg('ratings__score'))
            .filter(avg_score__isnull=False)
            .order_by('-avg_score')[:10]
        )
        suggestions = [
            {
                'movie_id': movie.movie_id,
                'title': movie.title,
                'genre': movie.genre,
                'description': movie.description,
                'predicted_score': round(movie.avg_score, 2) if movie.avg_score else None,
                'method': 'global_top_rated',
            }
            for movie in fallback
        ]
        return Response(
            {
                'user': _serialize_user(user),
                'recommendations': suggestions,
                'note': 'Not enough data to build personalized predictions; falling back to global scores.',
            }
        )

    combined.sort(key=lambda entry: entry['predicted_score'], reverse=True)
    top_entries = combined[:10]

    Recommendation.objects.filter(user=user).delete()
    Recommendation.objects.bulk_create([
        Recommendation(
            user=user,
            movie=entry['movie'],
            predicted_score=round(entry['predicted_score'], 2),
        )
        for entry in top_entries
    ])

    response_payload = [
        {
            'movie_id': entry['movie'].movie_id,
            'title': entry['movie'].title,
            'genre': entry['movie'].genre,
            'description': entry['movie'].description,
            'predicted_score': round(entry['predicted_score'], 2),
            'components': {
                'collaborative': round(entry['collaborative_score'], 2) if entry['collaborative_score'] is not None else None,
                'content': round(entry['content_score'], 2) if entry['content_score'] is not None else None,
            },
            'method': entry['method'],
        }
        for entry in top_entries
    ]

    return Response(
        {
            'user': _serialize_user(user),
            'recommendations': response_payload,
        }
    )
