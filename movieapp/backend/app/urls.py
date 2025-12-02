from django.contrib import admin
from django.urls import path
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from movies.views import user_list, register_user, login_user, logout_user

@csrf_exempt
def health(_):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health),
    path("api/users/", user_list),
    path("api/auth/register/", register_user),
    path("api/auth/login/", login_user),
    path("api/auth/logout/", logout_user),
]
