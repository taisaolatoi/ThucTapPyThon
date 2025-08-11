import os
import hashlib
from flask import Blueprint, request, jsonify, send_file
import openai

# Create a Blueprint instance
tts_bp = Blueprint('tts_bp', __name__)

# Load your OpenAI API key from environment variables
# IMPORTANT: Never hardcode your API key in a public repository.
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY environment variable not set")
else:
    # Set the API key
    openai.api_key = os.getenv("OPENAI_API_KEY")

# A temporary directory to store generated audio files
AUDIO_OUTPUT_DIR = "generated_audio"
os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)

@tts_bp.route('/generate', methods=['POST'])
def generate_speech():
    """
    Handles the request to generate speech from text using OpenAI's TTS API.
    It receives text input, generates an audio file, and sends it back.
    """
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"error": "Missing 'text' in request body."}), 400

        input_text = data['text']
        voice_name = data.get('voice', 'alloy')
        model_name = data.get('model', 'tts-1')

        # Generate a unique filename for the audio file
        file_hash = hashlib.sha256(input_text.encode('utf-8')).hexdigest()[:10]
        audio_filename = f"speech_{file_hash}.mp3"
        audio_path = os.path.join(AUDIO_OUTPUT_DIR, audio_filename)

        # Call OpenAI's TTS API
        response = openai.audio.speech.create(
            model=model_name,
            voice=voice_name,
            input=input_text
        )

        # Write the audio content to a local file
        response.stream_to_file(audio_path)

        # Send the generated audio file back to the client
        return send_file(audio_path, mimetype="audio/mpeg", as_attachment=False)

    except openai.APIError as e:
        # Handle API-specific errors more robustly
        print(f"OpenAI API Error: {e}")
        # Check if the error object has the 'response' attribute
        if hasattr(e, 'response') and hasattr(e.response, 'json'):
            error_data = e.response.json()
            error_message = error_data.get('error', {}).get('message', 'An unknown error occurred with the OpenAI API.')
            status_code = e.response.status_code
        else:
            # Fallback for errors like RateLimitError
            error_message = str(e)
            status_code = 500 # Default to 500 if no status code is available

        return jsonify({"error": f"OpenAI API Error: {error_message}"}), status_code

    except Exception as e:
        # Handle other unexpected errors
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": "An unexpected server error occurred."}), 500
