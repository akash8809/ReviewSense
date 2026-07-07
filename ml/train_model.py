import os
import json
import joblib
import pandas as pd

from sklearn.utils import resample
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "Consumer Reviews of Amazon Products.csv")

if not os.path.exists(DATASET_PATH):
    raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")

df = pd.read_csv(DATASET_PATH, low_memory=False)

REVIEW_COL = "reviews.text"
RATING_COL = "reviews.rating"

if REVIEW_COL not in df.columns or RATING_COL not in df.columns:
    raise ValueError(
        f"Dataset must contain columns '{REVIEW_COL}' and '{RATING_COL}'"
    )

df = df[[REVIEW_COL, RATING_COL]].dropna()
df = df.drop_duplicates(subset=[REVIEW_COL])

df[REVIEW_COL] = (
    df[REVIEW_COL]
    .astype(str)
    .str.lower()
    .str.replace(r"[^\w\s]", " ", regex=True)
    .str.replace(r"\s+", " ", regex=True)
    .str.strip()
)

df = df[df[REVIEW_COL] != ""]

def rating_to_sentiment(rating):
    try:
        r = float(rating)
    except Exception:
        return None
    if r <= 2:
        return "Negative"
    elif r == 3:
        return "Neutral"
    else:
        return "Positive"

df["Sentiment"] = df[RATING_COL].apply(rating_to_sentiment)
df = df.dropna(subset=["Sentiment"])

# ======================================
# Balance Dataset using Oversampling
# ======================================

from sklearn.utils import resample

positive = df[df["Sentiment"] == "Positive"]
neutral = df[df["Sentiment"] == "Neutral"]
negative = df[df["Sentiment"] == "Negative"]

neutral = resample(
    neutral,
    replace=True,
    n_samples=len(positive),
    random_state=42,
)

negative = resample(
    negative,
    replace=True,
    n_samples=len(positive),
    random_state=42,
)

df = pd.concat([positive, neutral, negative])

df = df.sample(frac=1, random_state=42).reset_index(drop=True)

print("\nBalanced Dataset")
print(df["Sentiment"].value_counts())
print("=" * 60)
print("Dataset shape:", df.shape)
print("\nSentiment distribution:")
print(df["Sentiment"].value_counts())
print("=" * 60)

X = df[REVIEW_COL]
y = df["Sentiment"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    stratify=y,
    random_state=42,
)

print("Training samples:", len(X_train))
print("Testing samples :", len(X_test))

vectorizer = TfidfVectorizer(
    stop_words="english",
    ngram_range=(1, 2),
    max_features=12000,
    min_df=2,
    max_df=0.95,
    sublinear_tf=True,
)

X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

model = LogisticRegression(
    class_weight="balanced",
    max_iter=3000,
    random_state=42,
)

model.fit(X_train_vec, y_train)

train_pred = model.predict(X_train_vec)
test_pred = model.predict(X_test_vec)

train_acc = accuracy_score(y_train, train_pred)
test_acc = accuracy_score(y_test, test_pred)
precision = precision_score(y_test, test_pred, average="weighted")
recall = recall_score(y_test, test_pred, average="weighted")
f1 = f1_score(y_test, test_pred, average="weighted")
report = classification_report(y_test, test_pred)
cm = confusion_matrix(y_test, test_pred)

print("\nTraining Accuracy :", round(train_acc, 4))
print("Testing Accuracy  :", round(test_acc, 4))
print("Precision         :", round(precision, 4))
print("Recall            :", round(recall, 4))
print("F1 Score          :", round(f1, 4))

print("\nClassification Report")
print(report)

print("Confusion Matrix")
print(cm)

joblib.dump(model, os.path.join(BASE_DIR, "model.pkl"))
joblib.dump(vectorizer, os.path.join(BASE_DIR, "vectorizer.pkl"))

metrics = {
    "dataset_shape": list(df.shape),
    "sentiment_distribution": df["Sentiment"].value_counts().to_dict(),
    "training_samples": len(X_train),
    "testing_samples": len(X_test),
    "training_accuracy": train_acc,
    "testing_accuracy": test_acc,
    "precision": precision,
    "recall": recall,
    "f1_score": f1,
    "classification_report": classification_report(
        y_test, test_pred, output_dict=True
    ),
    "confusion_matrix": cm.tolist(),
}

with open(os.path.join(BASE_DIR, "metrics.json"), "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=4)

print("\nSaved:")
print("- model.pkl")
print("- vectorizer.pkl")
print("- metrics.json")
print("\nTraining completed successfully.")
