---
name: scaffold-auth
description: Build the JWT authentication system for the backend
invocation: user
---

Read CLAUDE.md first so you understand the project structure 
and conventions before doing anything.

## What to build

I need a complete JWT auth system in the backend. Here's 
exactly what I want:

### User Model (backend/auth/models.py)
- id — UUID, primary key
- email — string, unique, required
- hashed_password — string
- created_at — datetime, auto set on creation

### Database setup (backend/auth/database.py)
- SQLAlchemy setup
- Use DATABASE_URL from .env
- Create a get_db dependency function for FastAPI

### Auth routes (backend/auth/routes.py)
POST /api/v1/auth/register
- takes email and password
- checks if email already exists, returns error if so
- hashes the password with bcrypt
- saves user to database
- returns a JWT token

POST /api/v1/auth/login
- takes email and password  
- finds user by email, returns error if not found
- verifies password hash
- returns a JWT token

### Token logic (backend/auth/jwt.py)
- create_access_token function
- verify_token function
- get_current_user FastAPI dependency
- use JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_MINUTES from .env

### Requirements
Add these to backend/requirements.txt if not already there:
- fastapi
- uvicorn
- sqlalchemy
- python-jose[cryptography]
- passlib[bcrypt]
- python-dotenv
- psycopg2-binary

## Rules
- Don't hardcode any secrets, everything from .env
- Passwords never stored plain, always hashed
- Every route returns proper HTTP status codes
- Keep it simple, don't over-engineer it