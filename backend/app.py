from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from prompts import get_prompt_for_task, BASE_SYSTEM_PROMPT
from vertexai.generative_models import GenerativeModel, Part
import vertexai

load_dotenv()

class GeminiClient:
    def __init__(self):
        os.environ["GOOGLE_CLOUD_PROJECT"] = os.getenv("GOOGLE_CLOUD_PROJECT")
        os.environ["GOOGLE_CLOUD_LOCATION"] = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        
        vertexai.init()
        self.model = GenerativeModel("gemini-2.0-flash")
    
    def prepare_contents(self, prompt, image_url=None):
        contents = []
        if image_url:
            contents.append(
                Part.from_uri(image_url, mime_type="image/jpeg")
            )
        contents.append(prompt)
        return contents
    
    def generate_content(self, prompt, image_url=None):
        contents = self.prepare_contents(prompt, image_url)
        response = self.model.generate_content(contents)
        return response.text
    
    def stream_generate_content(self, prompt, image_url=None):
        contents = self.prepare_contents(prompt, image_url)
        return self.model.generate_content(
            contents,
            stream=True
        )

class StudentAssistantAPI:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app)
        self.gemini_client = GeminiClient()
        self.setup_routes()
    
    def setup_routes(self):
        self.app.route('/api/chat', methods=['POST'])(self.chat)
        self.app.route('/api/tasks', methods=['GET'])(self.get_tasks)
        self.app.route('/api/health', methods=['GET'])(self.health_check)
    
    def chat(self):
        try:
            data = request.json
            user_prompt = data.get('prompt', '')
            task_type = data.get('task_type', 'general')
            image_url = data.get('image_url', None)
            no_stream = data.get('no_stream', False)
            
            if not user_prompt:
                return jsonify({"error": "No prompt provided"}), 400
            
            if no_stream:
                return self.handle_non_streaming_response(user_prompt, image_url)
            else:
                return self.handle_streaming_response(user_prompt, image_url)
        
        except Exception as e:
            import traceback
            print(f"Error in chat endpoint: {str(e)}")
            print(traceback.format_exc())
            return jsonify({"error": str(e)}), 500
    
    def handle_non_streaming_response(self, prompt, image_url):
        response_text = self.gemini_client.generate_content(prompt, image_url)
        return jsonify({
            "response": response_text,
            "status": "success"
        })
    
    def handle_streaming_response(self, prompt, image_url):
        def generate():
            response = self.gemini_client.stream_generate_content(prompt, image_url)
            
            for chunk in response:
                if chunk.text:
                    yield json.dumps({"chunk": chunk.text}) + "\n"
            
            yield json.dumps({"status": "complete"}) + "\n"
        
        return Response(stream_with_context(generate()), mimetype='application/json')
    
    def get_tasks(self):
        tasks = [
            {"id": "schedule", "name": "Class Schedule Management"},
            {"id": "grades", "name": "Grade Tracking"},
            {"id": "exams", "name": "Exam Management"},
            {"id": "todo", "name": "To-Do Lists"},
            {"id": "study_tips", "name": "Study Tips & Resources"}
        ]
        return jsonify(tasks)
    
    def health_check(self):
        return jsonify({"status": "healthy"})
    
    def run(self, debug=True, host="0.0.0.0", port=None):
        if port is None:
            port = int(os.environ.get("PORT", 5000))
        self.app.run(debug=debug, host=host, port=port)

def run_examples():
    gemini_client = GeminiClient()
    
    prompt = "What are three effective study techniques for college students?"
    print(f"Example 1: Text prompt - '{prompt}'")
    print("Response (streaming):")
    
    response = gemini_client.stream_generate_content(prompt)
    for chunk in response:
        if chunk.text:
            print(chunk.text, end="", flush=True)
    print("\n")

    image_url = "https://resources.finalsite.net/images/t_image_size_4/v1652735761/stisdnet/kot5laxql9jqocbyrurs/2021-20222NDSemesterFinalExamSchedule.png"
    image_prompt = "What is shown in this image?"
    
    print(f"Example 2: Image prompt - '{image_prompt}'")
    print("Response (streaming):")
    
    response = gemini_client.stream_generate_content(image_prompt, image_url)
    for chunk in response:
        if chunk.text:
            print(chunk.text, end="", flush=True)
    print("\n")
    
    prompt = "Give me a quick 3-day study plan for finals"
    print(f"Example 3: Text prompt with non-streaming response - '{prompt}'")
    
    response_text = gemini_client.generate_content(prompt)
    print(f"Response:\n{response_text}")

if __name__ == "__main__":
    run_examples()
    
    api = StudentAssistantAPI()
    api.run()