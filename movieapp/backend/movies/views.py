"""
This file contains the API views (endpoints) that handle HTTP requests.
Each function here corresponds to a URL route defined in urls.py.

Flow:
  Frontend → HTTP Request → urls.py → views.py → Database → Response → Frontend
"""

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import AppUser


# ============================================
# USER LIST 
# ============================================
# URL: /api/users/
# Methods: GET (list all users), POST (create new user)
# ============================================
@api_view(['GET', 'POST'])  # This decorator specifies allowed HTTP methods
def user_list(request):
    """
    Handle user listing and creation.
    
    GET /api/users/
        Returns a list of all users in the database.
        Response: [{"id": 1, "username": "john", "email": "john@example.com"}, ...]
    
    POST /api/users/
        Creates a new user in the database.
        Request body: {"username": "john", "email": "john@example.com", "password": "secret"}
        Response: {"id": 1, "username": "john", "email": "john@example.com"}
    """
    
    # ============================================
    # GET - List all users
    # ============================================
    if request.method == 'GET':
        # Query all AppUser objects from the database
        # This is equivalent to: SELECT * FROM appuser;
        users = AppUser.objects.all()
        
        # Convert Django objects to a list of dictionaries
        # We exclude password for security reasons
        # Using user_id instead of id to match SQL schema
        data = [
            {
                'id': u.user_id,
                'username': u.username,
                'email': u.email
            } 
            for u in users
        ]
        
        # Return JSON response with list of users
        return Response(data)

    # ============================================
    # POST - Create a new user
    # ============================================
    if request.method == 'POST':
        # Extract data from the request body (JSON)
        # request.data is automatically parsed from JSON by Django REST Framework
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        # --------------------------------------------
        # VALIDATION - Check required fields
        # --------------------------------------------
        if not username or not email or not password:
            return Response(
                {'error': 'username, email, and password are required'},
                status=status.HTTP_400_BAD_REQUEST  # 400 error
            )

        # --------------------------------------------
        # VALIDATION - Check if username already exists
        # --------------------------------------------
        # This is equivalent to: SELECT * FROM appuser WHERE username = '...';
        if AppUser.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --------------------------------------------
        # VALIDATION - Check if email already exists
        # --------------------------------------------
        if AppUser.objects.filter(email=email).exists():
            return Response(
                {'error': 'Email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --------------------------------------------
        # CREATE USER - Insert into database
        # --------------------------------------------
        # This is equivalent to: INSERT INTO appuser (username, email, password) VALUES (...);
        user = AppUser.objects.create(
            username=username,
            email=email,
            password=password  # TODO: Hash this in?
        )

        # Return the created user data with 201 Created status
        # Using user_id instead of id to match SQL schema
        return Response(
            {
                'id': user.user_id,
                'username': user.username,
                'email': user.email
            },
            status=status.HTTP_201_CREATED  # 201 = successfully created
        )