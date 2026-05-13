import os
import time
import base64
import numpy as np
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import tensorflow as tf
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# --- Configuration & Model Loading ---
MODEL_PATH = "saved_model/my_model.keras"
model = None
model_load_error = None

print("Initializing AI Engine...")
try:
    if os.path.exists(MODEL_PATH):
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Model loaded successfully into memory.")
    else:
        model_load_error = f"Model file not found at {MODEL_PATH}"
        print(model_load_error)
except Exception as e:
    model_load_error = str(e)
    print(f"Failed to load model: {e}")

CLASS_NAMES = [
    'T-shirt/top', 'Trouser', 'Pullover', 'Dress', 'Coat',
    'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot'
]

# --- Preprocessing Logic ---
def preprocess_image(image_bytes):
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(image_bytes))
        
        # Convert to grayscale if it's RGB
        if img.mode != 'L':
            img = img.convert('L')
            
        # Resize to 28x28 (Fashion MNIST format)
        img = img.resize((28, 28))
        
        # Convert to numpy array and normalize (0 to 1)
        img_array = np.array(img) / 255.0
        
        # Invert colors if necessary (Fashion MNIST usually has dark background, white items)
        # If the user uploads a white background image, we might want to invert it.
        # A simple heuristic: if the borders are mostly white, invert.
        border_mean = (np.mean(img_array[0,:]) + np.mean(img_array[-1,:]) + np.mean(img_array[:,0]) + np.mean(img_array[:,-1])) / 4
        if border_mean > 0.5:
            img_array = 1.0 - img_array
        
        # Generate base64 preview of the processed greyscale image
        preview_uint8 = (img_array * 255).astype(np.uint8)
        preview_img = Image.fromarray(preview_uint8, mode='L')
        buf = io.BytesIO()
        preview_img.save(buf, format='PNG')
        greyscale_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
            
        # Reshape to (1, 28, 28, 1) for the model
        img_array = img_array.reshape(1, 28, 28, 1)
        return img_array, greyscale_b64
    except Exception as e:
        raise Exception(f"Image processing failed: {str(e)}")

# --- Routes ---
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    start_time = time.time()
    
    if model is None:
        return jsonify({'error': 'AI Model is offline.', 'details': model_load_error}), 503

    if 'file' not in request.files:
        return jsonify({'error': 'No file segment found in request.'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected.'}), 400

    try:
        image_bytes = file.read()
        processed_tensor, greyscale_b64 = preprocess_image(image_bytes)
        
        # Execute Inference
        predictions = model.predict(processed_tensor)
        predicted_idx = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][predicted_idx])
        
        predicted_class = CLASS_NAMES[predicted_idx]
        
        all_preds = {CLASS_NAMES[i]: float(predictions[0][i]) for i in range(len(CLASS_NAMES))}
        
        inference_time_ms = int((time.time() - start_time) * 1000)
        
        response_data = {
            'status': 'success',
            'prediction': {
                'class': predicted_class,
                'confidence': confidence,
                'all_probabilities': all_preds
            },
            'greyscale_preview': greyscale_b64,
            'telemetry': {
                'inference_time_ms': inference_time_ms,
                'input_shape': "[1, 28, 28, 1]",
                'model_version': "v1.0.0-keras"
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'error': 'Internal analysis failure.', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
