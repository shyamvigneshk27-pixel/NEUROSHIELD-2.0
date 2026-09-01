# NeuroShield — AI-Powered EEG Seizure Detection & Risk Analysis

NeuroShield is a full-stack clinical decision-support tool that analyzes EEG (electroencephalogram) data — either as raw signal CSVs or as spectrogram/EEG images — and predicts whether the recording shows signs of an epileptic seizure. It combines classical machine learning (Random Forest), deep learning (CNN and LSTM), and Google's Gemini API to turn raw neural signal data into a risk score, a band-power breakdown, and a plain-language clinical summary that a technician or clinician can act on.

---

## Table of Contents

- [Why this project exists](#why-this-project-exists)
- [What it does](#what-it-does)
- [Who it's for](#who-its-for)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone the repository](#1-clone-the-repository)
  - [2. Backend setup](#2-backend-setup)
  - [3. Frontend setup](#3-frontend-setup)
  - [4. Run the app](#4-run-the-app)
- [Environment variables](#environment-variables)
- [Screenshots](#screenshots)
- [Using the app](#using-the-app)
- [API reference](#api-reference)
- [Machine learning models](#machine-learning-models)
- [Dataset](#dataset)
- [Retraining the models](#retraining-the-models)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Disclaimer](#disclaimer)

---

## Why this project exists

Epilepsy affects tens of millions of people worldwide, and diagnosing seizure activity currently depends on trained specialists manually reading long stretches of EEG traces — a slow, expertise-heavy process that isn't always available in under-resourced clinics. NeuroShield explores whether a lightweight ML pipeline can act as a **triage assistant**: quickly flagging EEG recordings that look seizure-like, surfacing the neural frequency bands driving that classification, and giving a first-pass, human-readable explanation — so a clinician can focus their attention where it matters most.

This is **not** a certified medical device. It's a portfolio/research-grade demonstration of an end-to-end ML product: data → model → inference API → interactive dashboard.

> **v2 upgrade in progress.** The platform is moving to the multi-channel **CHB-MIT** EEG corpus, real JWT auth with Patient / Caregiver / Neurologist / Admin roles, a device-agnostic real-time monitoring gateway, n8n care-coordination workflows, and a mobile app. See [`V2_MASTER_PLAN.md`](./V2_MASTER_PLAN.md) for the full plan. This branch contains the **foundations pass**: JWT auth + SQLite/SQLAlchemy DB + ownership checks, an explicit CORS allowlist, secure file uploads, an `/analyze/edf` EDF pipeline (metadata + preprocessing; multi-channel model not trained yet), and a rebuilt clinical UI on the mandated color system. Spectrogram-image visualizations and user-facing model-accuracy metrics have been removed.

## What it does

- **Accepts two input types:**
  - Raw EEG signal as a `.csv` file (time-series voltage readings)
  - An EEG spectrogram/waveform **image** (`.png`/`.jpg`)
- **Runs inference** using an LSTM (preferred, sequence-aware) or Random Forest model for CSV signals, and a CNN for images.
- **Produces a structured report:**
  - Binary classification: `Seizure` vs `Normal`
  - A calibrated **risk score** (0–100%)
  - Model **confidence**
  - **Band-power breakdown** across the five classical EEG frequency bands (delta, theta, alpha, beta, gamma)
  - Signal statistics (mean, std, min/max, zero-crossings, variance)
- **Generates a clinician-readable AI summary** of the report using Google's Gemini API.
- **Provides a chat assistant** that can explain the current report or define EEG/neurology terminology, with a rule-based fallback if Gemini isn't configured.
- **Dashboard UI** on the mandated clinical color system, with JWT login and role-scoped navigation (Patient / Caregiver / Neurologist / Admin), EEG waveform viewer, risk gauge, band-power charts, patient records, and downloadable reports. Model-performance metrics and spectrogram-image cards have been removed from the product UI.

## Who it's for

- **EEG technicians / clinicians** who want a fast first-pass read on a recording.
- **ML/health-tech students and researchers** studying an end-to-end biosignal classification pipeline.
- **Developers** looking for a reference full-stack (FastAPI + React) ML-serving architecture.

## How it works

```
                 ┌─────────────────────┐
                 │   React Frontend     │
                 │  (Vite + Tailwind)   │
                 │  Upload CSV / Image  │
                 └──────────┬───────────┘
                            │ HTTP (fetch)
                            ▼
                 ┌─────────────────────┐
                 │   FastAPI Backend    │
                 │     backend/main.py  │
                 └──────────┬───────────┘
                            │
             ┌──────────────┼───────────────┐
             ▼               ▼               ▼
     ┌───────────────┐ ┌───────────┐ ┌───────────────┐
     │ LSTM / RF model│ │ CNN model │ │ Gemini API     │
     │ (signal → risk)│ │(image →   │ │ (summary/chat) │
     │                │ │  risk)    │ │                │
     └───────────────┘ └───────────┘ └───────────────┘
```

1. The user uploads a CSV (raw signal, at least 178 data points) or an image (EEG spectrogram) via the React dashboard.
2. FastAPI (`backend/main.py`) receives the file and forwards it to `backend/ml/inference.py`'s `Predictor` class.
3. For CSV signals: the signal is band-pass filtered (`backend/ml/utils/eeg_processing.py`), features are extracted, and either the LSTM (`lstm_model.pth`) or Random Forest (`rf_model.pkl` / `best_rf_model.pkl`) produces a classification and confidence score.
4. For images: the CNN (`cnn_model.pth`) classifies the spectrogram, and OpenCV/Librosa are used to derive band-power estimates and reconstruct a pseudo time-domain signal for visualization.
5. The raw prediction is mapped to a calibrated, clinically-styled **risk score** and returned to the frontend as JSON.
6. The frontend renders the risk gauge, signal/spectrogram viewer, and band-power charts. The user can optionally request an AI-generated summary or chat with the assistant, both powered by Gemini (with a static rule-based fallback when no Gemini key is configured).

## Tech stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/) — REST API server
- [PyTorch](https://pytorch.org/) — CNN and LSTM models
- [scikit-learn](https://scikit-learn.org/) — Random Forest model
- [pandas](https://pandas.pydata.org/) / [NumPy](https://numpy.org/) — data handling
- [OpenCV](https://opencv.org/) (`opencv-python-headless`) — image processing
- [Librosa](https://librosa.org/) — spectrogram signal reconstruction (Griffin-Lim)
- [google-genai](https://pypi.org/project/google-genai/) — Gemini API client for summaries and chat

**Frontend**
- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/) — data visualization (band powers, signal charts)
- [Framer Motion](https://www.framer.com/motion/) — animations
- [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com/) — exporting reports as PDF
- [Lucide React](https://lucide.dev/) — icons

## Project structure

```
midnight-eclipse/
├── backend/
│   ├── main.py                 # FastAPI app: routes for login, analysis, summary, chat, health
│   ├── medical_terms.json      # Glossary used by the chat fallback
│   ├── .env.example            # Template for required environment variables
│   └── ml/
│       ├── inference.py        # Predictor class: loads models, runs CSV/image inference
│       ├── train_best_model.py # Random Forest training script
│       ├── train_csv_model.py  # Alternate CSV model training script
│       ├── train_image_model.py# CNN training script
│       ├── train_lstm_model.py # LSTM training script
│       ├── models/              # Trained weights (*.pkl, *.pth)
│       └── utils/
│           └── eeg_processing.py # Band-pass filtering, band-power computation
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/          # Dashboard, Login, UploadSection, RiskGauge, SignalViewer, etc.
│   │   └── mockData.js
│   ├── index.html
│   └── package.json
├── dataset/                     # Training data (EEG signal CSVs + spectrogram images)
│   ├── seizure/ / non_seizure/  # Per-patient raw signal CSVs
│   ├── images/normal/ / seizure/ # Spectrogram images
│   └── samples/                 # Ready-made CSVs for trying the Upload screen
├── scripts/
│   ├── generate_data.py         # Synthetic EEG data generator
│   ├── reprocess_dataset.py     # Dataset preprocessing utility
│   └── verify_models.py         # Sanity-checks trained models
├── requirements.txt              # Python dependencies (backend + ML)
└── .gitignore
```

> A handful of one-off developer debug/scratch files (`backend/debug_inference.py`, `backend/ml/diagnostic_results*.txt`, `models/debug_output.txt`, etc.) also exist in this repo from earlier development but aren't part of the running application — see the note at the bottom of this file.

## Getting started

### Prerequisites

- **Python** 3.10–3.13
- **Node.js** 18+ and npm
- (Optional) A **Google Gemini API key** — get one at [Google AI Studio](https://aistudio.google.com/apikey). Without it, AI summary/chat features fall back to static/rule-based responses; everything else (upload, model inference, dashboards) still works.

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd midnight-eclipse
```

### 2. Backend setup

```bash
# From the project root
python -m venv .venv

# Activate the virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Set up your environment file:

```bash
cd backend
cp .env.example .env   # on Windows: copy .env.example .env
```

Then open `backend/.env` and set your values. At minimum:

```
GEMINI_API_KEY=your_actual_key_here      # optional (AI summary/chat)
JWT_SECRET_KEY=                           # generate: python -c "import secrets; print(secrets.token_urlsafe(48))"
CORS_ORIGINS=http://localhost:5173        # explicit allowlist; never "*"
```

On first startup the backend creates `backend/neuroshield.db` and (when `SEED_DEMO_USERS=true`) seeds one demo account per role. The console prints the seeded emails and the `DEMO_PASSWORD`.

### 3. Frontend setup

```bash
cd frontend
npm install
```

### 4. Run the app

**Start the backend** (from `backend/`, with the virtual environment active):

```bash
python main.py
# or: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be live at `http://localhost:8000`. Interactive API docs are auto-generated at `http://localhost:8000/docs`.

**Start the frontend** (in a separate terminal, from `frontend/`):

```bash
npm run dev
```

The dashboard will be live at `http://localhost:5173` (default Vite port).

## Environment variables

| Variable         | Location            | Required? | Description                                                                 |
|-------------------|----------------------|-----------|-------------------------------------------------------------------------------|
| `GEMINI_API_KEY`  | `backend/.env`       | Optional  | Enables AI-generated report summaries and the chat assistant. Without it, the app falls back to a static, rule-based responder. |
| `JWT_SECRET_KEY`  | `backend/.env`       | Recommended | Signs session tokens. If unset, a random key is generated per process (dev only — invalidates sessions on restart). **Set explicitly for any shared deployment.** |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `backend/.env` | Optional | Token lifetime in minutes (default `480`). |
| `DATABASE_URL`    | `backend/.env`       | Optional  | SQLAlchemy URL. Defaults to `sqlite:///backend/neuroshield.db`. |
| `CORS_ORIGINS`    | `backend/.env`       | Optional  | Comma-separated exact origins allowed to call the API. Default `http://localhost:5173`. Never `*`. |
| `SEED_DEMO_USERS` / `DEMO_PASSWORD` | `backend/.env` | Optional | When `true` (default), seeds one demo user per role on first run if the DB is empty. Disable for shared deployments. |
| `VITE_API_BASE`   | `frontend/.env.local` | Optional | Backend base URL the frontend calls. Default `http://localhost:8000`. |

**Never commit your real `.env` file.** `.gitignore` excludes `backend/.env`, `frontend/.env*`, `backend/neuroshield.db`, and `backend/uploads/`; only the `.env.example` templates are tracked.

## Screenshots

> The screenshots below show the **v1** interface (dark theme, spectrogram views, model-metrics dashboard). The foundations pass replaces this with a light clinical UI on the `#f1faee / #a8dadc / #457b9d / #1d3557` palette and removes the spectrogram and model-metrics screens; captures will be refreshed.

<table>
<tr>
<td width="50%">

**Upload — Neural Signal Input**
<img src="images/Screenshot 2026-08-23 225333.png" width="380" alt="Upload screen for EEG CSV and spectrogram image" />

</td>
<td width="50%">

**Signal Graphs — EEG waveform + spectral density**
<img src="images/Screenshot 2026-08-23 225351.png" width="380" alt="EEG signal chart and neural spectral density heatmap" />

</td>
</tr>
<tr>
<td width="50%">

**Frequency Analysis — Oscillation band map**
<img src="images/Screenshot 2026-08-23 225407.png" width="380" alt="Delta/theta/alpha/beta/gamma band power breakdown" />

</td>
<td width="50%">

**Model Metrics — accuracy, precision, radar chart**
<img src="images/Screenshot 2026-08-23 225449.png" width="380" alt="Model metrics cards and performance radar chart" />

</td>
</tr>
<tr>
<td width="50%">

**Model Metrics — ROC curves & comparison**
<img src="images/Screenshot 2026-08-23 225522.png" width="380" alt="ROC curves comparing LSTM, Random Forest, and CNN models" />

</td>
<td width="50%">

**Report Summary — downloadable clinical report**
<img src="images/Screenshot 2026-08-23 225535.png" width="380" alt="Clinical EEG analysis report summary with diagnosis and band powers" />

</td>
</tr>
</table>

## Using the app

1. Open the frontend and sign in (or create an account). Demo accounts seeded on first backend run — password is the `DEMO_PASSWORD` printed in the backend console (default `NeuroDemo#2026`):
   - **Patient:** `patient@neuroshield.dev`
   - **Caregiver:** `caregiver@neuroshield.dev` (linked to the demo patient)
   - **Neurologist:** `neurologist@neuroshield.dev` (assigned to the demo patient)
   - **Admin:** `admin@neuroshield.dev`
2. From **Analysis**, upload a CSV with a numeric signal column (at least 178 samples). EDF recordings can be sent to `POST /analyze/edf` (metadata + preprocessing; the multi-channel CHB-MIT model is not trained yet).
3. View the generated report: detected pattern, risk score, band powers, and signal stats.
4. Optionally open **Report Summary** for an AI-generated plain-language write-up, or use the **assistant** to ask about the result.

## API reference

Base URL: `http://localhost:8000`

All endpoints except `/health` and `/auth/*` require an `Authorization: Bearer <token>` header.

| Method | Endpoint         | Auth | Description                                                            |
|--------|-------------------|------|--------------------------------------------------------------------------|
| `POST` | `/auth/register` | –    | Creates a Patient / Caregiver / Neurologist account, returns a JWT.     |
| `POST` | `/auth/login`    | –    | Email + password → JWT (bcrypt-verified against the DB).               |
| `GET`  | `/auth/me`       | ✔    | Returns the current user.                                              |
| `GET`  | `/patients/mine` | ✔    | Patients linked to the caller (self / caregiver / neurologist / admin). |
| `POST` | `/analyze/csv`   | ✔    | CSV signal → LSTM/RF inference. Ownership-checked; stores a record + audit log. |
| `POST` | `/analyze/image` | ✔    | Image → CNN inference. Ownership-checked.                             |
| `POST` | `/analyze/edf`   | ✔    | EDF → metadata + 18-ch montage match + preprocessing + signal-quality. Returns `model_status: "not_available"` (no CHB-MIT model yet). |
| `POST` | `/summarize`     | ✔    | Analysis result JSON → Gemini-generated summary.                      |
| `POST` | `/chat`          | ✔    | User query (+ optional context) → assistant reply.                    |
| `GET`  | `/health`        | –    | Model load status and diagnostics.                                   |

Full interactive documentation (request/response schemas) is available at `/docs` once the backend is running.

## Machine learning models

| Model              | File                     | Input                     | Purpose                                             |
|---------------------|---------------------------|----------------------------|--------------------------------------------------------|
| LSTM (primary)      | `backend/ml/models/lstm_model.pth` | 178-point normalized EEG signal | Sequence-aware seizure classification (preferred when available) |
| Random Forest       | `backend/ml/models/best_rf_model.pkl` / `rf_model.pkl` | Extracted statistical + band-power features | Fallback classifier for CSV signals |
| CNN                 | `backend/ml/models/cnn_model.pth` | 200×200 RGB spectrogram image | Image-based seizure classification |

The `Predictor` class in `backend/ml/inference.py` prefers the LSTM model for CSV input and automatically falls back to Random Forest if the LSTM weights aren't found. All models are loaded once at server startup; check `/health` to confirm they loaded correctly.

## Dataset

The `dataset/` directory contains the data used to train the models:

- `dataset/seizure/` (100 CSVs), `dataset/non_seizure/` (200 CSVs) — per-patient raw EEG signal recordings (`time`, `channel_1` columns)
- `dataset/images/seizure/` (2,300 images), `dataset/images/normal/` (4,600 images) — spectrogram images derived from signal data
- `dataset/samples/` — a handful of ready-made CSVs (`normal_sample.csv`, `seizure_sample.csv`, `real_time_data.csv`, `real_time_eeg.csv`) you can drag straight into the **Upload** screen to try the app without needing your own EEG data

`scripts/generate_data.py` can synthesize additional labeled EEG signal/image pairs for experimentation, and `scripts/reprocess_dataset.py` handles dataset cleanup/regeneration.

## Retraining the models

Training scripts live in `backend/ml/`:

```bash
cd backend/ml
python train_best_model.py    # Random Forest
python train_lstm_model.py    # LSTM
python train_image_model.py   # CNN
```

Use `scripts/verify_models.py` to sanity-check that retrained weights load and produce sane predictions before deploying them.

## Known limitations

- **No CHB-MIT model yet.** `/analyze/edf` completes the full architecture (secure upload → metadata → montage match → preprocessing → signal quality) but returns `model_status: "not_available"` — no risk score is fabricated for EDF recordings until a trained checkpoint (`backend/ml/models/eegnet_chbmit.pt`) is added.
- **CSV/image inference still uses the v1 Bonn-trained models.** Risk scores from those are calibrated/scaled for clinical-style presentation, not raw probabilities — illustrative, not diagnostic.
- **Demo seeding is on by default** (`SEED_DEMO_USERS=true`) with a shared `DEMO_PASSWORD`. Disable both for any shared deployment and register real accounts.
- Patient ↔ caregiver / neurologist links are currently created only by the seed script; a self-service linking flow is planned.
- `AdminView` and the PDF report generator retain some legacy styling and are slated for the next redesign pass.
- This project is a research/demo prototype, not a validated clinical tool (see [Disclaimer](#disclaimer)).

## Troubleshooting

- **`/health` shows a model as "Offline"** — confirm the corresponding file exists under `backend/ml/models/` and that `requirements.txt` dependencies installed cleanly (PyTorch in particular can need a platform-specific install — see [pytorch.org](https://pytorch.org/get-started/locally/) if the default `pip install torch` fails).
- **Gemini features not working** — check that `backend/.env` exists (copied from `.env.example`) and `GEMINI_API_KEY` is set to a real key; the backend logs a warning on startup if it's missing or still the placeholder value.
- **CSV upload fails with "Insufficient data points"** — the signal column needs at least 178 numeric values; this matches the sample length the models were trained on.
- **Frontend can't reach the backend** — confirm the backend is running on port `8000` and that no firewall/proxy is blocking `localhost` requests.

## Disclaimer

NeuroShield is an educational/research project and **is not a certified medical device**. It should not be used for real clinical diagnosis or patient care decisions. Predictions are generated by models trained on limited, partly synthetic datasets and are intended to demonstrate a full-stack ML pipeline, not to provide medical guidance.
