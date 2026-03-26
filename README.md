# KampusLegacy 🚀

**KampusLegacy** is a comprehensive mentorship platform designed to bridge the gap between academic theory and career reality. It connects students with experienced industry mentors to foster growth, guidance, and career development through real-time interaction, structured learning resources, and career-advancement opportunities.

## 🌟 Key Features

### 👤 User Roles & Dashboards
- **Students**: 
  - Dynamic **Home Hub** with upcoming events and fresh job/internship opportunities from connected mentors.
  - **Career Dashboard** featuring a full-width real-time messaging interface with mentors.
  - **AI Career Counselor**: A persistent, Gemini-powered chat companion for instant career guidance, resume advice, and skill-building tips.
- **Mentors**:
  - **Advanced Dashboard** with statistical summaries of mentees, resources, events, and opportunities.
  - **Opportunity Pipeline**: Tools to post jobs and internships, either taking direct applications (with resume uploads) or external links.
  - **Event Management**: Create and manage workshops, seminars, and hackathons with custom banners and registration tracking.

### 🔐 Authentication & Security
- Secure JWT-based authentication with role-based access control.
- Protected routes and middleware for secure data handling.
- Resume/Banner uploads secured via specialized Multer storage.

### 🤝 Mentorship Ecosystem
- **Connection System**: Real-time request/approval flow for building student-mentor relationships.
- **Messaging**: Professional, AJAX-powered chat for direct communication.
- **Resource Sharing**: Mentors can upload specialized learning materials (PDF/Docs) for their mentees.

### 🧠 AI Integration
- Built-in **AI Career Counselor** using Google's `gemini-1.5-flash` model.
- Context-aware responses based on established career counseling best practices.
- Persistent session storage ensures your career discussions are never lost.

## 🛠️ Tech Stack

- **Backend**: Node.js & Express.js
- **Database**: MongoDB with Mongoose ODM
- **AI Engine**: Google Generative AI (Gemini)
- **Frontend**: EJS (Embedded JavaScript Templates)
- **Styling**: Vanilla CSS & Tailwind CSS (Modern, Responsive Design)
- **Auth**: JWT & Cookie-parser
- **Storage**: Local Multer-based file management for resumes and event banners

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd KampusLegacy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the application**:
   ```bash
   npm start
   ```
   The server will run at `http://localhost:3000`.

## 📁 Project Structure

- `models/`: Mongoose schemas (User, Connection, Message, Event, Opportunity, AIChatSession)
- `routes/`: Express route handlers (Auth, Student, Mentor)
- `views/`: EJS templates (Student portal, Mentor portal, Auth)
- `public/`: Static assets (CSS, Uploads, Icons)
- `middleware/`: Auth and role-based guards

---
*Built with ❤️ for KampusLegacy — Empowering the next generation of professionals.*
