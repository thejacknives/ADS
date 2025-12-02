"""
This file contains the API views (endpoints) that handle HTTP requests.
Each function here corresponds to a URL route defined in urls.py.

Flow:
  Frontend → HTTP Request → urls.py → views.py → Database → Response → Frontend
"""

import re

from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import AppUser


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
