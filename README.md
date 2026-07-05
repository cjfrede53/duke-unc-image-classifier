# Duke vs. UNC Image Classifier (Rivalry Bloom) 🌸

An interactive browser-based machine learning application that classifies Duke and UNC imagery using a custom image recognition model built with TensorFlow.js and Teachable Machine.

Instead of simply displaying a prediction, the application visualizes the result through an animated ecosystem inspired by biomimicry—Duke classifications cause a flower to bloom, while UNC classifications trigger decay. All inference runs locally in the browser, requiring no backend server.
<img width="1502" height="751" alt="Screenshot 2026-07-05 at 6 22 10 PM" src="https://github.com/user-attachments/assets/6e3f1468-fa80-4bdb-9dc9-50f2690ade48" />

---

## Features

- 🔍 Image classification using a custom-trained Teachable Machine model
- 🧠 Client-side inference powered by TensorFlow.js
- 📊 Confidence scores for each prediction
- 🌸 Interactive visualization that responds dynamically to model output
- ⚡ Runs entirely in the browser—no images are uploaded to a server

---

## Tech Stack

- SvelteKit
- JavaScript
- TensorFlow.js
- Teachable Machine
- HTML / CSS

---

## How It Works

1. Load the trained image classification model.
2. Upload an image containing Duke or UNC branding.
3. TensorFlow.js performs inference directly in the browser.
4. The interface displays prediction confidence for each class.
5. The visualization animates based on the model's prediction:
   - 🌸 Duke → Flower blooms
   - 🥀 UNC → Flower decays

---

## Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
npm run preview
```

---

## Model Files

The application expects the exported Teachable Machine model in:

```
static/tm-my-image-model/
```

This directory should contain:

- `model.json`
- `metadata.json`
- weight shard files

Large model artifacts are intentionally excluded from version control.

---

## What I Learned

This project explored how machine learning predictions can be communicated through interaction design rather than raw labels alone. It also provided hands-on experience integrating browser-based machine learning with a modern JavaScript framework while balancing usability, performance, and visual feedback.

---

## Future Improvements

- Support webcam-based live inference
- Expand training data with real-world campus imagery
- Add an "Other" category for non-Duke/UNC images
- Improve model accuracy with a larger and more diverse dataset<img width="1508" height="739" alt="Screenshot 2026-07-05 at 6 21 44 PM" src="https://github.com/user-attachments/assets/5736af83-5c42-4975-a0a7-1e6a5c35dfee" />
