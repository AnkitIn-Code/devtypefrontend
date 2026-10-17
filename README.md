# DevType / CodeType AI

> **A real-time typing-practice & competitive gaming platform powered by Fireworks AI (DeepSeek-V4-Pro-0813)** — type real code, compete in 7 multiplayer modes, climb the ranked duel ladder, and level up your coding speed.

---

## Monorepo Structure

```
devtype/
├── frontend/          React 19 + Vite 8 + Tailwind CSS 4 + Socket.IO-Client
└── backend/           Spring Boot 3.x (Java 21) + PostgreSQL (Neon) + Netty Socket.IO + Fireworks AI
```

---

## ⚙️ Environment Variables & Config Checklist

Before running or deploying the backend, ensure these environment variables are set:

| Variable | Required? | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | Neon PostgreSQL JDBC connection URL | `jdbc:postgresql://ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `DB_USER` | **Yes** | Database username | `neondb_owner` |
| `DB_PASSWORD` | **Yes** | Database password | `your-neon-password` |
| `JWT_SECRET` | **Yes** | Base64-encoded 256-bit secret (min 32 chars) | `$(openssl rand -base64 32)` |
| `FIREWORKS_API_KEY` | **Yes** | Fireworks AI API key for DeepSeek-V4-Pro-0813 | `fw_...` |
| `INITIAL_ADMIN_EMAIL` | Optional | Email promoted to ROLE_ADMIN on startup | `admin@devtype.app` |
| `RESEND_API_KEY` | Optional | Resend API key for transactional emails | `re_...` |
| `EXPOSE_DEV_RESET_TOKEN` | Optional | Set to `false` in production (default `true` in dev) | `false` |
| `CORS_ALLOWED_ORIGINS` | Optional | Allowed CORS origins (comma-separated) | `http://localhost:5173,https://devtype.app` |
| `SOCKETIO_HOST` | Optional | Socket.IO server bind IP (default `0.0.0.0`) | `0.0.0.0` |
| `SOCKETIO_PORT` | Optional | Socket.IO server port (default `9092`) | `9092` |

> 🔒 **Database Isolation Notice**: The automated test suite (`mvn test`) runs against an isolated in-memory H2 database (`src/test/resources/application.yml`) to prevent test pollution of the live Neon database. For production deployments, ensure separate staging and production Neon database branches are configured.

---

## 🖥️ Running Locally

### 1. Frontend Setup

```bash
cd frontend
npm install
npm run dev          # Starts dev server on http://localhost:5173
```

### 2. Backend Setup (Spring Boot 3.x + Java 21)

#### PowerShell (Windows)
```powershell
$env:DATABASE_URL        = "jdbc:postgresql://ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
$env:DB_USER             = "neondb_owner"
$env:DB_PASSWORD         = "your-neon-password"
$env:JWT_SECRET          = "your-base64-secret-at-least-32-chars=="
$env:FIREWORKS_API_KEY   = "your_fireworks_api_key"
$env:CORS_ALLOWED_ORIGINS= "http://localhost:5173"

cd backend
.\mvnw.cmd spring-boot:run
```

#### Bash (Linux / macOS)
```bash
export DATABASE_URL="jdbc:postgresql://ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
export DB_USER="neondb_owner"
export DB_PASSWORD="your-neon-password"
export JWT_SECRET="your-base64-secret-at-least-32-chars=="
export FIREWORKS_API_KEY="your_fireworks_api_key"
export CORS_ALLOWED_ORIGINS="http://localhost:5173"

cd backend
./mvnw spring-boot:run
```

The Spring Boot HTTP server runs on **http://localhost:8080** and the Netty Socket.IO server runs on **http://localhost:9092**.

---

## 📡 API Reference & Documentation

- **Interactive Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON Spec**: `http://localhost:8080/v3/api-docs`
- **AI Endpoints**:
  - `POST /api/ai/chat`: Chat with DeepSeek-V4-Pro-0813
  - `POST /api/ai/generate`: Generate custom typing templates
  - `POST /api/ai/suggest-topic`: Automatic topic extraction
  - `POST /api/ai/improve`, `POST /api/ai/optimize`, `POST /api/ai/simplify`, `POST /api/ai/explain`
