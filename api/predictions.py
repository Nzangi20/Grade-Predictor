import os
import json
from typing import Annotated, List
import pandas as pd
import joblib
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.database import get_db, Prediction
from api.auth import get_current_user, User
from api.schema import StudentData, PredictionResponse, PredictionHistoryItem

# Define model paths dynamically
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "student_performance_model.pkl"
FEATURES_PATH = BASE_DIR / "models" / "feature_names.pkl"

# Load models
if not MODEL_PATH.exists() or not FEATURES_PATH.exists():
    raise RuntimeError(f"Model files not found. Ensure student_performance_model.pkl and feature_names.pkl are in the models folder.")

model = joblib.load(MODEL_PATH)
features = joblib.load(FEATURES_PATH)

router = APIRouter(tags=["predictions"])

def evaluate_grade(grade: float) -> str:
    if grade >= 16:
        return "Excellent"
    elif grade >= 12:
        return "Good"
    elif grade >= 10:
        return "Satisfactory"
    else:
        return "At Risk"

def generate_recommendations(student: StudentData) -> List[str]:
    recs = []
    if student.failures > 0:
        recs.append("Address past class failures by setting up targeted tutoring to review foundational concepts.")
    if student.absences > 5:
        recs.append("Reduce class absences and establish a routine to catch up on missed schoolwork immediately.")
    if student.studytime < 2:
        recs.append("Increase weekly study time. Setting aside 2-5 hours for revision can significantly improve results.")
    if student.goout >= 4:
        recs.append("Establish a better balance between social activities (going out with friends) and school preparation.")
    if student.Dalc >= 3 or student.Walc >= 3:
        recs.append("Consider reducing alcohol intake, as higher consumption negatively affects concentration, sleep, and memory retention.")
    if student.schoolsup == "yes":
        recs.append("Make regular use of the extra academic support provided by the school.")
    if student.freetime >= 4 and student.studytime < 2:
        recs.append("Reallocate some of your excess free time towards active learning and study revision.")
    if not recs:
        recs.append("Keep up the great work! Maintain your current study habits and positive academic engagement.")
    return recs

@router.post("/api/v1/predict", response_model=PredictionResponse)
def predict(student: StudentData, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)):
    encoded_dict = student.to_encoded_dict()
    
    # Create DataFrame ensuring columns match exactly the features list in order
    df = pd.DataFrame([encoded_dict], columns=features)
    
    # Run prediction
    try:
        prediction = model.predict(df)
        predicted_grade = float(prediction[0])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model inference failed: {str(e)}"
        )
    
    # Save to database
    new_prediction = Prediction(
        user_id=current_user.id,
        predicted_grade=predicted_grade,
        inputs_json=json.dumps(student.model_dump())
    )
    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)
    
    evaluation = evaluate_grade(predicted_grade)
    recommendations = generate_recommendations(student)
    
    return PredictionResponse(
        predicted_grade=predicted_grade,
        evaluation=evaluation,
        recommendations=recommendations
    )

@router.get("/api/v1/predictions", response_model=List[PredictionHistoryItem])
def get_predictions(current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)):
    # Retrieve past predictions for current user
    predictions = db.query(Prediction).filter(Prediction.user_id == current_user.id).order_by(Prediction.created_at.desc()).all()
    
    result = []
    for pred in predictions:
        result.append(PredictionHistoryItem(
            id=pred.id,
            predicted_grade=pred.predicted_grade,
            inputs=pred.inputs,
            created_at=pred.created_at
        ))
    return result

@router.delete("/api/v1/predictions/{id}")
def delete_prediction(id: int, current_user: Annotated[User, Depends(get_current_user)], db: Session = Depends(get_db)):
    prediction = db.query(Prediction).filter(Prediction.id == id, Prediction.user_id == current_user.id).first()
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found or not owned by you"
        )
    db.delete(prediction)
    db.commit()
    return {"message": "Prediction history deleted successfully"}
