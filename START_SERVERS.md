# 🚀 AVANT Medical System - Server Startup Guide

## Quick Start Options

### 🎯 **Recommended: All-in-One Development Mode**
```bash
./start_dev.sh
```
- Starts both backend and frontend servers
- Automatic dependency checking and installation
- Health checks and status reporting
- Graceful shutdown with Ctrl+C

### 🔧 **Individual Server Startup**

#### Backend Only
```bash
./start_backend.sh
```
- Starts FastAPI server on port 8000
- API Documentation: http://localhost:8000/docs

#### Frontend Only
```bash
./start_frontend.sh
```
- Starts React development server on port 3000
- Application: http://localhost:3000

### 📋 **Manual Startup**

#### Backend Manual
```bash
cd backend
source venv/bin/activate
uvicorn main_clean_english:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Manual
```bash
cd frontend
npm start
```

## 🏗️ **Project Structure**

```
Historias clinicas/
├── 🚀 start_dev.sh          ← All-in-one development startup
├── 🐍 start_backend.sh      ← Backend only
├── ⚛️  start_frontend.sh     ← Frontend only
├── backend/
│   └── 📝 main_clean_english.py  ← Main FastAPI application
├── frontend/
│   └── 📱 React TypeScript app
└── 📋 START_SERVERS.md       ← This guide
```

## 🔗 **Access URLs**
- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **API Redoc**: http://localhost:8000/redoc

## 🛑 **Stopping Servers**
- **Development mode**: Press `Ctrl+C` in the terminal running `start_dev.sh`
- **Individual servers**: Press `Ctrl+C` in their respective terminals
- **Force kill**: Use Activity Monitor or `kill` command with process ID

---
*AVANT Medical System - Clean, organized, and ready for development! 🏥*

