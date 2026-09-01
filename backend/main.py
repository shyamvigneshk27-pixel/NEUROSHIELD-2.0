
# Force Reload: v5 (Auth + DB + secure uploads)
import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json
import random
import sys
import os

from dotenv import load_dotenv
from google import genai

load_dotenv()
try:
    genai_api_key = os.environ.get("GEMINI_API_KEY")
    if genai_api_key and genai_api_key != "YOUR_GEMINI_API_KEY_HERE":
        genai_client = genai.Client(api_key=genai_api_key)
    else:
        genai_client = None
        print("Warning: GEMINI_API_KEY not found or is default.")
except Exception as e:
    print(f"Warning: Failed to initialize Gemini Client: {e}")
    genai_client = None

# Add current directory to path to allow absolute imports when running as a script
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from ml.inference import Predictor
except ImportError:
    # Fallback for different execution contexts
    from .ml.inference import Predictor

from app.core.config import settings
from app.db.database import get_db, init_db, SessionLocal
from app.db.seed import seed_demo_data
from app.auth.dependencies import get_current_user
from app.api.auth_routes import router as auth_router
from app.api.analysis_routes import register_analysis_routes
from app.api.edf_routes import router as edf_router
from app.api.patients_routes import router as patients_router

app = FastAPI(title="NeuroShield API", description="AI Backend for Seizure Prediction")

# CORS -- explicit allowlist only. Never "*" (see app/core/config.py CORS_ORIGINS).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _on_startup():
    init_db()
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()


# Initialize ML
predictor = Predictor()

# Auth + DB-backed analysis/EDF routers
app.include_router(auth_router)
app.include_router(edf_router)
app.include_router(patients_router)
register_analysis_routes(app, predictor)

# Load Medical Terms
base_dir = os.path.dirname(os.path.abspath(__file__))
try:
    with open(os.path.join(base_dir, "medical_terms.json"), "r") as f:
        medical_terms = json.load(f)
except FileNotFoundError:
    print("WARNING: medical_terms.json not found")
    medical_terms = {}
except json.JSONDecodeError:
    print("WARNING: medical_terms.json is not valid JSON")
    medical_terms = {}

# Models
class ChatRequest(BaseModel):
    query: str
    context: Optional[str] = None # Detailed context from the current report

class SummarizeRequest(BaseModel):
    analysis_result: dict

# NOTE: hardcoded /login and unauthenticated /analyze/csv, /analyze/image were
# removed in favor of app/api/auth_routes.py (JWT, bcrypt, DB-backed users) and
# app/api/analysis_routes.py (auth + ownership-checked, secure file storage).

@app.get("/health")
async def health_check():
    lstm_status = "Online" if predictor.lstm_model else "Offline"
    rf_status = "Online" if predictor.rf_model else "Offline"
    cnn_status = "Online" if predictor.cnn_model else "Offline"
    
    # Get absolute paths for diagnostics
    base_dir = os.path.dirname(os.path.abspath(__file__))
    rf_path = os.path.join(base_dir, "ml", "models", "rf_model.pkl")
    
    return {
        "status": "Running",
        "models": {
            "lstm": lstm_status,
            "random_forest": rf_status,
            "cnn": cnn_status
        },
        "diagnostics": {
            "cwd": os.getcwd(),
            "base_dir": base_dir,
            "rf_model_expected_path": rf_path,
            "rf_model_exists": os.path.exists(rf_path)
        }
    }


@app.post("/summarize")
async def summarize_report(request: SummarizeRequest, current_user=Depends(get_current_user)):
    if not genai_client:
        return {"summary": "Gemini API is not configured. Please set GEMINI_API_KEY in backend/.env file."}
    
    try:
        prompt = f"""
        Act as a clinical neurologist assistant. Analyze the following EEG analysis report and provide a clear, professional summary.
        Make it readable for a clinician. Use markdown formatting with bullet points and bold text where appropriate.

        Report Data:
        {json.dumps(request.analysis_result, indent=2)}

        Include:
        - A brief overview of the diagnosis (the label and risk score).
        - An explanation of the current neural oscillation bands (which band is dominant and what it means).
        - Clinical recommendations or next steps based on the risk score (e.g., routine monitoring vs. urgent care).
        """
        response = genai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return {"summary": response.text}
    except Exception as e:
        print(f"[SUMMARIZE] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate summary via Gemini API.")

@app.post("/chat")
async def chat(request: ChatRequest, current_user=Depends(get_current_user)):
    query = request.query.lower()
    
    if genai_client:
        try:
            prompt = f"You are NeuroShield, an AI assistant specializing in EEG analysis. "
            if request.context:
                prompt += f"Here is the context of the user's current EEG report: {request.context}. "
            prompt += f"Answer the user's query professionally and concisely.\n\nUser: {query}"
            
            response = genai_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            ans = response.text
            print(f"[CHAT] Query: {query} (Gemini handled)")
            return {"answer": ans.strip()}
        except Exception as e:
            print(f"[CHAT] Gemini Error: {e}")
            # Fallback to simple matching if Gemini fails
            pass
            
    # --- STATIC FALLBACK IF GEMINI OFFLINE OR FAILS ---
    response_text = ""
    greetings = ["Hello!", "Greetings.", "Hi there!", "Welcome back.", "Hello. I'm ready to assist."]
    support_phrases = ["I'm here to help you understand this data.", "Let me look into that for you.", "Great question.", "I'm analyzing the clinical patterns now."]
    
    if any(greet in query for greet in ["hello", "hi", "hey", "good morning", "good evening"]):
        response_text += f"{random.choice(greetings)} I am the NeuroShield AI Assistant. {random.choice(support_phrases)}\n\n"

    # Medical terms
    found_terms = []
    for term, definition in medical_terms.items():
        if term in query:
            found_terms.append(f"**{term.capitalize()}**: {definition}")
            
    if found_terms:
        response_text += "I found some medical terms in your query:\n" + "\n\n".join(found_terms) + "\n\n"
            
    if any(word in query for word in ["risk", "status", "result", "report", "happen", "wrong", "analyze", "explain"]):
        if request.context:
            try:
                import json as py_json
                ctx = py_json.loads(request.context)
                label = ctx.get('label', 'Unknown')
                risk = ctx.get('risk_score', 0)
                acc = ctx.get('model_accuracy', 0)
                bands = ctx.get('bands', {})
                
                analysis = f"Looking at your report, I see a **{label}** classification with a **{risk:.1f}% risk score**.\n\n"
                analysis += f"The system reliability for this specific analysis is **{acc}%**. "
                
                if risk > 60:
                    analysis += "The higher risk score is likely driven by characteristic ictal power shifts. "
                else:
                    analysis += "The neural patterns currently suggest a more stable state. "
                
                if bands:
                    dominant_band = max(bands, key=bands.get)
                    analysis += f"The dominant neural oscillation detected is in the **{dominant_band.capitalize()}** range ({bands[dominant_band]:.1f}% relative power)."
                
                response_text += analysis + "\n\n"
            except:
                response_text += f"Based on the clinical report: {request.context}. This indicates the current neural status processed by our models.\n\n"
        else:
            response_text += "I don't see an active analysis report yet. Please upload an EEG signal (CSV) or a Spectrogram (IMG) so I can give you a detailed breakdown!\n\n"
    
    if "model" in query or "accuracy" in query or "reliable" in query:
        status = "Our neural models are fully synchronized and calibrated for clinical accuracy." if (predictor.rf_model is not None and predictor.cnn_model is not None) else "Warning: Neural models are currently offline. Please check system connectivity."
        response_text += f"{status}\n\n"

    if not response_text:
        if "help" in query:
             response_text = "I can analyze your uploaded telemetry to detect seizure indicators or explain complex neurology terms like 'ictal', 'delta waves', or 'nyquist frequency'."
        else:
             response_text = "I'm specializing in EEG analysis and seizure prediction. I can explain specific terms or analyze your current report if you ask me to 'explain my results'."
             
    print(f"[CHAT] Query: {query} (Fallback)")
    return {"answer": response_text.strip()}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)