# StudySync 📚

**Live demo: https://studysync-abd.vercel.app** (bring your own free Gemini API key; a sample syllabus is built in)

**StudySync** is a comprehensive student dashboard application that makes it super easy to sync different courses, assignments, and exams into a single unified portal by simply uploading PDF syllabi. Unlike traditional LMS platforms like Canvas and Blackboard that often fail to provide centralized course management (because professors don't maintain them properly), StudySync automatically extracts and organizes all your academic information from syllabus PDFs using AI.

<img width="1603" height="997" alt="image" src="https://github.com/user-attachments/assets/45c48b9e-06a6-4729-853f-64a0b5ad70dd" />

## ✨ Features

- **🤖 AI-Powered PDF Analysis**: Upload syllabus PDFs and automatically extract course information, schedules, assignments, and grade distributions
- **📊 Unified Dashboard**: View all your courses, upcoming deadlines, and class schedules in one place
- **📈 Grade Tracking**: Input your marks and get calculated grades based on course distribution
- **📅 Smart Scheduling**: Navigate through your daily class schedules with an intuitive interface
- **💬 AI Assistant**: Chat with an intelligent assistant for study tips, scheduling help, and academic guidance
- **🔄 Real-time Sync**: Automatically sync course data with Firebase for persistence across devices

## 🌐 Hosted version (Vercel)

The live demo runs from `frontend/` alone:

- **Syllabus analysis and chat** are Next.js route handlers (`app/api/analyze-syllabus`, `app/api/chat`) that call the Gemini API.
- **Bring your own key.** Paste a free key from [Google AI Studio](https://aistudio.google.com/apikey) into the panel on the right. It stays in your browser tab (sessionStorage) and is sent only with your own requests. The server never stores or logs it.
- **Your dashboard is saved in your browser** (localStorage). It starts with a sample student; "Reset dashboard to the sample student" clears it.
- **No syllabus handy?** Use the built-in sample syllabus (`frontend/public/sample-syllabus.pdf`, a made-up course).

Run it locally with `cd frontend && npm install && npm run dev`. No environment variables are needed. The Flask backend below is the original hackathon version (Vertex AI + Firebase) and is not used by the hosted site.

## 🏗️ Architecture

StudySync is built as a full-stack application with:

- **Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **Backend**: Flask Python API with Google Vertex AI integration
- **Database**: Firebase Firestore for user data persistence
- **AI**: Google Gemini 2.0 Flash for PDF analysis and chat functionality

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Google Cloud Account** with Vertex AI API enabled
- **Firebase Project** for data storage

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   Create a `.env` file in the backend directory with:
   ```env
   # Google Cloud Configuration
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   
   # Firebase Configuration (JSON string)
   FIREBASE_CREDENTIALS={"type":"service_account","project_id":"your-project-id",...}
   
   # Optional: Custom port
   PORT=5000
   ```

4. **Set up Google Cloud credentials**:
   - Create a Google Cloud project and enable the Vertex AI API
   - Install the Google Cloud SDK and authenticate:
     ```bash
     gcloud auth login
     gcloud config set project your-project-id
     ```
   - Or set up service account credentials in your environment

5. **Set up Firebase**:
   - Create a Firebase project
   - Generate a service account key (JSON)
   - Add the JSON content to your `.env` file as `FIREBASE_CREDENTIALS`

6. **Run the backend server**:
   ```bash
   python app.py
   ```
   
   The backend API will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the frontend directory:
   ```env
   # API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:5000
   
   # OpenAI Configuration (for chat functionality)
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   
   The frontend will be available at `http://localhost:3000`

## 📖 How to Use StudySync

### 1. Upload Your Syllabus
- Click on the **AI Assistant** panel (right side of the dashboard)
- Click **"Upload Syllabus PDF"**
- Select your course syllabus PDF file
- The AI will automatically extract:
  - Course name and instructor
  - Class times
  - Assignment schedule
  - Exam dates
  - Grade distribution

### 2. Review and Save Course Data
- After PDF analysis, review the extracted information
- Edit any incorrect details in the side panel
- Click **"Save Course Information"** to add it to your dashboard

### 3. Track Your Progress
- Navigate to the **Courses** page to see all your enrolled courses
- Input your assignment and exam scores using the **"Input Marks"** feature
- Get calculated grades based on your course's distribution
- View task completion progress for each course

### 4. Stay Organized
- Use the **Dashboard** to see upcoming deadlines and today's schedule
- Navigate through different days using the date controls
- Chat with the AI assistant for study tips and academic help

### 5. Manage Tasks
- Visit the **Tasks** page to see all assignments and exams
- Mark tasks as complete to track your progress
- Add custom tasks for additional assignments

## 🛠️ API Endpoints

### Backend API (`http://localhost:5000`)

#### Chat & PDF Analysis
- `POST /api/chat` - Chat with AI assistant or analyze PDF files
- `GET /api/tasks` - Get available task types
- `GET /api/health` - Health check

#### Data Management
- `GET /api/get_student_data` - Fetch student course data
- `POST /api/save_syllabus_data` - Save extracted syllabus information
- `POST /api/save_user` - Create new user
- `POST /api/add_semester` - Add semester information
- `POST /api/add_courses` - Add courses to semester

### Frontend API (`http://localhost:3000`)
- `POST /api/chat` - Proxy to OpenAI for general chat (alternative to backend chat)

## 📁 Project Structure

```
StudySync/
├── backend/                 # Flask Python API
│   ├── app.py              # Main Flask application
│   ├── prompts.py          # AI prompts for different tasks
│   ├── requirements.txt    # Python dependencies
│   ├── student_data.json   # Local data storage
│   └── pdfs/               # Sample PDF files
├── frontend/               # Next.js React application
│   ├── app/                # Next.js 13+ app directory
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── api/            # API routes
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   ├── ui/             # Reusable UI components
│   │   ├── dashboard.tsx   # Main dashboard component
│   │   ├── courses-page.tsx# Courses management
│   │   ├── chat-panel.tsx  # AI chat interface
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   └── package.json        # Node.js dependencies
└── README.md               # This file
```

## 🎨 Key Components

### PDF Processing Flow
1. **Upload**: User selects PDF file in chat panel
2. **Analysis**: Backend uses Gemini AI to extract structured data
3. **Review**: User can edit extracted information in a side-by-side view
4. **Save**: Data is stored in Firebase and local JSON file
5. **Sync**: Frontend automatically refreshes to show new course data

### Dashboard Features
- **Upcoming Deadlines**: Shows next 5 assignments/exams across all courses
- **Class Schedule**: Navigate through daily schedules with date controls
- **Progress Tracking**: Visual progress bars for task completion
- **Grade Calculator**: Input marks and get calculated grades

### AI Assistant
- **Contextual Help**: Specialized prompts for different academic tasks
- **PDF Analysis**: Automatic extraction of course information
- **Study Tips**: Personalized recommendations and strategies
- **Streaming Responses**: Real-time chat experience

## 🧪 Development

### Backend Development
```bash
cd backend
python app.py  # Runs in debug mode with auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev    # Runs with hot-reload and Turbopack
```

### Building for Production

#### Backend
```bash
cd backend
pip install gunicorn
gunicorn app:app
```

#### Frontend
```bash
cd frontend
npm run build
npm start
```

## 🔧 Environment Configuration

### Required Environment Variables

#### Backend (.env)
```env
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
FIREBASE_CREDENTIALS={"type":"service_account",...}
PORT=5000
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
OPENAI_API_KEY=your-openai-api-key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Vertex AI** for powerful PDF analysis and chat capabilities
- **Firebase** for reliable data storage and synchronization
- **Next.js & React** for the modern, responsive frontend
- **Tailwind CSS** for beautiful, customizable styling
- **Radix UI** for accessible component primitives

---

**StudySync** - Making academic life organized, one PDF at a time! 🎓✨
