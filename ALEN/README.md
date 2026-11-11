# Glycemic Signals

A Flask application for exploring the diabetes prediction dataset, comparing classifiers, and generating an illustrative probability estimate for a submitted profile.

## Problem statement

Predict the dataset's binary `diabetes` label (0 or 1) from eight supplied attributes: gender, age, hypertension, heart disease, smoking history, BMI, HbA1c level, and blood glucose level. The CSV contains 100,000 rows and has no empty cells. The target is imbalanced: 91,500 negative labels and 8,500 positive labels. `No Info` is retained as a smoking-history category.

This is a supervised classification exercise, not a clinical diagnostic tool. The dataset labels and features should not be treated as a substitute for clinical assessment.

## Preprocessing and evaluation

- An 80/20 train/test split is stratified by target label and uses a fixed random seed.
- Gender and smoking history are one-hot encoded; numeric fields are standardized.
- Preprocessing is inside each model pipeline, so encoders and scalers are fitted only on the training split.
- Class weighting is used to account for the minority positive class.
- Logistic Regression, Decision Tree, and Random Forest are compared using accuracy, precision, recall, F1, and ROC AUC on the held-out split.
- The dashboard ranks models by positive-class F1. Metrics are for this dataset and split, not a claim of clinical validity.

## Run locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000. The CSV must remain next to `app.py`. The models are fitted on the first page request and cached for the lifetime of the server process.