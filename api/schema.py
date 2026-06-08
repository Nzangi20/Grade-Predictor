from pydantic import BaseModel, Field, EmailStr
from typing import Literal, Dict, Any, List
from datetime import datetime

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

CATEGORICAL_MAPPINGS = {
    "school": {"GP": 0, "MS": 1},
    "sex": {"F": 0, "M": 1},
    "address": {"R": 0, "U": 1},
    "famsize": {"GT3": 0, "LE3": 1},
    "Pstatus": {"A": 0, "T": 1},
    "Mjob": {"at_home": 0, "health": 1, "other": 2, "services": 3, "teacher": 4},
    "Fjob": {"at_home": 0, "health": 1, "other": 2, "services": 3, "teacher": 4},
    "reason": {"course": 0, "home": 1, "other": 2, "reputation": 3},
    "guardian": {"father": 0, "mother": 1, "other": 2},
    "schoolsup": {"no": 0, "yes": 1},
    "famsup": {"no": 0, "yes": 1},
    "paid": {"no": 0, "yes": 1},
    "activities": {"no": 0, "yes": 1},
    "nursery": {"no": 0, "yes": 1},
    "higher": {"no": 0, "yes": 1},
    "internet": {"no": 0, "yes": 1},
    "romantic": {"no": 0, "yes": 1},
}

class StudentData(BaseModel):
    school: Literal["GP", "MS"]
    sex: Literal["F", "M"]
    age: int = Field(..., ge=15, le=22)
    address: Literal["R", "U"]
    famsize: Literal["GT3", "LE3"]
    Pstatus: Literal["A", "T"]
    Medu: int = Field(..., ge=0, le=4)
    Fedu: int = Field(..., ge=0, le=4)
    Mjob: Literal["at_home", "health", "other", "services", "teacher"]
    Fjob: Literal["at_home", "health", "other", "services", "teacher"]
    reason: Literal["course", "home", "other", "reputation"]
    guardian: Literal["father", "mother", "other"]
    traveltime: int = Field(..., ge=1, le=4)
    studytime: int = Field(..., ge=1, le=4)
    failures: int = Field(..., ge=0, le=3)
    schoolsup: Literal["no", "yes"]
    famsup: Literal["no", "yes"]
    paid: Literal["no", "yes"]
    activities: Literal["no", "yes"]
    nursery: Literal["no", "yes"]
    higher: Literal["no", "yes"]
    internet: Literal["no", "yes"]
    romantic: Literal["no", "yes"]
    famrel: int = Field(..., ge=1, le=5)
    freetime: int = Field(..., ge=1, le=5)
    goout: int = Field(..., ge=1, le=5)
    Dalc: int = Field(..., ge=1, le=5)
    Walc: int = Field(..., ge=1, le=5)
    health: int = Field(..., ge=1, le=5)
    absences: int = Field(..., ge=0, le=93)
    G1: int = Field(..., ge=0, le=20)
    G2: int = Field(..., ge=0, le=20)

    def to_encoded_dict(self) -> Dict[str, Any]:
        raw_data = self.model_dump()
        encoded = {}
        for key, val in raw_data.items():
            if key in CATEGORICAL_MAPPINGS:
                encoded[key] = CATEGORICAL_MAPPINGS[key][val]
            else:
                encoded[key] = val
        return encoded

class PredictionResponse(BaseModel):
    predicted_grade: float
    evaluation: str
    recommendations: List[str]

class PredictionHistoryItem(BaseModel):
    id: int
    predicted_grade: float
    inputs: Dict[str, Any]
    created_at: datetime