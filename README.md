# Backend Candidatures

A robust and secure backend built with **Express.js** and **PostgreSQL** to manage candidature submissions via a REST API. The application includes input validation, basic security, rate limiting, CORS support, and email notifications for submitted candidatures.

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Example Request](#example-request)
- [Testing](#testing)
- [Database Setup](#database-setup)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- **REST API** for submitting and managing candidature data.
- **Input Validation** using Joi with detailed error messages.
- **Database storage** with PostgreSQL using **parameterized queries** (no ORM).
- **Security**
  - Helmet for secure HTTP headers.
  - Rate limiting (200 requests per 15 minutes per IP).
  - CORS with configurable whitelist.
- **Email Notifications** via Nodemailer for candidature confirmation.
- **Standardized Responses**
  - Success: `{ success: true, message, ... }`
  - Validation Error (400): `{ success: false, message: "Validation échouée", details: [...] }`
  - Server Error (500): `{ success: false, message: "Erreur interne. Réessayez plus tard." }`
- **Complex Data Handling**
  - `langues`: PostgreSQL `TEXT[]` for language arrays.
  - `niveaux`: PostgreSQL `JSONB` for language proficiency levels.

---

## Tech Stack

- **Node.js**: Runtime environment  
- **Express.js**: Web framework for API  
- **PostgreSQL**: Database with `pg` (Pool) for connections  
- **Joi**: Input validation  
- **Nodemailer**: Email notifications  
- **dotenv**: Environment variable management  
- **helmet**: Security headers  
- **cors**: Cross-Origin Resource Sharing  
- **express-rate-limit**: Rate limiting for API requests  
- **nodemon** (dev): Auto-restart server during development

---

## Prerequisites

- Node.js (version **≥ 18**)
- PostgreSQL (version **≥ 12**)
- SMTP service (e.g., Gmail with an **App Password** or another SMTP provider)
- A PostgreSQL database instance (local or hosted)

---

## Installation

1) **Clone or Extract**
```bash
git clone <repository-url>
cd backend


Install Dependencies

npm install


Set Up Environment Variables

cp .env.example .env


Then edit .env with your configuration (see Environment Variables).

Set Up PostgreSQL

Create a database (example):

createdb -U <your-postgres-user> candidatures_db


Apply the SQL migration to create the candidatures table:

psql -U <your-postgres-user> -d candidatures_db -f src/sql/001_create_table_candidatures.sql

Environment Variables

This backend supports two ways to configure the DB connection. If DATABASE_URL is defined, it takes precedence. Otherwise it builds the connection from discrete variables and NODE_ENV.

Quick path (single URL)
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/candidatures_db

Advanced path (discrete variables + environment switch)
# Server Configuration
PORT=3000
NODE_ENV=development   # or production

# Database Configuration (production)
DB_HOST=host.docker.internal   # access host from Docker
DB_PORT=5433

# Database Configuration (development)
DB_HOSTLOCAL=localhost
DB_PORTLOCAL=5432

DB_USERNAME=postgres
DB_PASSWORD=admin
DB_NAME=gpe_yale

# If set, DATABASE_URL overrides all discrete DB_* vars:
# DATABASE_URL=postgresql://postgres:admin@localhost:5432/gpe_yale

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:4200,https://your-frontend.com

# SMTP (example: Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false            # 465 => true (SSL/TLS); 587 => false (STARTTLS)
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Admissions <no-reply@example.com>"
EMAIL_BCC=admin@example.com


Notes

NODE_ENV=production ⇒ uses DB_HOST + DB_PORT

Otherwise ⇒ uses DB_HOSTLOCAL + DB_PORTLOCAL

For Gmail, generate an App Password if 2FA is enabled.

On port 587, most providers expect SMTP_SECURE=false (STARTTLS). On 465, set SMTP_SECURE=true.

Running the Application

Development Mode (auto-restart):

npm run dev


Production Mode:

npm start


The server will start on http://localhost:3000 (or the configured PORT).

API Endpoints
POST /api/candidatures

Description: Submit a new candidature.
Body: JSON (camelCase fields; see Example Request
)
Responses:

201 Created

{ "success": true, "message": "Candidature envoyée avec succès.", "id": 1, "dateSoumission": "2025-08-28T09:05:00.000Z" }


400 Bad Request

{ "success": false, "message": "Validation échouée", "details": ["error1", "error2"] }


500 Internal Server Error

{ "success": false, "message": "Erreur interne. Réessayez plus tard." }

GET /api/candidatures/health

Description: Check server health.
Response:

{ "ok": true }

Example Request

Test the POST endpoint with the following curl command:

curl -X POST http://localhost:3000/api/candidatures \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Marie",
    "nationalite": "Française",
    "sexe": "Femme",
    "dateNaissance": "1995-05-20",
    "lieuNaissance": "Lyon",
    "telephone": "+33612345678",
    "email": "marie.dupont@example.com",
    "organisation": "Entreprise XYZ",
    "pays": "France",
    "departement": "Rhône",
    "posteActuel": "Analyste",
    "descriptionTaches": "Analyse de données et reporting",
    "diplome": "Master",
    "institution": "Université Lyon 1",
    "domaine": "Informatique",
    "langues": ["Français", "Anglais"],
    "niveaux": {"Français": "Natif", "Anglais": "Avancé"},
    "resultatsAttendus": "Développer compétences en gestion de projet",
    "autresInfos": "",
    "mode": "Institution",
    "institutionFinancement": "Entreprise XYZ",
    "contactFinancement": "Jean Martin",
    "emailContactFinancement": "jean.martin@xyz.com",
    "source": "Site web",
    "consentement": true
  }'


Expected Response (201):

{
  "success": true,
  "message": "Candidature envoyée avec succès.",
  "id": 1,
  "dateSoumission": "2025-08-28T09:05:00.000Z"
}

Testing

Use curl or tools like Postman/Insomnia to test the API.

Verify the health endpoint:

curl http://localhost:3000/api/candidatures/health


Expected:

{ "ok": true }


Test invalid inputs to ensure validation errors are returned correctly (HTTP 400 with detailed messages).

Check server logs for email sending status or errors.

Database Setup

The candidatures table is created by running the migration script:

CREATE TABLE IF NOT EXISTS candidatures (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  nationalite VARCHAR(50) NOT NULL,
  sexe VARCHAR(10) NOT NULL,
  date_naissance DATE NOT NULL,
  lieu_naissance VARCHAR(50) NOT NULL,
  telephone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NOT NULL,
  organisation VARCHAR(200),
  pays VARCHAR(50) NOT NULL,
  departement VARCHAR(100),
  poste_actuel VARCHAR(100) NOT NULL,
  description_taches VARCHAR(500) NOT NULL,
  diplome VARCHAR(50) NOT NULL,
  institution VARCHAR(200) NOT NULL,
  domaine VARCHAR(100) NOT NULL,
  langues TEXT[] NOT NULL,
  niveaux JSONB NOT NULL,
  resultats_attendus VARCHAR(500) NOT NULL,
  autres_infos VARCHAR(1000),
  mode_financement VARCHAR(20) NOT NULL,
  institution_financement VARCHAR(200),
  contact_financement VARCHAR(100),
  email_contact_financement VARCHAR(150),
  source_information VARCHAR(50) NOT NULL,
  consentement BOOLEAN NOT NULL DEFAULT TRUE,
  date_soumission TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


Table supports:

langues: Array of languages (TEXT[])

niveaux: Language proficiency levels stored as JSONB

Conditional fields (institution_financement, contact_financement, email_contact_financement) required when mode_financement is Institution or Autre

date_naissance validated to ensure the candidate is ≥ 18 years old

Security Considerations

Input Validation: Joi ensures all inputs are sanitized and validated.

Rate Limiting: Prevents abuse with a limit of 200 requests per 15 minutes per IP.

CORS: Only allows requests from configured origins.

Helmet: Adds secure HTTP headers to protect against common vulnerabilities.

SQL Injection: Prevented by using parameterized queries with the pg library.

Troubleshooting

Database Connection Errors

Verify DATABASE_URL (or discrete DB_* vars) in .env.

Ensure PostgreSQL is running and accessible.

If running in Docker, consider DB_HOST=host.docker.internal (Windows/Mac).

Email Sending Issues

Check SMTP configuration in .env.

For Gmail, ensure an App Password is used if 2FA is enabled.

Inspect server logs for Nodemailer errors.

On port 587, set SMTP_SECURE=false for STARTTLS (on 465, set true).

CORS Errors

Ensure the client origin is listed in CORS_ORIGINS.

Validation Errors

Review the details array in 400 responses for specific issues.

Server Errors

Check logs (console.error) for details.

Ensure all dependencies are installed (npm install).

License

This project is licensed under the MIT License.


Tu veux aussi une **version FR intégrale** du README ? Je peux te la générer à l’identique.