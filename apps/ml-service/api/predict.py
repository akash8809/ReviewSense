import os
import re
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI(title="ReviewSense Sentiment Classifier API")

BASE_DIR = os.path.dirname(__file__)

MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "..", "models", "vectorizer.pkl")

model = None
vectorizer = None


def load_model():
    global model, vectorizer

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("model.pkl not found")

    if not os.path.exists(VECTORIZER_PATH):
        raise FileNotFoundError("vectorizer.pkl not found")

    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)

    print("Model Loaded Successfully")


@app.on_event("startup")
def startup():
    load_model()


class PredictRequest(BaseModel):
    reviews: List[str]


class PredictResponse(BaseModel):
    results: List[str]
    confidences: List[float]


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):

    global model, vectorizer

    if model is None or vectorizer is None:
        load_model()

    if len(request.reviews) == 0:
        return PredictResponse(
            results=[],
            confidences=[]
        )

    cleaned_reviews = []

    for review in request.reviews:

        review = str(review)

        review = review.lower()

        review = re.sub(r"[^a-zA-Z0-9 ]", " ", review)

        review = re.sub(r"\s+", " ", review)

        review = review.strip()

        cleaned_reviews.append(review)

    try:

        X = vectorizer.transform(cleaned_reviews)

        predictions = model.predict(X)

        probabilities = model.predict_proba(X)

        confidences = []

        for probability in probabilities:
            confidences.append(
                round(float(max(probability)), 4)
            )

        # Temporary Debug Logs
        print(f"[DEBUG] TF-IDF shape: {X.shape}")
        for i, (orig, clean, pred, prob) in enumerate(zip(request.reviews, cleaned_reviews, predictions, probabilities)):
            print(f"[DEBUG] Review #{i}:")
            print(f"  Original text: {orig}")
            print(f"  Cleaned text:  {clean}")
            print(f"  Raw Model Pred: {pred}")
            print(f"  Predict Proba: {prob.tolist()}")

        return PredictResponse(
            results=predictions.tolist(),
            confidences=confidences
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "predict:app",
        host="0.0.0.0",
        port=5001,
        reload=True
    )