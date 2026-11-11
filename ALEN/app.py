from functools import lru_cache
from pathlib import Path

import pandas as pd
from flask import Flask, render_template, request
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "diabetes_prediction_dataset.csv"
TARGET = "diabetes"
CATEGORICAL_FEATURES = ["gender", "smoking_history"]
NUMERIC_FEATURES = [
    "age",
    "hypertension",
    "heart_disease",
    "bmi",
    "HbA1c_level",
    "blood_glucose_level",
]
EXPECTED_COLUMNS = CATEGORICAL_FEATURES + NUMERIC_FEATURES + [TARGET]
app = Flask(__name__)


@lru_cache(maxsize=1)
def load_dataset():
    data = pd.read_csv(DATA_PATH)
    missing_columns = set(EXPECTED_COLUMNS) - set(data.columns)
    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {', '.join(sorted(missing_columns))}")
    return data


@lru_cache(maxsize=1)
def evaluate_models():
    data = load_dataset()
    features = data[CATEGORICAL_FEATURES + NUMERIC_FEATURES]
    target = data[TARGET].astype(int)
    x_train, x_test, y_train, y_test = train_test_split(
        features, target, test_size=0.2, random_state=42, stratify=target
    )

    preprocess = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
            ("numeric", StandardScaler(), NUMERIC_FEATURES),
        ]
    )
    classifiers = {
        "Logistic Regression": LogisticRegression(
            max_iter=1000, class_weight="balanced", random_state=42
        ),
        "Decision Tree": DecisionTreeClassifier(
            max_depth=12, min_samples_leaf=10, class_weight="balanced", random_state=42
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=120,
            max_depth=16,
            min_samples_leaf=4,
            class_weight="balanced_subsample",
            n_jobs=-1,
            random_state=42,
        ),
    }

    models = {}
    for name, classifier in classifiers.items():
        model = Pipeline([("preprocess", preprocess), ("classifier", classifier)])
        model.fit(x_train, y_train)
        predicted = model.predict(x_test)
        probabilities = model.predict_proba(x_test)[:, 1]
        models[name] = {
            "pipeline": model,
            "accuracy": accuracy_score(y_test, predicted),
            "precision": precision_score(y_test, predicted, zero_division=0),
            "recall": recall_score(y_test, predicted, zero_division=0),
            "f1": f1_score(y_test, predicted, zero_division=0),
            "roc_auc": roc_auc_score(y_test, probabilities),
        }

    return models


def dashboard_data(models):
    data = load_dataset()
    ranked = sorted(models.items(), key=lambda item: item[1]["f1"], reverse=True)
    summary = {
        "rows": len(data),
        "features": len(EXPECTED_COLUMNS) - 1,
        "positive_count": int(data[TARGET].sum()),
        "positive_rate": float(data[TARGET].mean()),
        "negative_count": int((data[TARGET] == 0).sum()),
    }
    return ranked, summary


@app.route("/", methods=["GET", "POST"])
def index():
    models = evaluate_models()
    ranked_models, summary = dashboard_data(models)
    default_model = ranked_models[0][0]
    selected_model = request.form.get("model", default_model)
    if selected_model not in models:
        selected_model = default_model

    prediction = None
    error = None
    if request.method == "POST":
        try:
            values = {
                "gender": request.form["gender"],
                "smoking_history": request.form["smoking_history"],
                "age": float(request.form["age"]),
                "hypertension": int(request.form["hypertension"]),
                "heart_disease": int(request.form["heart_disease"]),
                "bmi": float(request.form["bmi"]),
                "HbA1c_level": float(request.form["HbA1c_level"]),
                "blood_glucose_level": float(request.form["blood_glucose_level"]),
            }
            if not (0 <= values["age"] <= 120 and 0 < values["bmi"] <= 100):
                raise ValueError("Enter an age from 0 to 120 and a BMI greater than 0 and no more than 100.")
            if not (0 < values["HbA1c_level"] <= 20 and 0 < values["blood_glucose_level"] <= 1000):
                raise ValueError("Enter positive lab values within the displayed input ranges.")

            sample = pd.DataFrame([values], columns=CATEGORICAL_FEATURES + NUMERIC_FEATURES)
            pipeline = models[selected_model]["pipeline"]
            probability = float(pipeline.predict_proba(sample)[0, 1])
            prediction = {
                "label": int(probability >= 0.5),
                "probability": probability,
                "model": selected_model,
            }
        except (KeyError, TypeError, ValueError) as exc:
            error = str(exc) or "Check the submitted values and try again."

    return render_template(
        "index.html",
        ranked_models=ranked_models,
        summary=summary,
        selected_model=selected_model,
        prediction=prediction,
        error=error,
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)