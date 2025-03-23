# Student Assistant AI Backend

A Flask-based backend with Vertex AI integration for a student assistant chatbot that helps with schedules, grades, exams, and tasks.

## Setup Instructions

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set up Google Cloud credentials

Follow the instructions in `get_credentials.md` to set up your Vertex AI credentials. You'll need to:

1. Create a Google Cloud project and enable Vertex AI API
2. Install the sdk and login locally
3. Update your `.env` file with the credentials

### 3. Run the server

```bash
python app.py
```

The server will start at http://localhost:5000

## API Endpoints

### Chat Endpoint

- **URL**: `/api/chat`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "prompt": "Your question or request here",
    "task_type": "schedule|grades|exams|todo|study_tips",
    "image_url": "Optional: URL to an image to analyze"
  }
  ```
- **Response**:
  ```json
  {
    "response": "AI response text",
    "status": "success"
  }
  ```

#### Image Support

The chat endpoint supports multimodal inputs including images. To use an image in your request, include an `image_url` parameter with a publicly accessible URL to the image file. For example:

```json
{
  "prompt": "What information is shown in this final exam schedule?",
  "task_type": "exams",
  "image_url": "https://resources.finalsite.net/images/t_image_size_4/v1652735761/stisdnet/kot5laxql9jqocbyrurs/2021-20222NDSemesterFinalExamSchedule.png"
}
```

Supported image URL types:
- Public HTTP/HTTPS URLs
- Google Cloud Storage URIs (gs://)
- YouTube video URLs (for video analysis)

### Available Tasks Endpoint

- **URL**: `/api/tasks`
- **Method**: `GET`
- **Response**:
  ```json
  [
    {"id": "schedule", "name": "Class Schedule Management"},
    {"id": "grades", "name": "Grade Tracking"},
    {"id": "exams", "name": "Exam Management"},
    {"id": "todo", "name": "To-Do Lists"},
    {"id": "study_tips", "name": "Study Tips & Resources"}
  ]
  ```

### Health Check

- **URL**: `/api/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "healthy"
  }
  ```

## Specialized Task Types

The backend supports specialized prompts for different student tasks:

1. **Class Schedule Management** (`schedule`)
   - Organize class times, locations, instructors
   - Identify scheduling conflicts
   - Plan study time between classes

2. **Grade Tracking** (`grades`)
   - Calculate current grades
   - Track progress toward target grades
   - Identify high-impact assignments

3. **Exam Management** (`exams`)
   - Track exam dates, topics, weights
   - Create study schedules
   - Provide test-taking strategies

4. **To-Do Lists** (`todo`)
   - Break tasks into manageable steps
   - Prioritize by deadline and importance
   - Track completion status

5. **Study Tips & Resources** (`study_tips`)
   - Recommend study techniques
   - Suggest productivity methods
   - Provide subject-specific strategies 