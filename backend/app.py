from flask import Flask, request, jsonify, Response, stream_with_context, send_file
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from prompts import get_prompt_for_task, BASE_SYSTEM_PROMPT
from vertexai.generative_models import GenerativeModel, Part
import vertexai
import firebase_admin
from firebase_admin import credentials, firestore
import tempfile

load_dotenv()

class FirebaseClient:
    def __init__(self):
        firebase_credentials = json.loads(os.getenv("FIREBASE_CREDENTIALS"))
        cred = credentials.Certificate(firebase_credentials)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        self.db = firestore.client()
    
    def save_user(self, email, name):
        user_ref = self.db.collection("user-data").document(email)
        user_ref.set({
            "name": name
        })
        return {"success": True, "message": f"User {name} saved with email {email}"}
    
    def add_semester(self, email, semester_num, term_name):
        user_ref = self.db.collection("user-data").document(email)
        semester_key = f"semester_{semester_num}"
        user_ref.update({
            semester_key: {
                "term": term_name,
                "courses": []
            }
        })
        return {"success": True, "message": f"Semester {semester_num} added for {email}"}
    
    def add_courses(self, email, semester_num, courses):
        user_ref = self.db.collection("user-data").document(email)
        semester_key = f"semester_{semester_num}"
        
        user_data = user_ref.get().to_dict()
        if not user_data or semester_key not in user_data:
            return {"success": False, "message": f"Semester {semester_num} not found for {email}"}
        
        user_ref.update({
            f"{semester_key}.courses": courses
        })
        return {"success": True, "message": f"Courses added to semester {semester_num} for {email}"}
    
    def fetch_data(self, email):
        user_ref = self.db.collection("user-data").document(email)
        user_data = user_ref.get().to_dict()
        
        if not user_data:
            return None
        
        result = {
            "email": email,
            "name": user_data.get("name", "")
        }
        
        for key, value in user_data.items():
            if key.startswith("semester_"):
                result[key] = value
        
        return result
    
    def save_data_to_file(self, email):
        data = self.fetch_data(email)
        if data:
            with open('student_data.json', 'w') as f:
                json.dump(data, f, indent=2)
            return {"success": True, "message": "Data saved to student_data.json"}
        return {"success": False, "message": f"No data found for {email}"}

class StudentDataManager:
    def __init__(self):
        self.firebase_client = FirebaseClient()
    
    def create_user(self, email, name):
        return self.firebase_client.save_user(email, name)
    
    def create_semester(self, email, semester_num, term_name):
        return self.firebase_client.add_semester(email, semester_num, term_name)
    
    def add_courses_to_semester(self, email, semester_num, courses):
        return self.firebase_client.add_courses(email, semester_num, courses)
    
    def get_user_data(self, email):
        return self.firebase_client.fetch_data(email)
    
    def sync_data_to_file(self, email):
        return self.firebase_client.save_data_to_file(email)
    
    def get_student_data_from_file(self):
        try:
            with open('student_data.json', 'r') as file:
                data = json.load(file)
            return data
        except FileNotFoundError:
            return {"error": "Student data file not found"}
        except json.JSONDecodeError:
            return {"error": "Invalid JSON in student data file"}
        except Exception as e:
            return {"error": f"Error reading student data: {str(e)}"}
    
    def save_syllabus_data(self, syllabus_data):
        try:
            try:
                with open('student_data.json', 'r') as file:
                    student_data = json.load(file)
            except (FileNotFoundError, json.JSONDecodeError):
                return {"error": "Could not read student data file"}
            
            semesters = [k for k in student_data.keys() if k.startswith('semester_')]
            if not semesters:
                return {"error": "No semesters found in student data"}
            
            semester_key = semesters[0]
            
            course_info = {
                "course_name": syllabus_data.get('course_name', 'Unknown Course'),
                "instructor_name": syllabus_data.get('instructor_name', 'Unknown Instructor'),
                "start_time": syllabus_data.get('start_time', ''),
                "end_time": syllabus_data.get('end_time', ''),
                "grade": "",
                "current_marks": {},
                "marks_distribution": syllabus_data.get('marks_distribution', {}),
                "schedule": syllabus_data.get('schedule', [])
            }
            
            course_exists = False
            for i, course in enumerate(student_data[semester_key]['courses']):
                if course['course_name'] == course_info['course_name']:
                    student_data[semester_key]['courses'][i] = course_info
                    course_exists = True
                    break
            
            if not course_exists:
                student_data[semester_key]['courses'].append(course_info)
            
            with open('student_data.json', 'w') as file:
                json.dump(student_data, file, indent=2)
            
            return {"success": True, "message": "Course information saved successfully"}
        except Exception as e:
            import traceback
            print(f"Error saving syllabus data: {str(e)}")
            print(traceback.format_exc())
            return {"error": str(e)}

class GeminiClient:
    def __init__(self):
        os.environ["GOOGLE_CLOUD_PROJECT"] = os.getenv("GOOGLE_CLOUD_PROJECT")
        os.environ["GOOGLE_CLOUD_LOCATION"] = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        
        vertexai.init()
        self.model = GenerativeModel("gemini-2.0-flash")
    
    def prepare_contents(self, prompt, file_uri=None):
        contents = []
        if file_uri:
            if file_uri.lower().endswith(('.png', '.jpg', '.jpeg')):
                if file_uri.startswith(('http://', 'https://', 'gs://')):
                    contents.append(Part.from_uri(file_uri, mime_type='image/jpeg'))
                else:
                    with open(file_uri, "rb") as f:
                        contents.append(Part.from_data(f.read(), mime_type='image/jpeg'))
            elif file_uri.lower().endswith('.pdf'):
                if file_uri.startswith(('http://', 'https://', 'gs://')):
                    contents.append(Part.from_uri(file_uri, mime_type='application/pdf'))
                else:
                    with open(file_uri, "rb") as f:
                        contents.append(Part.from_data(f.read(), mime_type='application/pdf'))
            else:
                raise ValueError(f"Unsupported file type: {file_uri}")
        
        contents.append(prompt)
        return contents
    
    def generate_content(self, prompt, file_uri=None):
        contents = self.prepare_contents(prompt, file_uri)
        response = self.model.generate_content(contents)
        return response.text
    
    def stream_generate_content(self, prompt, file_uri=None):
        contents = self.prepare_contents(prompt, file_uri)
        return self.model.generate_content(contents, stream=True)
    
    def generate_syllabus_analysis(self, pdf_uri):
        prompt = """For context: Class hours is the start_time and end_time of classes. Analyze the syllabus PDF and return structured data in this exact JSON format:
                {
                  "course_name": string,
                  "instructor_name": string,
                  "start_time": "HH:MM XM",
                  "end_time": "HH:MM XM",
                  "schedule": [{
                    "date": "YYYY-MM-DD",
                    "type": "class|assignment|quiz|exam|project|other",
                    "title": string,
                    "description": string
                  }],
                  "marks_distribution": {
                    "assignment": percentage,
                    "quiz": percentage,
                    "exam": percentage,
                    "project": percentage
                  }
                }
                Your response must be valid JSON only, with no additional text, markdown formatting, or code blocks."""
        
        contents = self.prepare_contents(prompt, file_uri=pdf_uri)
        response = self.model.generate_content(contents)
        
        response_text = response.text.strip()
        
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        response_text = response_text.strip()
        
        return json.loads(response_text)

class StudentAssistantAPI:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app)
        self.gemini_client = GeminiClient()
        self.student_data_manager = StudentDataManager()
        self.setup_routes()
    
    def setup_routes(self):
        self.app.route('/api/chat', methods=['POST'])(self.chat)
        self.app.route('/api/tasks', methods=['GET'])(self.get_tasks)
        self.app.route('/api/health', methods=['GET'])(self.health_check)
        self.app.route('/api/fetch_data', methods=['GET'])(self.fetch_data)
        self.app.route('/api/get_student_data', methods=['GET'])(self.get_student_data)
        self.app.route('/api/save_user', methods=['POST'])(self.save_user)
        self.app.route('/api/add_semester', methods=['POST'])(self.add_semester)
        self.app.route('/api/add_courses', methods=['POST'])(self.add_courses)
        self.app.route('/api/sync_data', methods=['POST'])(self.sync_data)
        self.app.route('/api/save_syllabus_data', methods=['POST'])(self.save_syllabus_data)
    
    def chat(self):
        try:
            data = request.form.to_dict() if request.files else request.json
            user_prompt = data.get('prompt', '')
            task_type = data.get('task_type', 'general')
            image_url = data.get('image_url', None)
            no_stream = data.get('no_stream', False)
            action = data.get('action', 'chat')
            
            if action == 'analyze_syllabus' and request.files and 'file' in request.files:
                return self.handle_syllabus_analysis(request.files['file'])
            
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
    
    def handle_syllabus_analysis(self, file):
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "File must be a PDF"}), 400
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp:
            file.save(temp.name)
            temp_path = temp.name
        
        try:
            analysis = self.gemini_client.generate_syllabus_analysis(temp_path)
            os.unlink(temp_path)
            return jsonify(analysis)
        except Exception as e:
            os.unlink(temp_path)
            raise e
    
    def handle_non_streaming_response(self, prompt, image_url):
        response_text = self.gemini_client.generate_content(prompt, file_uri=image_url)
        return jsonify({
            "response": response_text,
            "status": "success"
        })
    
    def handle_streaming_response(self, prompt, image_url):
        def generate():
            response = self.gemini_client.stream_generate_content(prompt, file_uri=image_url)
            
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
    
    def fetch_data(self):
        try:
            email = request.args.get('email')
            if email:
                data = self.student_data_manager.get_user_data(email)
                if data:
                    return jsonify(data)
                return jsonify({"error": f"No data found for {email}"}), 404
            
            return jsonify(self.student_data_manager.get_student_data_from_file())
        except Exception as e:
            import traceback
            print(f"Error fetching data: {str(e)}")
            print(traceback.format_exc())
            return jsonify({"error": str(e)}), 500
    
    def get_student_data(self):
        try:
            data = self.student_data_manager.get_student_data_from_file()
            return jsonify(data)
        except Exception as e:
            import traceback
            print(f"Error getting student data: {str(e)}")
            print(traceback.format_exc())
            return jsonify({"error": str(e)}), 500
    
    def save_user(self):
        try:
            data = request.json
            email = data.get('email')
            name = data.get('name')
            
            if not email or not name:
                return jsonify({"error": "Email and name are required"}), 400
            
            result = self.student_data_manager.create_user(email, name)
            return jsonify(result)
        except Exception as e:
            import traceback
            print(f"Error saving user: {str(e)}")
            print(traceback.format_exc())
            return jsonify({"error": str(e)}), 500
    
    def add_semester(self):
        try:
            data = request.json
            email = data.get('email')
            semester_num = data.get('semester_num')
            term_name = data.get('term_name')
            
            if not email or not semester_num or not term_name:
                return jsonify({"error": "Email, semester_num, and term_name are required"}), 400
            
            result = self.student_data_manager.create_semester(email, semester_num, term_name)
            return jsonify(result)
        except Exception as e:
            import traceback
            print(f"Error adding semester: {str(e)}")
            print(traceback.format_exc())
            return jsonify({"error": str(e)}), 500
    
    def add_courses(self):
        try:
            data = request.json
            email = data.get('email')
            semester_num = data.get('semester_num')
            courses = data.get('courses')
            
            if not email or not semester_num or not courses:
                return jsonify({"error": "Email, semester_num, and courses are required"}), 400
            
            result = self.student_data_manager.add_courses_to_semester(email, semester_num, courses)
            return jsonify(result)
        except Exception as e:
            import traceback
            print(f"Error adding courses: {str(e)}")
            print(traceback.format_exc())
            return jsonify({"error": str(e)}), 500
    
    def sync_data(self):
        try:
            data = request.json
            email = data.get('email')
            
            if not email:
                return jsonify({"error": "Email is required"}), 400
            
            result = self.student_data_manager.sync_data_to_file(email)
            return jsonify(result)
        except Exception as e:
            import traceback
            print(f"Error syncing data: {str(e)}")
            print(traceback.format_exc())
            return jsonify({"error": str(e)}), 500
    
    def save_syllabus_data(self):
        try:
            data = request.json
            syllabus_data = data.get('data')
            
            if not syllabus_data:
                return jsonify({"error": "No data provided"}), 400
            
            result = self.student_data_manager.save_syllabus_data(syllabus_data)
            return jsonify(result)
            
        except Exception as e:
            import traceback
            print(f"Error saving syllabus data: {str(e)}")
            print(traceback.format_exc())
            return jsonify({"error": str(e)}), 500
    
    def run(self, debug=True, host="0.0.0.0", port=None):
        if port is None:
            port = int(os.environ.get("PORT", 5000))
        self.app.run(debug=debug, host=host, port=port)

def run_examples():
    gemini_client = GeminiClient()

    # prompt = "What are three effective study techniques for college students?"
    # print(f"Example 1: Text prompt - '{prompt}'")
    # print("Response (streaming):")
    
    # response = gemini_client.stream_generate_content(prompt)
    # for chunk in response:
    #     if chunk.text:
    #         print(chunk.text, end="", flush=True)
    # print("\n")

    # image_url = "https://resources.finalsite.net/images/t_image_size_4/v1652735761/stisdnet/kot5laxql9jqocbyrurs/2021-20222NDSemesterFinalExamSchedule.png"
    # image_prompt = "What is shown in this image?"
    
    # print(f"Example 2: Image prompt - '{image_prompt}'")
    # print("Response (streaming):")
    
    # response = gemini_client.stream_generate_content(image_prompt, image_url)
    # for chunk in response:
    #     if chunk.text:
    #         print(chunk.text, end="", flush=True)
    # print("\n")
    
    # prompt = "Give me a quick 3-day study plan for finals"
    # print(f"Example 3: Text prompt with non-streaming response - '{prompt}'")
    
    # response_text = gemini_client.generate_content(prompt)
    # print(f"Response:\n{response_text}")
    
    # syllabus_files = [
    #     "pdfs/data structure syllabus_Spring 2025_blackboard.pdf",
    #     "pdfs/3350 Spring 25 Syllabus(1).pdf"
    # ]
    
    # print("\nSyllabus Analysis Examples:")
    # for i, pdf_uri in enumerate(syllabus_files, 1):
    #     print(f"\nExample {i+3}: Analyzing {pdf_uri}")
    #     try:
    #         analysis = gemini_client.generate_syllabus_analysis(pdf_uri)
    #         print(f"Analysis Result:\n{json.dumps(analysis, indent=2)}")
    #     except Exception as e:
    #         print(f"Error analyzing syllabus: {str(e)}")

if __name__ == "__main__":
    run_examples()
    
    api = StudentAssistantAPI()
    api.run()