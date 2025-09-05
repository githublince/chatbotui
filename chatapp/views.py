# views.py
import os
import json
import logging
import requests

from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)

# Configure these via Django settings or environment variables
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free"
REQUEST_TIMEOUT = 30  # seconds


def call_openrouter(prompt_text: str, model: str = DEFAULT_MODEL, timeout: int = REQUEST_TIMEOUT) -> str:
    """
    Call OpenRouter chat/completions endpoint and return the text content (string).
    Raises RuntimeError on failures.
    """
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OpenRouter API key is not set. Configure OPENROUTER_API_KEY in settings or env.")

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt_text}
        ],
        # optional: add other model params like temperature, top_p etc.
        # "temperature": 0.2
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()

        # Defensive extraction: prefer choices[0].message.content (OpenAI-like)
        content = None
        if isinstance(data, dict):
            try:
                content = data["choices"][0]["message"]["content"]
            except Exception:
                content = None

            # fallback to other possible fields
            if content is None:
                try:
                    content = data["choices"][0].get("text")
                except Exception:
                    content = None

            # final fallback: return the whole JSON string
            if content is None:
                content = json.dumps(data)
        else:
            content = str(data)

        return content

    except requests.RequestException as e:
        logger.exception("OpenRouter request failed")
        raise RuntimeError(f"OpenRouter request failed: {str(e)}")


def chat_page(request):
    return render(request, "chat.html")


@csrf_exempt
def chat_response(request):
    """
    Expects a POST with JSON body: {"message": "<user message>"}
    Returns JSON: {"response": "<ai text>", "structured": {...} (optional if AI returned JSON)}
    """
    if request.method != "POST":
        return JsonResponse({"response": "Please send a POST request"}, status=400)

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"response": "Error: Invalid JSON in request body"}, status=400)

    user_message = payload.get("message", "")
    if not isinstance(user_message, str) or user_message.strip() == "":
        return JsonResponse({"response": "Error: Empty message"}, status=400)

    # Compose the prompt text we want to send (explicit string — easier to reason about)
    prompt_text = (
        "You are an expert project requirements analyst.\n\n"
        "The user has provided the following project requirements:\n\n"
        f"{user_message}\n\n"
        "Analyze the requirements and provide a structured response. "
        " return only JSON object that includes at least these fields: "
        "recommended_tech_stack: a tech stack set may contain frontend, backend, database , deployment,Project Overview,Functional Requirements,Non-Functional Requirements,Recommended Backend Technologies,Recommended Frontend Technologies,Database and Storage Solutions,Real-Time Features and Protocols,Security Considerations,Scalability and Performance Strategies,Deployment and Infrastructure Options etc. it should also contain breif summary why this stack is good and example of websites that are already with the stack .provide such 5 set and their cohesive compatibility strength inside one set  \n"
    )

    try:
        bot_text = call_openrouter(prompt_text)
    except Exception as e:
        logger.exception("Error invoking OpenRouter")
        return JsonResponse({"response": f"Error calling OpenRouter: {str(e)}"}, status=500)

    # Try to parse model output as JSON (models sometimes return JSON text)
    parsed = None
    try:
        parsed = json.loads(bot_text)
    except Exception:
        parsed = None

    response = {"response": bot_text}
    if parsed is not None:
        # include parsed structure for clients that want to read structured fields
        response["structured"] = parsed

    return JsonResponse(response)

