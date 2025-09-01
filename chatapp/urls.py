from django.urls import path
from . import views

urlpatterns = [
    path('', views.chat_page, name='chat_page'),
    path('chat/', views.chat_response, name='chat_response'),
]

