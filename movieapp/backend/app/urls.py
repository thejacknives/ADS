from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from movies.views import (
    login_user,
    logout_user,
    register_user,
    user_list,
    user_recommendations,
)

@csrf_exempt
def health(_):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health),
    path("api/users/", user_list),
    path("api/users/<int:user_id>/recommendations/", user_recommendations),
    path("api/auth/register/", register_user),
    path("api/auth/login/", login_user),
    path("api/auth/logout/", logout_user),
]
