
# JobTrack — Job Application Tracker

JobTrack is a personal job application tracking web application that helps you organize your job search, monitor application progress, manage interviews, and keep track of important job-related information in one place.

## Features

- **Dashboard:** View application statistics and job search progress.
- **Application Management:** Add, view, edit, and delete job applications.
- **Search and Filtering:** Find applications and filter them by relevant criteria.
- **Interview Calendar:** Track scheduled interviews and important dates.
- **Resume Management:** Upload and view resume PDFs.
- **Screenshot Import:** Extract job details from screenshots using AI.
- **AI-Powered Job Description Improvement:** Get assistance improving job descriptions using AI.
- **Local Usage:** Run the application on your own computer.

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose

### AI Integration
- Google Gemini API

## Project Structure

```text
JobTrack/
├── public/
├── src/
│   ├── assets/
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── server/
│   ├── models/
│   │   └── Application.js
│   ├── routes/
│   │   ├── applications.js
│   │   ├── extractJob.js
│   │   └── improveDescription.js
│   ├── .env
│   ├── package.json
│   └── server.js
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

## Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community)
- [Git](https://git-scm.com/) (optional, for version control)

A Google Gemini API key is required for the AI-powered features.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/AbhijithAJ3/JobTrack.git
cd JobTrack
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

### 4. Configure Environment Variables

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/jobtrack
GEMINI_API_KEY=your_gemini_api_key
```

Replace `your_gemini_api_key` with your own Gemini API key.

Use the MongoDB connection string appropriate for your local database configuration.

**Security:** Never commit your `.env` file or expose API keys in frontend code.

### 5. Start the Backend

Open a terminal in the `server/` directory and run:

```bash
npm run dev
```

The backend should run on port `5000`, depending on your configuration.

### 6. Start the Frontend

Open another terminal in the project root and run:

```bash
npm run dev
```

Open the local URL shown in your terminal, usually:

```text
http://localhost:5173
```

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Port used by the backend server |
| `MONGODB_URI` | MongoDB database connection string |
| `GEMINI_API_KEY` | API key used for Gemini AI features |

## Security

- Keep API keys and database credentials private.
- Store secrets in `server/.env`.
- Ensure `.env` files are excluded from Git.
- Never commit `node_modules` folders.
- Do not put private API keys in frontend environment variables.

## Future Improvements

- User authentication and protected accounts
- Cloud deployment
- Application reminders and notifications
- Enhanced analytics and job search insights
- Export application data

## Author

**Abhijith P Anil**

GitHub: [@AbhijithAJ3](https://github.com/AbhijithAJ3)

---

Built to make job searching more organized and manageable.
