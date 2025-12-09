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
    create_rating,
    edit_rating,
    delete_rating,
    get_movie_ratings,
    list_my_ratings,
    list_my_recommendations,
    get_movie_details,
    admin_add_movie,
    admin_edit_movie,
    admin_delete_movie,
    system_statistics,
    user_profile,
    user_rating_history,
    user_recommendation_history,
    movie_list,
    movie_detail,
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
    path("api/ratings/<int:movie_id>/", create_rating),
    path("api/ratings/<int:movie_id>/edit/", edit_rating),
    path("api/ratings/<int:movie_id>/delete/", delete_rating),
    path("api/movies/<int:movie_id>/ratings/", get_movie_ratings),
    path("api/ratings/mine/", list_my_ratings),
    path("api/recommendations/mine/", list_my_recommendations),
    path('api/movies/<int:movie_id>/', get_movie_details, name='movie_details'),
    path("api/admin/movies/add/", admin_add_movie),
    path("api/admin/movies/<int:movie_id>/edit/", admin_edit_movie),
    path("api/admin/movies/<int:movie_id>/delete/", admin_delete_movie),
    path("api/admin/statistics/", system_statistics),
    path("api/profile/", user_profile),
    path("api/profile/ratings/", user_rating_history),
    path("api/profile/recommendations/", user_recommendation_history),
    path("api/movies/", movie_list),
    path("api/movies/<int:movie_id>/", movie_detail),
    
]
