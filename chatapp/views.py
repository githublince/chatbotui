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
OPENROUTER_API_KEY = getattr(settings, 'OPENROUTER_API_KEY', os.getenv('OPENROUTER_API_KEY'))
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free"
FALLBACK_MODEL = "openai/gpt-3.5-turbo"
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
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        logger.debug(f"Sending request to OpenRouter: URL={OPENROUTER_URL}, Model={model}, Headers={headers}, Payload={payload}")
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

            # Fallback to other possible fields
            if content is None:
                try:
                    content = data["choices"][0].get("text")
                except Exception:
                    content = None

            # Final fallback: return the whole JSON string
            if content is None:
                content = json.dumps(data)
        else:
            content = str(data)

        logger.debug(f"OpenRouter response: {content}")
        return content

    except requests.RequestException as e:
        logger.error(f"OpenRouter request failed: {str(e)} - Response: {resp.text if 'resp' in locals() else 'No response'}")
        if resp.status_code == 401 and model != FALLBACK_MODEL:
            logger.info(f"Retrying with fallback model: {FALLBACK_MODEL}")
            return call_openrouter(prompt_text, model=FALLBACK_MODEL, timeout=timeout)
        raise RuntimeError(f"OpenRouter request failed: {str(e)} - Response: {resp.text if 'resp' in locals() else 'No response'}")

def chat_page(request):
    return render(request, "chat.html")

@csrf_exempt
def chat_response(request):
    """
    Expects a POST with JSON body: {"project_type": "<type>", "description": "<description>"}
    Returns JSON: {"response": "<ai text>", "structured": {...} (optional if AI returned JSON)}
    """
    if request.method != "POST":
        return JsonResponse({"response": "Please send a POST request"}, status=400)

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"response": "Error: Invalid JSON in request body"}, status=400)

    project_type = payload.get("project_type", "")
    description = payload.get("description", "")
    if not isinstance(project_type, str) or project_type.strip() == "":
        return JsonResponse({"response": "Error: Project type is required"}, status=400)
    if not isinstance(description, str) or description.strip() == "":
        return JsonResponse({"response": "Error: Project description is required"}, status=400)

    # Compose the prompt text, incorporating project type and description
    prompt_text = (
        "You are an expert project requirements analyst.\n\n"
        "The user has provided the following project requirements:\n\n"
        f"{user_message}\n\n"
        "Analyze the requirements and provide a structured response. "
        "Return only a JSON object that includes at least these fields: "
        "recommended_tech_stack: a tech stack set may contain frontend, backend, database, deployment, "
        "Project Overview, Functional Requirements, Non-Functional Requirements, Recommended Backend Technologies, "
        "Recommended Frontend Technologies, Database and Storage Solutions, Real-Time Features and Protocols, "
        "Security Considerations, Scalability and Performance Strategies, Deployment and Infrastructure Options. "
        "It should also contain a brief summary of why this stack is good and examples of websites that use the stack. "
        "Provide 5 such sets and their cohesive compatibility strength within each set.\n"
        "Return only a JSON object that includes at least these fields: "
        "recommended_tech_stack: a tech stack set may contain frontend, backend, database, deployment, "
        "Project Overview, Functional Requirements, Non-Functional Requirements, Recommended Backend Technologies, "
        "Recommended Frontend Technologies, Database and Storage Solutions, Real-Time Features and Protocols, "
        "Security Considerations, Scalability and Performance Strategies, Deployment and Infrastructure Options. "
        "It should also contain a brief summary of why this stack is good and examples of websites that use the stack. "
        "Provide 5 such sets and their cohesive compatibility strength within each set.\n"
    )

    try:
        bot_text = call_openrouter(prompt_text)
        logger.debug(f"Raw OpenRouter response: {bot_text}")
    except Exception as e:
        logger.exception("Error invoking OpenRouter")
        return JsonResponse({"response": f"Error calling OpenRouter: {str(e)}"}, status=500)

    # Try to parse model output as JSON
    parsed = None
    try:
        parsed = json.loads(bot_text)
        logger.debug(f"Parsed JSON response: {json.dumps(parsed, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse OpenRouter response as JSON: {str(e)}")
        parsed = None

    response = {"response": bot_text}
    if parsed is not None:
        response["structured"] = parsed

    return JsonResponse(response)