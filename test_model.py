import tensorflow as tf
import os

MODEL_PATH = "saved_model/my_model.keras"

if os.path.exists(MODEL_PATH):
    print(f"Model file found at {MODEL_PATH}")
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Model loaded successfully!")
        model.summary()
    except Exception as e:
        print(f"Error loading model: {e}")
else:
    print(f"Model file NOT found at {MODEL_PATH}")
