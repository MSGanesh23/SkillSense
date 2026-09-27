# 🚀 SkillSense: AI-Powered Adaptive Learning & Assessment Platform

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Google Gemini API](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

**SkillSense** is a skill-agnostic, AI-powered platform designed to build personalized learning paths, dynamically generate assessments, diagnose knowledge gaps, explain weak concepts, and track mastery progression.

---

## ✨ Features

- 🧠 **AI-Powered Question Generation**: Dynamically generate multiple-choice questions for any sub-topic using Google Gemini API.
- 🎯 **Skill & Domain Agnostic Architecture**: Hierarchical organization supporting any discipline: `Skill` ➔ `Topics` ➔ `Sub-topics` ➔ `Learning Materials`.
- 📝 **Adaptive Assessment Engine**: Real-time randomized assessments with option shuffling and instant automated scoring.
- 🔍 **Knowledge Gap Diagnosis**: Sub-topic level performance grading (Accuracy %, Status: *Proficient / Weak / Critical*, Severity: *Low / Medium / High / Critical*).
- 💡 **AI Weakness Remediation**: Personalized AI explanations targeting specific subtopic misunderstandings.
- 📈 **Mastery Engine & Targeted Retests**: Retake assessments focused strictly on identified weak areas, updating mastery levels (*Novice*, *Learning*, *Proficient*, *Mastered*).
- 🎨 **Modern Dark Glassmorphic Dashboard**: Built with React 19, Vite, React Router v7, and custom Vanilla CSS.
- 🛠️ **Full Admin Controls**: Add/delete skills, manage topics and sub-topics, generate AI questions, and reset question banks.

---

## 🏗️ System Architecture

```text
               ┌─────────────────────────────────────────┐
               │           React 19 Frontend            │
               │   (Dashboard, SkillDetails, Assessment) │
               └────────────────────┬────────────────────┘
                                    │  REST API Calls
                                    ▼
               ┌─────────────────────────────────────────┐
               │           FastAPI Backend Server        │
               └──────┬───────────────────┬──────────────┘
                      │                   │
                      ▼                   ▼
           ┌────────────────────┐   ┌────────────────────┐
           │ MySQL 8.0 Database │   │ Google Gemini API  │
           │  (SQLAlchemy ORM)  │   │  (AI Inference)    │
           └────────────────────┘   └────────────────────┘
```

---

## 📂 Data Model Hierarchy

```text
Skill (e.g., Python Programming)
 └── Topic (e.g., Data Structures)
      └── Sub-topic (e.g., Lists & Tuples)
           ├── Learning Material (URL / Markdown Docs)
           ├── Question Bank (AI-Generated & Manual MCQs)
           │    └── Question Options (Shuffled choices)
           ├── Assessment Performance (SubTopicPerformance)
           └── Mastery Record (Mastery level & score)
```

---

## 🚀 Quick Start & Setup Guide

### 1. Prerequisites

Ensure you have the following installed on your system:
- **Python**: `v3.14+` (or `v3.10+`)
- **Node.js**: `v18+` and **npm**: `v9+`
- **MySQL Server**: `v8.0+`
- **Google Gemini API Key** (or OpenRouter / OpenAI key)

---

### 2. Database Configuration

1. Start your local MySQL service:
   ```bash
   sudo systemctl start mysqld
   ```

2. Log in to MySQL and create the database:
   ```sql
   CREATE DATABASE skill_assessment CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

---

### 3. Backend Setup (FastAPI)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env` and insert your MySQL credentials and API keys:
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   DATABASE_URL=mysql+pymysql://USERNAME:PASSWORD@localhost:3306/skill_assessment
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```

5. Seed initial demo data (Optional):
   ```bash
   PYTHONPATH=. python app/db/seed_data.py
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend API will be live at `http://localhost:8000` with interactive API docs at `http://localhost:8000/docs`.*

---

### 4. Frontend Setup (React + Vite)

1. Open a new terminal tab and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node modules:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will be running at `http://localhost:5173`.*

---

## 📡 REST API Reference

| Section | Method | Endpoint | Description |
|---|---|---|---|
| **Skills** | `GET` | `/skills` | Fetch all available skills |
| | `POST` | `/skills` | Create a new skill |
| | `DELETE` | `/skills/{id}` | Delete a skill and all related data |
| | `DELETE` | `/skills/{id}/questions` | Delete all questions associated with a skill |
| **Topics** | `GET` | `/skills/{id}/topics` | List topics for a skill |
| | `POST` | `/skills/{id}/topics` | Add a topic to a skill |
| **Sub-topics** | `GET` | `/topics/{id}/subtopics` | List sub-topics for a topic |
| | `POST` | `/topics/{id}/subtopics` | Add a sub-topic to a topic |
| **Materials** | `GET` | `/subtopics/{id}/learning-materials` | Get learning resources for a sub-topic |
| | `POST` | `/subtopics/{id}/learning-materials` | Add learning resource to sub-topic |
| **AI Generator**| `POST` | `/subtopics/{id}/questions/generate` | Generate AI multiple-choice questions |
| **Assessments** | `POST` | `/assessments` | Create assessment session |
| | `GET` | `/assessments/{id}` | Get assessment questions |
| | `POST` | `/assessments/{id}/submit` | Submit answers and evaluate score |
| **Diagnosis** | `GET` | `/assessments/{id}/diagnosis` | Get subtopic gap analysis & accuracy |
| **Remediation** | `GET` | `/assessments/{id}/remediation` | Get AI explanations for weak subtopics |
| **Mastery** | `POST` | `/assessments/{id}/retest` | Create focused retest session |
| | `GET` | `/skills/{id}/mastery` | Get skill mastery records & levels |

---

## 🧪 Testing & Verification

Run the comprehensive end-to-end integration test suite covering table creation, skill hierarchy, AI question generation, assessment taking, gap diagnosis, remediation, and retesting:

```bash
cd backend
PYTHONPATH=. python app/db/test_end_to_end.py
```

---

## 📂 Project Structure

```text
SkillSense/
├── backend/
│   ├── app/
│   │   ├── db/              # Database session, models, schemas, and seed data
│   │   ├── routes/          # FastAPI REST endpoints
│   │   ├── services/        # AI generator & remediation services
│   │   └── main.py          # FastAPI application entry point
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── components/      # React UI components (Modals, Cards, Nav)
│   │   ├── pages/           # Dashboard, SkillDetails, Assessment, Results
│   │   ├── services/        # API client requests
│   │   ├── App.jsx          # Router & layout
│   │   └── index.css        # Custom Glassmorphic design system
│   ├── package.json         # Frontend dependencies & scripts
│   └── vite.config.js       # Vite configuration & API proxy
└── docs/                    # Step-by-step architecture & development guides
```

---

## 📄 License

This project is licensed under the MIT License.
