# NeuroShield 2.0 — Master Delivery Plan (CHB‑MIT + n8n + Mobile)

This plan supersedes `UPGRADE_PLAN.md`. It rebuilds NeuroShield around four decisions:

1. **Dataset switch:** Bonn (single‑channel, 178‑sample epochs) → **CHB‑MIT Scalp EEG Corpus** (multi‑channel, 256 Hz, EDF, seizure onset/offset annotations). The model architecture is replaced accordingly.
2. **"Real‑time monitoring" is reframed** — we do not have EEG hardware. We build a **device‑agnostic Real‑Time Monitoring Gateway**: a documented streaming protocol + ingestion endpoint that accepts an EEG stream from *any* source. For the hackathon the source is a **clinical‑grade EDF replay simulator** (CHB‑MIT recordings streamed at true 1× speed). A hardware headset plugs into the same protocol later with zero backend change. This is honest and still demonstrates every downstream feature (live gauge, alert firing, caregiver push).
3. **n8n is the care‑coordination orchestration layer** (mandatory for this hackathon). All outbound communication, escalation, scheduling, and cross‑service glue lives in n8n workflows. The backend only emits webhooks.
4. **Mobile app is in scope** — Expo (React Native) app for Patient + Caregiver roles, consuming the same REST/WebSocket API.

Everything else claimed in the submission PDF is kept and delivered. Section 12 maps every PDF claim to its status.

---

## 1. Target Architecture

```
                         ┌───────────────────────────────┐
   EDF Replay Simulator  │  (future: consumer EEG headset)│
   (CHB-MIT @ 1x speed)  └───────────────┬───────────────┘
            │  WebSocket (WSS) JSON/binary chunks           
            ▼                                               
   ┌──────────────────────────────────────────────┐         
   │  Real-Time Monitoring Gateway  (FastAPI)      │         
   │  /ws/ingest  — session mgmt, sliding window   │         
   │  RealtimeInferenceEngine (EEGNet, CPU)        │         
   │  rolling risk score + smoothing + hysteresis  │         
   └──────┬──────────────────────┬────────────────┘         
          │ risk stream (WSS)    │ threshold crossed →       
          ▼                      ▼ POST webhook              
   ┌─────────────┐        ┌──────────────────────────────┐   
   │ Web + Mobile│        │            n8n               │   
   │ live gauge  │        │  - Alert fan-out + escalation │   
   └─────────────┘        │  - WhatsApp / FCM / Email     │   
                          │  - Weekly report cron         │   
   ┌──────────────────┐   │  - Share-with-doctor          │   
   │  FastAPI REST    │◄──┤  - Diary reminders            │   
   │  auth / patients │   │  - Stream-drop watchdog       │   
   │  diary / history │   └──────────────────────────────┘   
   │  reports / AI    │                                       
   └────────┬─────────┘                                       
            ▼                                                 
   ┌──────────────────┐   ┌──────────────────────────────┐   
   │ SQLite (SQLAlch.)│   │ ml/models: eegnet_chbmit.pth │   
   │ users, patients, │   │ scaler.pkl, metadata.json,   │   
   │ events, diary,   │   │ SHAP background set          │   
   │ alerts, reports  │   └──────────────────────────────┘   
   └──────────────────┘                                       
```

### 1.1 New repo layout

```
neuroshield-2.0/
├── backend/
│   ├── app/
│   │   ├── main.py                 # app factory, router mount, CORS, startup
│   │   ├── core/config.py          # pydantic-settings: DB url, JWT secret, n8n webhook base
│   │   ├── db/
│   │   │   ├── base.py             # SQLAlchemy engine/session
│   │   │   └── models.py           # User, Patient, CaregiverLink, SeizureEvent, DiaryEntry, Alert, Report, MonitorSession
│   │   ├── auth/
│   │   │   ├── jwt.py              # encode/decode, role claim
│   │   │   ├── deps.py             # require_role("neurologist") FastAPI deps
│   │   │   └── routes.py           # POST /auth/login, /auth/register, /auth/me
│   │   ├── api/
│   │   │   ├── analyze.py          # POST /analyze/edf, /analyze/csv (batch)
│   │   │   ├── patients.py         # patients, linking, seizure history timeline
│   │   │   ├── diary.py            # symptom diary CRUD
│   │   │   ├── reports.py          # GET /reports/{id}.pdf  (reportlab)
│   │   │   ├── alerts.py           # POST /alerts/ack, GET /alerts  (n8n reads/writes)
│   │   │   ├── assistant.py        # /assistant/summarize, /assistant/chat  (multilingual + offline)
│   │   │   └── stream.py           # WS /ws/ingest  (gateway) + WS /ws/risk/{session} (clients)
│   │   ├── ml/
│   │   │   ├── eegnet.py           # model definition
│   │   │   ├── preprocess.py       # MNE: EDF → montage → filter → epoch tensor
│   │   │   ├── realtime.py         # RealtimeInferenceEngine: ring buffer, windowing, smoothing
│   │   │   ├── explain.py          # SHAP DeepExplainer / channel-band importance
│   │   │   └── models/             # checkpoints + metadata (git-lfs or release asset)
│   │   ├── gateway/
│   │   │   ├── protocol.py         # chunk schema, session handshake
│   │   │   └── replay.py           # EDF → real-time WSS streamer (the "device")
│   │   └── notify/
│   │       └── n8n.py              # thin: POST event JSON to n8n webhook URLs
│   ├── training/
│   │   ├── download_chbmit.py      # PhysioNet wget/rsync a subset
│   │   ├── build_dataset.py        # windowing, labels from .seizures, patient-wise split
│   │   ├── train_eegnet.py         # Colab/Kaggle GPU; exports CPU checkpoint
│   │   └── evaluate.py             # sensitivity, specificity, AUROC, FA/h, detection latency
│   ├── tests/
│   └── requirements.txt
├── frontend/                        # existing React app — add roles + live view
│   └── src/
│       ├── roles/PatientView.jsx  CaregiverView.jsx  NeurologistView.jsx
│       ├── components/LiveMonitor.jsx  RiskGauge.jsx (reuse)  SeizureTimeline.jsx
│       │              SymptomDiary.jsx  ShapPanel.jsx  ChannelBandGrid.jsx
│       └── lib/api.js  ws.js  auth.js  i18n.js
├── mobile/                          # NEW — Expo (React Native)
│   ├── app/  (expo-router): login, patient/index, patient/diary, patient/history,
│   │         caregiver/index, caregiver/alert/[id]
│   ├── lib/  api.ts  ws.ts  auth.ts  push.ts  offlineCache.ts
│   └── app.json  eas.json
├── n8n/
│   ├── workflows/                   # exported JSON, version-controlled
│   │   ├── 01_seizure_alert_fanout.json
│   │   ├── 02_alert_escalation.json
│   │   ├── 03_weekly_trend_report.json
│   │   ├── 04_share_with_doctor.json
│   │   ├── 05_diary_reminder.json
│   │   └── 06_stream_drop_watchdog.json
│   ├── docker-compose.yml
│   └── README.md                    # env vars, credential setup, import steps
└── docs/
    ├── STREAMING_PROTOCOL.md
    ├── MODEL_CARD.md                # honest CHB-MIT metrics
    └── DEMO_SCRIPT.md
```

### 1.2 Data / DB model (SQLite via SQLAlchemy)

| Table | Key fields |
|---|---|
| `users` | id, email, pw_hash, role (`patient`/`caregiver`/`neurologist`), name, locale (`en`/`ta`/`hi`) |
| `patients` | id, user_id, dob, notes, assigned_neurologist_id |
| `caregiver_links` | caregiver_user_id, patient_id, relation, is_primary |
| `monitor_sessions` | id, patient_id, source (`replay`/`device`), started_at, ended_at, edf_ref |
| `risk_samples` | session_id, ts, risk, label, window_start (down-sampled, for trend graphs) |
| `seizure_events` | id, patient_id, session_id, onset_ts, offset_ts, peak_risk, detected_by (`model`/`manual`), confirmed_by_neuro (bool) |
| `diary_entries` | id, patient_id, ts, mood, sleep_hrs, missed_meds (bool), aura (bool), notes |
| `alerts` | id, patient_id, session_id, event_id, level (1/2), risk, created_at, acked_at, acked_by, channels_sent (json) |
| `reports` | id, patient_id, created_at, kind (`session`/`weekly`), pdf_path, payload_json |

---

## 2. ML Workstream — CHB‑MIT + EEGNet (owner: Shyam, ML Lead)

### 2.1 Dataset acquisition
- CHB‑MIT is open‑access on PhysioNet — no credentialing. `training/download_chbmit.py` pulls a **subset** first: patients `chb01, chb03, chb05, chb08, chb10, chb18, chb20, chb24` (mix of frequent/infrequent seizures, good channel consistency). ~5–10 GB. Full corpus later.
- Each patient folder: multiple `.edf` files (23 channels, 256 Hz) + `chbXX-summary.txt` with seizure start/end seconds per file; some patients also have `.edf.seizures` annotation files.
- TUH EEG Corpus: register Day 1 (email + academic‑use statement, has a lag). It stays a **post‑hackathon validation set** — not a blocker, exactly as the PDF scopes it.

### 2.2 Preprocessing (`preprocess.py`, uses `mne`)
1. Load EDF, standardize to a fixed **18‑channel bipolar montage** present across all CHB‑MIT patients (drop the inconsistent/duplicate channels; document the montage in `MODEL_CARD.md`). The PDF's "19‑channel" language becomes "18‑channel standard bipolar montage" — update the pitch.
2. Resample to 256 Hz (already), bandpass 0.5–40 Hz, 60 Hz notch.
3. Window: **4 s windows, 2 s stride** (1024 samples/window/channel). Label a window `seizure` if it overlaps an annotated ictal interval by ≥ 50%.
4. Per‑channel z‑score using training‑set statistics (persist `scaler.pkl`).
5. **Patient‑wise split** — held‑out patients for test (e.g. train on 6, validate on 1, test on 1, rotate). Never split windows from the same recording across train/test (prevents leakage — this is the #1 way CHB‑MIT results get inflated).
6. Class imbalance: seizures are < 1% of windows. Use balanced batch sampling (or 3–5× non‑seizure:seizure) + `pos_weight` in the loss. Keep the test set at natural prevalence so metrics are honest.

### 2.3 Model (`eegnet.py`)
- **EEGNet‑8,2** compact CNN: temporal conv → depthwise spatial conv (per‑channel) → separable conv → dense. Input `(1, 18, 1024)`. ~3–5k params, trains fast, runs on CPU in a few ms/window — consistent with the "no‑GPU" claim (GPU only for training).
- Alternatives kept behind a flag: 1D‑CNN + BiLSTM on multichannel, and a small CNN on per‑window multitaper spectrograms. Pick the best on held‑out‑patient AUROC.
- Train on Colab/Kaggle free GPU (`train_eegnet.py`), export a `map_location='cpu'` checkpoint + `metadata.json` (montage, fs, window, classes, train metrics).

### 2.4 Evaluation (`evaluate.py`) — report these, not "98.4%"
- Window‑level: **AUROC, sensitivity, specificity, precision** at the operating threshold.
- Event‑level: **event sensitivity** (fraction of annotated seizures with ≥1 detected window in onset±30 s), **false alarms per hour (FA/h)**, **median detection latency** from onset.
- Realistic hackathon targets on held‑out patients: AUROC ≥ 0.93, event sensitivity ≥ 85%, FA/h ≤ 2, latency ≤ 15 s. Publish whatever you actually get in `MODEL_CARD.md` — a defensible honest number beats an inflated one in judging.
- Keep the **Bonn 1D‑CNN+LSTM 98.4%** result as "v1 published single‑channel foundation"; CHB‑MIT is "v2 multi‑channel clinical validation" with its own metrics. Both stated side by side.

### 2.5 Real‑time inference engine (`realtime.py`)
- Per session: ring buffer of the last N seconds/channel. Every `stride` seconds, form the latest 4 s window → preprocess with persisted scaler → EEGNet → prob.
- **Smoothing + hysteresis:** exponential moving average of prob; raise `ALERT` when EMA crosses `enter=0.70` for ≥2 consecutive windows; clear when EMA < `exit=0.45`. This is what suppresses false‑alarm chatter to n8n.
- Emits `{ts, risk_0_100, label, ema, band_power_by_channel}` on `/ws/risk/{session}` and, on the ALERT edge only, calls `notify/n8n.py`.

### 2.6 Explainability (`explain.py`)
- SHAP `DeepExplainer` on EEGNet with a fixed background set (200 non‑seizure windows) → aggregate |SHAP| to **per‑channel** and **per‑band** importance for the current window. Cache background tensors; compute on demand from the neurologist view (not per stream tick).
- Fallback if SHAP is too slow on CPU: gradient×input or occlusion over channels — same JSON shape (`{channel: score, band: score}`) so the frontend doesn't care which produced it.

---

## 3. Real‑Time Monitoring Gateway (owner: Dilip, Backend Lead)

### 3.1 Streaming protocol (`docs/STREAMING_PROTOCOL.md`, `gateway/protocol.py`)
- **Handshake:** client opens `WSS /ws/ingest?token=<JWT>`; first message is JSON:
  `{"type":"hello","patient_id":123,"source":"replay","fs":256,"channels":["FP1-F7",...],"montage":"chb-bipolar-18"}`
  → server creates a `monitor_sessions` row, replies `{"type":"ready","session_id":"..."}`.
- **Data frames:** either JSON `{"type":"chunk","seq":n,"t0":<epoch_ms>,"data":[[c0 samples...],[c1...]]}` (~0.5 s per chunk) or, for efficiency, binary `float32` little‑endian `[n_channels × n_samples]` framed after a JSON `chunk-meta`. Support JSON first; binary is an optimization.
- **Server → client:** `{"type":"risk","ts":...,"risk":0-100,"label":"seizure|normal","ema":0.x}` and `{"type":"event","kind":"alert_raised|alert_cleared","event_id":...}`.
- **Robustness:** sequence gap detection, 10 s heartbeat, auto‑close + `monitor_sessions.ended_at` on disconnect. A dropped stream during an active session triggers n8n workflow 06.

### 3.2 EDF replay simulator (`gateway/replay.py`) — "the device" for the demo
- CLI: `python -m app.gateway.replay --edf chb08_02.edf --patient 123 --speed 1.0 --api wss://localhost:8000`.
- Reads the EDF with MNE, applies the same montage, and pushes 0.5 s chunks on a real wall‑clock timer so a 40‑minute recording with a seizure at 20:00 actually fires the alert 20 minutes in (use `--seek` and `--speed 30` for rehearsal, `--speed 1` for the real demo run on a short clip containing an onset).
- Ships with a curated `demo/` list of 3–4 short EDF clips (one clean, two with confirmed onsets) so results are reproducible live.
- **Framing for judges:** "The gateway is device‑agnostic. Today the source is clinical EDF replayed in real time; a consumer headset SDK emits the same frames — no server change." Add a stub `gateway/headset_adapter.py` with a `TODO` interface to make the extensibility concrete.

### 3.3 Batch path still exists
`POST /analyze/edf` (upload a full EDF → windowed inference → session summary + seizure_events) and the legacy `POST /analyze/csv` (kept for the Bonn single‑channel demo and backward compat). "Fallback to batch upload when streaming hardware is unavailable" from the PDF = this endpoint.

---

## 4. n8n Workstream (owner: Dilip + Suhita; **mandatory tool**)

### 4.1 Deployment
- `n8n/docker-compose.yml`: n8n + its own SQLite/Postgres volume. Run locally for the demo (`http://localhost:5678`), or a free n8n Cloud trial if you want public webhooks for the mobile push demo.
- Backend config: `N8N_WEBHOOK_BASE` env var. `notify/n8n.py` just does `POST {N8N_WEBHOOK_BASE}/webhook/<path>` with a signed shared‑secret header.
- Export every workflow to `n8n/workflows/*.json` and commit — this is your proof of "n8n used" and makes it reproducible.

### 4.2 Workflows

| # | Trigger | Steps | Demonstrates PDF claim |
|---|---|---|---|
| 01 **Seizure alert fan‑out** | Webhook `POST /webhook/seizure-alert` from backend on ALERT edge | Validate secret → format message (patient name, risk, time, locale) → **parallel:** WhatsApp Business/Cloud API message to caregiver · FCM/Expo push · Email · `POST /alerts` back to backend to persist `channels_sent` | "Real‑time caregiver alerts (WhatsApp)", "push notifications when risk > 70%" |
| 02 **Escalation** | Called by 01 (or Wait node) | Wait 3 min → `GET /alerts/{id}` → if `acked_at` null → notify **secondary** caregiver + neurologist on‑call + louder channel (Telegram/voice via Twilio) → mark `level=2` | "timely emergency response", caregiver safety net |
| 03 **Weekly trend report** | Cron, Sun 08:00 | For each patient: `GET /patients/{id}/weekly-stats` → build summary (optional LLM node for plain language) → `GET /reports?kind=weekly` (backend renders PDF) → email to patient + assigned neurologist | "Weekly trend graph", "Downloadable PDF reports", "Share structured reports with neurologists" |
| 04 **Share with doctor** | Webhook from Patient/Caregiver "Share with doctor" button | Fetch latest session PDF → email to `assigned_neurologist` with structured JSON summary → create a case note via backend | "Share‑with‑doctor button", "Care coordination via shareable PDF reports" |
| 05 **Diary reminder** | Cron, daily 20:00 per patient locale | Push + WhatsApp "Log today's symptoms" with deep link into the app | "Symptom diary", proactive patient engagement |
| 06 **Stream‑drop watchdog** | Webhook from backend when an active `monitor_session` heartbeat is missed > 90 s | Notify caregiver "monitoring interrupted for <patient>" | continuity of "ongoing condition management" |

- Keep the **decision logic** (threshold, hysteresis) in the backend engine; keep **routing/escalation/scheduling/multi‑channel** logic in n8n. Clean separation, easy to explain in the pitch: *"n8n is NeuroShield's care‑coordination nervous system."*

---

## 5. Backend REST/Auth Workstream (owner: Dilip)

- Replace hardcoded `/login` with `POST /auth/login` issuing a JWT `{sub, role, patient_id?, locale, exp}`; `bcrypt` hashes; seed script creates one demo user per role + a linked caregiver.
- `require_role(...)` dependency gates every route. Patient can only read own records; caregiver only linked patient(s); neurologist only assigned patients. Add a simple ownership check helper.
- Endpoints beyond auth: patients + linking, seizure history timeline (`GET /patients/{id}/events`), diary CRUD, weekly‑stats aggregation, `GET /reports/{id}.pdf` (reportlab: risk timeline chart, band/channel table, SHAP summary, plain‑language text, disclaimer), `/alerts` list + `/alerts/{id}/ack`.
- Move CORS from `*` to an allowlist (web origin, Expo dev, LAN IP for phone testing).
- `/health` extended: model loaded, montage, DB reachable, n8n reachable.

---

## 6. Web Frontend Workstream (owner: Madhan, Frontend Lead)

Reuse the existing component library (RiskGauge, SignalViewer, Chart usage, ReportSummary). Add role routing after login.

- **Patient view:** big traffic‑light risk card, seizure history timeline, plain‑language AI report with `en/ta/hi` toggle, one‑tap "Alert my caregiver", symptom diary form, "Share with doctor".
- **Caregiver view:** linked‑patient status card, live risk (subscribes to `/ws/risk/{session}` when a session is active), weekly trend graph, alert inbox with **Acknowledge** button (writes `acked_at` — this is what stops escalation workflow 02), call button.
- **Neurologist view:** multi‑patient case list, per‑patient full clinical dashboard — live + historical waveform, **per‑channel band‑power grid**, **SHAP panel** (channel/band importance bars), event list with "confirm seizure" toggle, "Download PDF".
- **LiveMonitor component:** a "Start demo monitoring" button that (for the demo) tells the backend to launch `replay.py` against a chosen clip, then renders the live gauge + waveform from the risk socket.
- i18n via a small `i18n.js` dictionary (UI strings) + server‑rendered report text for `ta`/`hi`.
- PWA layer (vite‑plugin‑pwa): installable manifest, service‑worker asset cache, offline shell — this is the low‑risk mobile fallback; the real mobile deliverable is Section 7.

---

## 7. Mobile App Workstream — Expo / React Native (owner: Madhan, after web scaffold; Shyam assists on API)

- **Expo + expo-router**, TypeScript. Same REST/WS API, JWT reused. `eas.json` for builds.
- **Screens:**
  - Auth: login, biometric unlock (`expo-local-authentication`) gating app open.
  - Patient: risk status (traffic light + last update), seizure history, symptom diary (works offline, queues to sync), **one‑tap SOS** (calls `/alerts` + fires n8n 01), settings/locale.
  - Caregiver: linked patient status, **alert detail screen** (deep‑linked from push) with Acknowledge + Call, weekly trend.
- **Push:** `expo-notifications` → Expo push tokens registered to the user; n8n workflow 01 sends to Expo push API (simplest) or FCM. Handle background/killed‑app delivery — that's the whole point of push vs WebSocket.
- **Offline‑first:** `expo-sqlite` or AsyncStorage cache of last risk status, history, diary; background sync on reconnect. Matches the PDF's offline‑first principle.
- **Live view:** subscribe to `/ws/risk/{session}` only while foregrounded; rely on push when backgrounded (OS suspends sockets — call this out in the pitch, the PDF already does).
- **Packaging:** `eas build -p android --profile preview` → installable `.apk` for the demo; `.aab` profile ready for Play Store. PWA (Section 6) retained as fallback for unsupported devices. iOS via TestFlight is optional/post‑hackathon.

---

## 8. Multilingual + Offline AI Assistant (owner: Suhita + Dilip)

- `/assistant/summarize` and `/assistant/chat` take a `locale` param.
- **Online:** Gemini 2.5 Flash with locale‑specific system prompts ("Respond in Tamil, plain language, 6th‑grade reading level, no jargon...").
- **Offline fallback:** rule‑based generator keyed off the structured report (label, risk band, dominant channels/bands, diary flags) + a `medical_terms.{en,ta,hi}.json` phrase bank. Produces a templated but correct plain‑language paragraph with **no network**. This is what makes the "works in a village with no internet" claim real.
- Keep the existing `/chat` rule fallback; extend its dictionary to the 3 languages.

---

## 9. Phased Timeline (3 weeks, 4 people, parallel workstreams)

Milestones are demoable at each week end.

### Week 1 — Foundations
| Owner | Work |
|---|---|
| Shyam (ML) | `download_chbmit.py` subset; `preprocess.py` (montage, filter, window, patient split); first EEGNet training run on Colab; export CPU checkpoint + metadata; baseline `evaluate.py` numbers |
| Dilip (BE) | Repo restructure to `app/`; SQLAlchemy models + seed script; `POST /auth/login` JWT + `require_role`; `POST /analyze/edf` batch path; n8n docker up + workflow 01 (fan‑out to email only, stub WhatsApp/push) |
| Madhan (FE) | Role routing after login; Patient view (risk card, timeline, diary) on mock/batch data; api/auth/ws libs |
| Suhita | TUH access request; dataset split doc + `MODEL_CARD.md` skeleton; PDF/pitch revision (real‑time→gateway, 19→18 channel, dual metrics); demo clip curation from CHB‑MIT |

**Milestone 1:** log in as each role; upload a CHB‑MIT EDF → batch seizure detection + events persisted; Patient dashboard shows history; one n8n workflow fires an email.

### Week 2 — Real‑time gateway, alerts, language, mobile core
| Owner | Work |
|---|---|
| Shyam | `realtime.py` engine (ring buffer, sliding window, EMA + hysteresis); `explain.py` SHAP/gradient channel‑band importance; retrain with tuned sampling; lock operating threshold |
| Dilip | `WSS /ws/ingest` gateway + session mgmt; `gateway/replay.py` EDF real‑time streamer; `/ws/risk/{session}` client socket; ALERT‑edge → n8n; wire n8n 01 to real WhatsApp Cloud API + Expo push; workflows 02, 04, 06; `/reports/{id}.pdf` (reportlab) |
| Madhan | Caregiver view (live gauge, alert inbox + Acknowledge, trend); Neurologist view (band grid, SHAP panel, event confirm, PDF button); LiveMonitor "start demo monitoring"; PWA layer. Then: Expo scaffold, auth, Patient + Caregiver screens, `expo-notifications` register |
| Suhita | Multilingual prompt packs + offline rule‑based generator + `ta/hi` phrase banks; workflow 03 + 05; fill in real evaluation numbers; start demo script |

**Milestone 2:** `replay.py` streams a CHB‑MIT clip in real time → web live gauge climbs → at onset, alert fires → **WhatsApp + phone push** reach the caregiver → caregiver taps Acknowledge → escalation cancelled. Patient report available in EN/TA/HI, online and offline.

### Week 3 — Multi‑channel polish, hardening, packaging, demo
| Owner | Work |
|---|---|
| Shyam | Final training run on a larger CHB‑MIT subset; freeze checkpoint; finalize `MODEL_CARD.md`; latency/FA‑per‑hour table; CPU inference profiling on 4 GB RAM |
| Dilip | Offline/low‑resource QA (throttled CPU, no network); binary framing on the gateway if time; error‑path hardening (socket drop, model missing, n8n down = graceful); `/health` full |
| Madhan | `eas build` Android `.apk`; biometric lock; offline cache + background sync; cross‑device test; PWA install fallback; UI polish pass |
| Suhita | End‑to‑end run of every user story; `DEMO_SCRIPT.md`; record backup demo video; update `README.md` architecture; assemble submission package |

**Milestone 3 (final):** full end‑to‑end on real CHB‑MIT data — live detection → multi‑channel alert → multilingual report → neurologist SHAP review → PDF → installable APK on a real phone receiving the push. All n8n workflows exported to `n8n/workflows/`.

---

## 10. Demo Script (target ~6 min)

1. **Setup shot:** three browser logins (patient/caregiver/neurologist) + APK open on a phone.
2. `python -m app.gateway.replay --edf demo/chb08_onset.edf --patient 123 --speed 1` — "this is our device‑agnostic gateway; today the source is a clinical recording replayed in real time."
3. Web LiveMonitor: risk gauge rising, live 18‑channel waveform, per‑channel band power.
4. At seizure onset: alert edge fires → n8n workflow lights up → **WhatsApp message + phone push notification** arrive on camera.
5. Caregiver taps the push → alert detail → **Acknowledge** → show escalation workflow 02 cancelled (vs. let it escalate once to show the safety net).
6. Patient view: plain‑language report, toggle **English → Tamil → Hindi**; disconnect network, regenerate → offline fallback still produces the Tamil summary.
7. Neurologist view: SHAP panel — "the model weighted channels FP1‑F7 / F7‑T7 in the theta band" → confirm the event → **Download PDF**.
8. Show `n8n/workflows/` and `MODEL_CARD.md` — honest CHB‑MIT metrics, all automation reproducible.

---

## 11. Pitch / PDF Edits Required

| PDF text | Change to |
|---|---|
| "Real-time streaming: WebSocket-based live EEG processing" / "detection within 85ms of ictal onset" | "Real‑time monitoring **gateway**: device‑agnostic WSS ingestion; validated with clinical EDF replayed at 1× speed. Per‑window inference ≈ X ms on CPU; end‑to‑end alert latency ≤ ~15 s from onset (smoothing + hysteresis to suppress false alarms)." Drop the 85 ms claim — it was single‑window inference time, not detection latency. |
| "98.4% seizure detection accuracy" as the headline for v2 | Keep as "v1 published single‑channel foundation (Bonn)." Add "v2 multi‑channel (CHB‑MIT, held‑out patients): AUROC X, event sensitivity Y%, FA/h Z." |
| "19-channel clinical montage (EDF)" | "18‑channel standard bipolar montage (CHB‑MIT / clinical EDF)." |
| "upgrade from 1-channel to 19-channel ... via EEGNet" | keep, but say EEGNet trained/validated on CHB‑MIT. |
| "wearable-headset integration pilot" (post‑hackathon) | keep — now concretely enabled by the gateway protocol + `headset_adapter.py` stub. |
| Mobile: "PWA (hackathon) → React Native (post‑hackathon)" | "Expo React Native app (Patient + Caregiver) delivered in the hackathon window; PWA retained as fallback." |
| Add one line | "All caregiver communication, escalation, scheduled reporting, and cross‑service orchestration run through **n8n** workflows (exported and version‑controlled)." |

---

## 12. Full PDF‑Claim Coverage Matrix

| PDF claim | Status | How |
|---|---|---|
| Three‑role ecosystem (Patient/Caregiver/Neurologist) | ✅ Build | JWT role claim + 3 web views + ownership scoping |
| JWT role authentication | ✅ Build | `auth/jwt.py`, `require_role` |
| Traffic‑light risk indicator | ✅ Reuse | existing `RiskGauge.jsx` |
| Seizure history timeline | ✅ Build | `seizure_events` + `SeizureTimeline.jsx` |
| Symptom diary | ✅ Build | `diary` CRUD + form (web + mobile, offline) |
| Plain‑language AI report EN/TA/HI | ✅ Build | Gemini locale prompts + offline rule‑based generator |
| One‑tap caregiver alert | ✅ Build | `/alerts` + n8n 01 |
| Real‑time push when risk > 70% | ✅ Adapted | engine ALERT edge (EMA ≥ 0.70 + hysteresis) → n8n → FCM/Expo push |
| Weekly trend graph | ✅ Build | `risk_samples` aggregation + chart |
| Share‑with‑doctor | ✅ Build | button → n8n 04 → email PDF + case note |
| WhatsApp Business API alerts | ✅ Build | n8n 01 WhatsApp Cloud API node |
| Full clinical EEG dashboard | ✅ Build | Neurologist view |
| 19‑channel band‑power analysis | ✅ Adapted | 18‑channel bipolar montage `ChannelBandGrid.jsx` |
| SHAP explainability | ✅ Build | `explain.py` (SHAP DeepExplainer, gradient fallback) |
| Downloadable PDF reports | ✅ Build | `reports.py` + reportlab |
| Multi‑patient case management | ✅ Build | neurologist case list, `assigned_neurologist_id` |
| Hybrid CNN+LSTM 98.4% (Bonn) | ✅ Keep | retained as v1 foundation + legacy `/analyze/csv` |
| EEGNet for multi‑channel EDF | ✅ Build | trained on CHB‑MIT, honest metrics |
| Real‑time streaming architecture | ⚠️ Reframed | **Real‑Time Monitoring Gateway** + EDF replay simulator; hardware via same protocol later |
| Alert within 85 ms of onset | ✏️ Restate | inference ~X ms/window; alert latency ≤ ~15 s (with smoothing) |
| Live waveform + band power + risk gauge on one panel | ✅ Build | `LiveMonitor.jsx` |
| Batch upload fallback | ✅ Build | `POST /analyze/edf` |
| Dual AI assistant (Gemini + offline) | ✅ Build | `assistant.py` |
| Offline‑first / no internet | ✅ Build | offline report generator, PWA SW cache, mobile SQLite cache; CPU‑only inference |
| Consumer hardware, no GPU, ~700 MB | ✅ Verify | EEGNet CPU inference; Week‑3 low‑resource QA |
| PWA installable | ✅ Build | vite‑plugin‑pwa |
| Native mobile app (Android/iOS) | ✅ Build (Android) | Expo RN + `eas build` APK; iOS TestFlight optional |
| Native push (FCM) | ✅ Build | Expo push / FCM via n8n |
| Biometric app lock | ✅ Build | `expo-local-authentication` |
| Background risk‑polling | ✅ Build | push‑driven + periodic fetch on foreground |
| APK / AAB packaging | ✅ Build | `eas.json` preview (apk) + production (aab) |
| CHB‑MIT / TUH corpus validation | ⚠️ Partial | CHB‑MIT in‑scope now; TUH = post‑hackathon (as PDF Phase 2) |
| Federated learning / cloud (Phase 4) | ⛔ Out | explicitly post‑hackathon in PDF |
| n8n orchestration | ✅ Build | 6 workflows, version‑controlled |

---

## 13. Open Decisions (need the team's call)

1. **n8n hosting for the demo:** local Docker (simplest, but webhooks aren't public — phone push still works via Expo's cloud) vs. n8n Cloud trial (public webhooks, cleaner mobile demo). Recommend: **local Docker**, Expo push for mobile.
2. **WhatsApp channel:** Meta WhatsApp Cloud API sandbox (free, real WhatsApp, needs a test number + template approval lag) vs. Twilio WhatsApp sandbox (fastest to stand up) vs. Telegram bot as a no‑friction stand‑in. Recommend: **Twilio WhatsApp sandbox** for reliability on demo day, Telegram as backup.
3. **Training compute:** Colab free vs. Kaggle (30 h/wk GPU) vs. a local GPU if anyone has one. Recommend: **Kaggle** (longer sessions, CHB‑MIT can be added as a Kaggle dataset).
4. **Montage size:** confirm 18‑channel bipolar set that's consistent across the chosen CHB‑MIT patients (chb12 etc. have channel changes — may exclude).
5. **Mobile scope cut line if behind:** ship Patient + Caregiver Android APK with push + SOS + history + offline cache; drop biometric lock and background polling to "documented next" rather than slipping the web demo.
6. **iOS:** in or out for the hackathon? (TestFlight needs an Apple Developer account — $99/yr.) Recommend: **out**, PWA covers iOS.

---

## 14. Immediate Next Actions (Day 1)

- [ ] Shyam: `download_chbmit.py` — pull chb01/03/05/08; open `preprocess.py`.
- [ ] Dilip: branch `v2-restructure`; create `app/` skeleton, SQLAlchemy models, `/auth/login`; `docker compose up` n8n.
- [ ] Madhan: add role routing + Patient view shell against mock data; set up `mobile/` Expo project.
- [ ] Suhita: request TUH access; start PDF revision (Section 11); pick 3–4 demo EDF clips.
- [ ] All: agree the 6 open decisions above.
