from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import json

def chat_page(request):
    return render(request, 'chat.html')

@csrf_exempt  # For simplicity; use CSRF tokens in production
def chat_response(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_message = data.get('message', '').lower().strip()
            
            # Simple predefined responses
            responses = {
                'hello': 'Hi there! How can I help you?',
                'how are you': 'Doing great, thanks for asking!',
                'bye': 'Goodbye! Come back soon!',
            }
            
            bot_response = responses.get(user_message, "Sorry, I don't understand that. Try saying 'hello', 'how are you', or 'bye'.")
            return JsonResponse({'response': bot_response})
        except json.JSONDecodeError:
            return JsonResponse({'response': 'Error: Invalid input'}, status=400)
    return JsonResponse({'response': 'Please send a POST request'}, status=400)