from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from database import engine, get_db
import firebase_admin
from firebase_admin import auth as firebase_auth, firestore

# Initialise Firebase Admin SDK – expects GOOGLE_APPLICATION_CREDENTIALS
# env var
if not firebase_admin._apps:
    firebase_admin.initialize_app()

# Firestore client for blog posts, etc.
firestore_db = firestore.client()

# -------------------------------------------------
# Initialise the SQLite database (creates tables)
# -------------------------------------------------
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Amazing Grace LMS API")

# -------------------------------------------------
# CORS – allow local front‑end requests during dev
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 👉 replace with your domain(s) in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# Helper – verify Firebase ID token from Authorization header
# -------------------------------------------------


async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401,
                            detail="Missing or invalid Authorization header")
    id_token = auth_header.split(" ")[1]
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded  # contains uid, email, name, etc.
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid Firebase ID token")

# -------------------------------------------------
# Pydantic Schemas
# -------------------------------------------------


class SyncRequest(BaseModel):
    user_id: str
    added_xp: int
    added_credits: int
    game_state_passport: dict


class LessonCompletionRequest(BaseModel):
    user_id: str
    module_id: str
    score: int
    passed: bool


class BlogPostRequest(BaseModel):
    title: str
    content: str
    # client sends the Firebase ID token in the Authorization header

# -------------------------------------------------
# API Endpoints
# -------------------------------------------------


@app.get("/api/users/{user_id}/profile")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    """Return the user’s LMS profile.

    If the user has never synced, return defaults.
    """
    progress = (
        db.query(models.UserProgress)
        .filter(models.UserProgress.user_id == user_id)
        .first()
    )
    if not progress:
        return {"xp": 0, "level": 1, "signal_credits": 0, "passport": {}}
    return {
        "xp": progress.total_xp,
        "level": progress.level,
        "signal_credits": progress.signal_bonus_credits,
        "passport": progress.game_state_passport,
    }


@app.post("/api/progress/sync")
def sync_progress(req: SyncRequest, db: Session = Depends(get_db)):
    """Add XP/credits and store the latest passport JSON."""
    progress = (
        db.query(models.UserProgress)
        .filter(models.UserProgress.user_id == req.user_id)
        .first()
    )
    if not progress:
        progress = models.UserProgress(
            user_id=req.user_id,
            total_xp=req.added_xp,
            signal_bonus_credits=req.added_credits,
            game_state_passport=req.game_state_passport,
        )
        db.add(progress)
    else:
        progress.total_xp += req.added_xp
        progress.signal_bonus_credits += req.added_credits
        progress.game_state_passport = req.game_state_passport
        progress.level = (progress.total_xp // 500) + 1
    db.commit()
    return {"message": "Progress synced",
            "current_xp": progress.total_xp, "level": progress.level}


@app.post("/api/store/topup")
def topup_credits(user_id: str, amount: int, db: Session = Depends(get_db)):
    progress = (
        db.query(models.UserProgress)
        .filter(models.UserProgress.user_id == user_id)
        .first()
    )
    if not progress:
        raise HTTPException(
            status_code=404,
            detail="User not found. Complete a lesson first.")
    progress.signal_bonus_credits += amount
    db.commit()
    return {"new_balance": progress.signal_bonus_credits}

# -------------------------------------------------
# Leaderboard endpoint – top users by total XP
# -------------------------------------------------


@app.get("/api/leaderboard")
def get_leaderboard(limit: int = 10, db: Session = Depends(get_db)):
    rows = (
        db.query(models.UserProgress)
        .order_by(models.UserProgress.total_xp.desc())
        .limit(limit)
        .all()
    )
    return [
        {"user_id": r.user_id, "xp": r.total_xp,
            "level": r.level, "credits": r.signal_bonus_credits}
        for r in rows
    ]


# -------------------------------------------------
# Lessons endpoints – list & record completion
# -------------------------------------------------
LESSON_CATALOG = [
    {"id": "matrix-1", "title": "Matrix Basics",
        "description": "Intro to signal‑keeper role"},
    {"id": "code-matrix-1", "title": "Code Matrix Level 1",
        "description": "Pattern matching puzzle"},
    {"id": "vim-defense-1", "title": "VIM Defense Intro",
        "description": "Bash navigation tutorial"},
]


@app.get("/api/lessons")
def list_lessons():
    return LESSON_CATALOG


@app.post("/api/lessons/completion")
def record_lesson_completion(
        req: LessonCompletionRequest, db: Session = Depends(get_db)):
    # Ensure user record exists (creates a dummy User if missing)
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        user = models.User(id=req.user_id, email="unknown")
        db.add(user)
        db.commit()
        db.refresh(user)
    # Record or update LessonCompletion
    lc = (
        db.query(models.LessonCompletion)
        .filter(
            models.LessonCompletion.user_id == req.user_id,
            models.LessonCompletion.module_id == req.module_id
        )
        .first()
    )
    if not lc:
        lc = models.LessonCompletion(
            user_id=req.user_id,
            module_id=req.module_id,
            score=req.score,
            passed=req.passed,
        )
        db.add(lc)
    else:
        lc.score = max(lc.score, req.score)
        lc.passed = lc.passed or req.passed
    db.commit()
    return {"message": "Lesson completion recorded"}

# -------------------------------------------------
# Blog post endpoint – store article with author metadata
# -------------------------------------------------


@app.post("/api/blog/post")
async def create_blog_post(req: BlogPostRequest,
                           current_user: dict = Depends(get_current_user)):
    """Store a blog article, attributing it to the signed‑in Firebase user."""
    doc = {
        "title": req.title,
        "content": req.content,
        "author_uid": current_user.get("uid"),
        "author_name": current_user.get("name", current_user.get("email", "")),
        "timestamp": firestore.SERVER_TIMESTAMP,
    }
    await firestore_db.collection("blog_posts").add(doc)
    return {"message": "Blog post saved", "author": doc["author_name"]}
