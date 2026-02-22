# KampusLegacy 🚀

**KampusLegacy** is a comprehensive mentorship platform designed to bridge the gap between academic theory and career reality. It connects students with experienced industry mentors to foster growth, guidance, and career development.

## 🌟 Key Features

### 👤 User Roles
- **Students**: Can explore mentors, send connection requests, and manage their learning journey.
- **Mentors**: Can review student requests, accept mentees, and share industry insights.

### 🔐 Authentication
- Secure JWT-based authentication system.
- Password hashing using `bcryptjs`.
- Role-based access control for student and mentor dashboards.

### 🤝 Connection System
- Real-time connection request flow.
- "Pending," "Accepted," and "Rejected" status management.
- Dynamic dashboards reflecting connection status.

### 💬 Messaging System
- Seamless, AJAX-powered real-time chat between connected students and mentors.
- Message history retrieval and instant delivery simulation via smart polling.

### 📊 Dashboards
- **Student Dashboard**: Quick access to connected mentors, enrolled resources, and trending courses.
- **Mentor Dashboard**: Overview of mentee count, student requests, and active messages.

## 🛠️ Tech Stack

- **Backend**: Node.js & Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: EJS (Embedded JavaScript Templates)
- **Styling**: Tailwind CSS (Mobile-responsive design)
- **Icons**: Google Material Symbols
- **Auth**: JSON Web Tokens (JWT) & Cookies

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
   Create a `.env` file in the root directory and add the following:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   ```

4. **Run the application**:
   ```bash
   npm start
   ```
   The server will run at `http://localhost:3000`.

## 📁 Project Structure

- `models/`: Mongoose schemas (User, Connection, Message)
- `routes/`: Express route handlers (Auth, Student, Mentor, API)
- `views/`: EJS templates for all pages
- `middleware/`: Authentication and role-based guards
- `server.js`: Main application entry point

---
*Built with ❤️ for KampusLegacy.*
