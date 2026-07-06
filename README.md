# Duke vs. UNC Image Classifier (Rivalry Bloom) 🌸

**[Live demo →](https://cjfrede53.github.io/duke-unc-image-classifier/)**

An interactive browser-based machine learning application that classifies Duke and UNC imagery using a custom image recognition model built with TensorFlow.js and Teachable Machine.

Instead of simply displaying a prediction, the application visualizes the result through an animated ecosystem inspired by biomimicry—Duke classifications cause a flower to bloom, while UNC classifications trigger decay. All inference runs locally in the browser, requiring no backend server.

<img width="1510" height="769" alt="Screenshot 2026-07-05 at 8 20 54 PM" src="https://github.com/user-attachments/assets/9f814d6e-f97e-446e-9bdf-84a798e63b46" />


---

## Features

- 🔍 Image classification using a custom-trained Teachable Machine model
- 🧠 Client-side inference powered by TensorFlow.js
- 📊 Confidence scores for each prediction
- 🌸 Interactive visualization that responds dynamically to model output
- ⚡ Runs entirely in the browser—no images are uploaded to a server
- 🤷 Low-confidence detection that tells the user when an image doesn't look like either school

---

## Tech Stack

- SvelteKit
- JavaScript
- TensorFlow.js
- Teachable Machine
- HTML / CSS
- GitHub Actions + GitHub Pages (CI/CD)

---

## How It Works

1. The trained image classification model loads automatically on page load.
2. Upload an image containing Duke or UNC branding.
3. TensorFlow.js performs inference directly in the browser.
4. The interface displays prediction confidence for each class.
5. The visualization animates based on the model's prediction:
   - 🌸 Duke → Flower blooms
   - 🥀 UNC → Flower decays
6. If confidence falls below 70%, the app reports an uncertain result instead of forcing a verdict.

---

## Design Decisions

**Lean into the rivalry.** The visual identity is built from the two schools' actual colors—Duke navy (`#00539B`) and Carolina blue (`#7BAFD4`). The title is set in Graduate, a varsity block-letter typeface, with each school name rendered in its own color and a gradient "rivalry rule" running navy-to-blue beneath the header. The prediction bars are color-coded to match.

**One loud element.** The varsity title is the page's single statement piece; the cards, scene, and footer stay quiet so the design doesn't compete with itself.

**Communicate uncertainty honestly.** With only two classes, a softmax model hovers near 50/50 when it's confused—so a 51% "Duke" verdict is noise, not signal. Below a 70% confidence threshold, the UI shows an "Uncertain" badge and a hint to try a clearer image, and the flower stays neutral rather than committing to a weak prediction.

**Zero-friction first run.** The model auto-loads on page load (no "Load model" button), the empty state suggests concrete things to try, and the single primary action—Upload image—sits front and center.

---

## Challenges & Solutions

**Deploying a SvelteKit app to GitHub Pages.** GitHub Pages only serves static files, so the app uses `@sveltejs/adapter-static` with full prerendering. Pages also serves project sites from a subpath (`/duke-unc-image-classifier/`), which silently broke the hardcoded model URL—fixed by resolving all asset paths through SvelteKit's `base` path, injected at build time by the CI workflow. Deployment is fully automated with GitHub Actions: every push to `main` builds and publishes the site.

**Janky growth animation.** The flower's stem originally animated its CSS `height`, which forces the browser to recalculate layout on every frame and caused visible stutter. Rewriting it as a `transform: scaleY()` on a fixed-height element moved the animation onto the GPU compositor, and a longer duration with a decelerating easing curve made the bloom feel organic. The scene also respects `prefers-reduced-motion`.

**Slow first load on mobile.** Shipping a neural network to the browser means downloading ~3 MB up front: an ~900 kB TensorFlow.js bundle plus 2.1 MB of model weights—originally fetched *serially*, since the model request couldn't start until the JS had downloaded and parsed. Adding `<link rel="preload">` hints for the model files lets the browser fetch the weights in parallel with the JS bundle, meaningfully cutting time-to-interactive on cellular connections. Subsequent visits are served from cache.

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

This directory contains:

- `model.json`
- `metadata.json`
- weight shard files

The model (~2 MB) is committed to the repository so the app runs out of the box after cloning and can be bundled by the deployment pipeline.

---

## Deployment

The site deploys automatically to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`). Every push to `main` triggers a build with `@sveltejs/adapter-static` and publishes the result.

---

## What I Learned

This project explored how machine learning predictions can be communicated through interaction design rather than raw labels alone. It also provided hands-on experience integrating browser-based machine learning with a modern JavaScript framework while balancing usability, performance, and visual feedback—from GPU-friendly animation techniques to the practical constraints of shipping a neural network over a mobile connection.

---

## Future Improvements

- Support webcam-based live inference
- Expand training data with real-world campus imagery
- Add an "Other" category for non-Duke/UNC images
- Improve model accuracy with a larger and more diverse dataset

<img width="1508" height="739" alt="Screenshot 2026-07-05 at 6 21 44 PM" src="https://github.com/user-attachments/assets/5736af83-5c42-4975-a0a7-1e6a5c35dfee" />
