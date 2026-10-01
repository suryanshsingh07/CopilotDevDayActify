# Actify Backend

Express + TypeScript API for deadline extraction and cluster detection.

## Setup

```bash
cp .env.example .env
# Add your OpenAI API key to .env
npm install
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `8000` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |
| `AI_API_KEY` | OpenAI API key | *(required)* |
| `AI_MODEL` | OpenAI model name | `gpt-4o-mini` |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/extract` | AI deadline extraction |
| POST | `/api/analyze` | Sort + cluster detection |
