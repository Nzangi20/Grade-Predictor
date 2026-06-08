from pathlib import Path
import pandas as pd
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent

model_path = BASE_DIR / "models" / "student_performance_model.pkl"
features_path = BASE_DIR / "models" / "feature_names.pkl"

model = joblib.load(model_path)
features = joblib.load(features_path)

sample = pd.DataFrame(
    [[0] * len(features)],
    columns=features
)

prediction = model.predict(sample)

print("Prediction:", prediction[0])