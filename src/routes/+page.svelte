<script>
	import { onDestroy } from 'svelte';
	import { base } from '$app/paths';

	// Put your Teachable Machine export folder in SvelteKit here:
	// /static/tm-my-image-model/{model.json,metadata.json,weights.bin}
	// `base` makes this work both locally ("") and on GitHub Pages ("/<repo>").
	const MODEL_URL = `${base}/tm-my-image-model/`;

	let tmImage;
	let model;

	let isLoadingModel = false;
	let status = 'Load the model, then upload a photo.';
	let predictions = [];

	let imageSrc = '';
	let imageEl;

	async function ensureLibrariesLoaded() {
		if (tmImage) return;
		await import('@tensorflow/tfjs');
		const tmImageModule = await import('@teachablemachine/image');
		tmImage = tmImageModule.default ?? tmImageModule;
	}

	async function loadModel() {
		if (model || isLoadingModel) return;
		isLoadingModel = true;
		status = 'Loading model…';

		try {
			await ensureLibrariesLoaded();
			model = await tmImage.load(`${MODEL_URL}model.json`, `${MODEL_URL}metadata.json`);
			status = 'Model loaded. Upload an image.';
		} catch (err) {
			console.error(err);
			status = 'Error loading model (check MODEL_URL + /static folder).';
		} finally {
			isLoadingModel = false;
		}
	}

	function onFileChange(e) {
		const file = e.currentTarget.files?.[0];
		if (!file) return;

		// Clean up old object URL
		if (imageSrc) URL.revokeObjectURL(imageSrc);

		imageSrc = URL.createObjectURL(file);
		status = 'Image selected. Predicting…';
		predictions = [];
	}

	async function predictImage() {
		if (!model || !imageEl) return;

		try {
			const result = await model.predict(imageEl);
			predictions = result
				.map((r) => ({ className: r.className, probability: r.probability }))
				.sort((a, b) => b.probability - a.probability);

			status = 'Done.';
		} catch (err) {
			console.error(err);
			status = 'Prediction error (check console).';
		}
	}

	// ----- Derived values for UI + plant behavior -----
	$: top = predictions[0] ?? { className: '', probability: 0 };
	$: confidence = top.probability || 0;
	$: topPct = Math.round(confidence * 100);

	$: isDuke = top.className?.toLowerCase().includes('duke');
	$: isUNC = top.className?.toLowerCase().includes('unc');

	// growth/decay are 0..1 and driven by probability
	$: growth = isDuke ? confidence : 0;
	$: decay = isUNC ? confidence : 0;

	onDestroy(() => {
		if (imageSrc) URL.revokeObjectURL(imageSrc);
	});
</script>

<main class="page">
	<header class="header">
		<div class="titleBlock">
			<h1>Rivalry Bloom</h1>
			<p class="sub">Upload a photo. Duke signals → growth. UNC signals → decay.</p>
		</div>

		<div class="actions">
			<button class="btn" type="button" on:click={loadModel} disabled={isLoadingModel || !!model}>
				{#if isLoadingModel}
					Loading…
				{:else if model}
					Model loaded ✓
				{:else}
					Load model
				{/if}
			</button>

			<label class="file {model ? '' : 'disabled'}" aria-disabled={!model}>
				<input type="file" accept="image/*" on:change={onFileChange} disabled={!model} />
				<span>Upload image</span>
			</label>
		</div>
	</header>

	<section class="grid">
		<!-- LEFT: Upload + preview -->
		<div class="card">
			<div class="cardTop">
				<h2>Input</h2>
				<span class="pill">{status}</span>
			</div>

			{#if imageSrc}
				<img
					bind:this={imageEl}
					src={imageSrc}
					alt="Uploaded preview"
					class="preview"
					on:load={predictImage}
				/>
			{:else}
				<div class="empty">
					<div class="emptyIcon">📷</div>
					<div class="emptyText">
						<strong>No image yet</strong>
						<div class="muted">Load the model, then upload a Duke or UNC image.</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- RIGHT: Results + biomimicry reaction -->
		<div class="card">
			<div class="cardTop">
				<h2>Classification</h2>

				{#if top.className}
					<span class="badge {isDuke ? 'duke' : isUNC ? 'unc' : ''}">
						{top.className} · {topPct}%
					</span>
				{:else}
					<span class="badge">Waiting…</span>
				{/if}
			</div>

			{#if predictions.length}
				<div class="bars">
					{#each predictions as p (p.className)}
						<div class="row">
							<div class="rowLabel">
								<span class="name">{p.className}</span>
								<span class="pct">{Math.round(p.probability * 100)}%</span>
							</div>
							<div class="track">
								<div class="fill" style="width: {p.probability * 100}%"></div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="muted">Your prediction results will appear here.</div>
			{/if}

			<div class="divider"></div>

			<h2>Ecosystem response</h2>
			<p class="muted">
				A biomimicry metaphor: visual identity signals act like environmental cues—supporting growth or
				inducing stress.
			</p>

			<!-- Plant scene: bud -> bloom (Duke), droop + fall + cracks (UNC) -->
			<div class="scene {isDuke ? 'mode-grow' : isUNC ? 'mode-decay' : 'mode-idle'}">
				<div class="ground"></div>

				<!-- Stem grows + droops on decay -->
				<div
					class="stem"
					style="
						height: {50 + growth * 160 - decay * 40}px;
						transform: translateX(-50%) rotate({decay * 18}deg);
					"
				></div>

				<!-- Leaves -->
				<div
					class="leaf leaf-left"
					style="
						opacity: {Math.min(1, growth * 1.2 + 0.15)};
						transform: rotate(-35deg) scale({0.6 + growth * 0.8 - decay * 0.3});
						filter: saturate({1 - decay * 0.8}) brightness({1 - decay * 0.25});
					"
				></div>

				<div
					class="leaf leaf-right"
					style="
						opacity: {Math.min(1, growth * 1.2 + 0.15)};
						transform: rotate(35deg) scaleX(-1) scale({0.6 + growth * 0.8 - decay * 0.3});
						filter: saturate({1 - decay * 0.8}) brightness({1 - decay * 0.25});
					"
				></div>

				<!-- Flower -->
				<div
					class="flower"
					style="
						transform:
							translateX(-50%)
							translateY({decay * 12}px)
							scale({0.45 + growth * 0.95 - decay * 0.35})
							rotate({decay * 25}deg);
						filter: saturate({1 - decay}) brightness({1 - decay * 0.25});
						opacity: {0.25 + growth * 0.9};
					"
				>
					<div class="petal p1"></div>
					<div class="petal p2"></div>
					<div class="petal p3"></div>
					<div class="petal p4"></div>
					<div class="petal p5"></div>
					<div class="petal p6"></div>
					<div class="center"></div>

					{#if decay > 0.45}
						<div class="fall fall1"></div>
						<div class="fall fall2"></div>
						<div class="fall fall3"></div>
					{/if}
				</div>

				{#if decay > 0.35}
					<div class="crack c1"></div>
					<div class="crack c2"></div>
					<div class="crack c3"></div>
				{/if}

				<!-- Optional explicit label (helps readability) -->
				<div class="sceneLabel">
					{#if isDuke}
						<span class="label good">Thriving</span>
					{:else if isUNC}
						<span class="label bad">Decayed :(</span>
					{:else}
						<span class="label neutral">Neutral</span>
					{/if}
				</div>
			</div>

			<div class="tip">
				<strong>Tip:</strong> If your model confuses light-blue photos with UNC, consider adding an “Other” class.
			</div>
		</div>
	</section>

	<footer class="footer">
		<div class="muted">Made with Teachable Machine + Svelte.</div>
	</footer>
</main>

<style>
	/* Page */
	.page {
		min-height: 100vh;
		padding: 28px;
		background: radial-gradient(1200px 600px at 10% 0%, rgba(0, 120, 255, 0.12), transparent 60%),
			radial-gradient(1200px 600px at 90% 0%, rgba(0, 200, 120, 0.12), transparent 60%),
			#0b1020;
		color: #eaf0ff;
		font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 18px;
		margin-bottom: 18px;
	}

	.titleBlock {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	h1 {
		margin: 0;
		font-size: 34px;
		letter-spacing: -0.02em;
	}

	.sub {
		margin: 0;
		color: rgba(234, 240, 255, 0.75);
	}

	.actions {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}

	@media (max-width: 900px) {
		.header {
			align-items: flex-start;
			flex-direction: column;
		}
		.grid {
			grid-template-columns: 1fr;
		}
	}

	/* Cards */
	.card {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(10px);
		border-radius: 16px;
		padding: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
	}

	.cardTop {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
	}

	h2 {
		margin: 0;
		font-size: 16px;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: rgba(234, 240, 255, 0.85);
	}

	.muted {
		color: rgba(234, 240, 255, 0.65);
	}

	.divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.12);
		margin: 14px 0;
	}

	/* Buttons */
	.btn {
		border: 1px solid rgba(255, 255, 255, 0.16);
		background: rgba(255, 255, 255, 0.08);
		color: #eaf0ff;
		padding: 10px 12px;
		border-radius: 12px;
		cursor: pointer;
		transition: transform 120ms ease, background 120ms ease, border 120ms ease;
	}

	.btn:hover {
		transform: translateY(-1px);
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.22);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.file {
		border: 1px dashed rgba(255, 255, 255, 0.22);
		background: rgba(255, 255, 255, 0.06);
		color: rgba(234, 240, 255, 0.9);
		padding: 10px 12px;
		border-radius: 12px;
		cursor: pointer;
		user-select: none;
	}

	.file input {
		display: none;
	}

	.file.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Status pills */
	.pill {
		font-size: 12px;
		padding: 6px 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: rgba(234, 240, 255, 0.8);
	}

	.badge {
		font-size: 12px;
		padding: 6px 10px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.06);
		color: rgba(234, 240, 255, 0.85);
		white-space: nowrap;
	}

	.badge.duke {
		border-color: rgba(0, 120, 255, 0.45);
		background: rgba(0, 120, 255, 0.18);
	}

	.badge.unc {
		border-color: rgba(120, 220, 255, 0.45);
		background: rgba(120, 220, 255, 0.16);
	}

	/* Preview */
	.preview {
		width: 100%;
		max-height: 420px;
		object-fit: cover;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.empty {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 22px;
		border-radius: 14px;
		border: 1px dashed rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.04);
	}

	.emptyIcon {
		font-size: 30px;
	}

	/* Prediction bars */
	.bars {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.rowLabel {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		margin-bottom: 6px;
		color: rgba(234, 240, 255, 0.9);
	}

	.track {
		height: 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.55);
		transition: width 250ms ease;
	}

	/* ---- Plant scene: obvious growth vs decay ---- */
	.scene {
		position: relative;
		height: 280px;
		margin-top: 10px;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		overflow: hidden;
		background: linear-gradient(180deg, rgba(40, 70, 140, 0.25), rgba(0, 0, 0, 0.18));
	}

	.scene.mode-grow {
		background: radial-gradient(700px 260px at 50% 0%, rgba(120, 255, 190, 0.18), transparent 60%),
			linear-gradient(180deg, rgba(40, 70, 140, 0.25), rgba(0, 0, 0, 0.18));
	}

	.scene.mode-decay {
		background: radial-gradient(700px 260px at 50% 0%, rgba(255, 160, 120, 0.14), transparent 60%),
			linear-gradient(180deg, rgba(50, 40, 40, 0.35), rgba(0, 0, 0, 0.22));
	}

	.ground {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 70px;
		background: rgba(14, 20, 30, 0.75);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.stem {
		position: absolute;
		bottom: 70px;
		left: 50%;
		width: 12px;
		transform-origin: bottom;
		transform: translateX(-50%);
		border-radius: 999px;
		background: linear-gradient(to top, rgba(60, 220, 150, 0.95), rgba(25, 140, 85, 0.95));
		filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.35));
		transition: height 520ms ease, transform 520ms ease, background 520ms ease;
	}

	.leaf {
		position: absolute;
		width: 70px;
		height: 34px;
		bottom: 155px;
		border-radius: 80px 80px 80px 0;
		background: rgba(70, 230, 160, 0.9);
		filter: drop-shadow(0 10px 10px rgba(0, 0, 0, 0.25));
		transition: transform 520ms ease, opacity 520ms ease, filter 520ms ease;
		opacity: 0.15;
	}

	.leaf-left {
		left: calc(50% - 58px);
		transform-origin: right center;
	}

	.leaf-right {
		left: calc(50% + 2px);
		transform-origin: left center;
	}

	.flower {
		position: absolute;
		left: 50%;
		bottom: 185px;
		width: 110px;
		height: 110px;
		transform-origin: center;
		transition: transform 520ms ease, opacity 520ms ease, filter 520ms ease;
	}

	.petal {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 54px;
		height: 26px;
		border-radius: 999px;
		transform-origin: left center;
		background: radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.95), rgba(236, 170, 255, 0.85) 70%);
		filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.25));
	}

	.p1 { transform: translate(-10%, -50%) rotate(0deg); }
	.p2 { transform: translate(-10%, -50%) rotate(60deg); }
	.p3 { transform: translate(-10%, -50%) rotate(120deg); }
	.p4 { transform: translate(-10%, -50%) rotate(180deg); }
	.p5 { transform: translate(-10%, -50%) rotate(240deg); }
	.p6 { transform: translate(-10%, -50%) rotate(300deg); }

	.center {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 26px;
		height: 26px;
		transform: translate(-50%, -50%);
		border-radius: 999px;
		background: radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.95), rgba(255, 220, 120, 0.95));
		filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.25));
	}

	.fall {
		position: absolute;
		left: 50%;
		top: 58%;
		width: 18px;
		height: 10px;
		border-radius: 999px;
		background: rgba(236, 170, 255, 0.8);
		filter: grayscale(0.6) brightness(0.75);
		opacity: 0.9;
		animation: fall 900ms ease-in forwards;
	}

	.fall1 { margin-left: -24px; transform: rotate(-18deg); animation-delay: 0ms; }
	.fall2 { margin-left: 4px; transform: rotate(10deg); animation-delay: 120ms; }
	.fall3 { margin-left: 22px; transform: rotate(22deg); animation-delay: 240ms; }

	@keyframes fall {
		0% { transform: translateY(0) rotate(0deg); opacity: 0.95; }
		100% { transform: translateY(72px) rotate(55deg); opacity: 0; }
	}

	.crack {
		position: absolute;
		bottom: 14px;
		height: 2px;
		background: rgba(255, 190, 160, 0.55);
		border-radius: 999px;
		filter: blur(0.1px);
		opacity: 0.8;
	}

	.c1 { left: 20%; width: 70px; transform: rotate(-12deg); }
	.c2 { left: 45%; width: 110px; transform: rotate(8deg); }
	.c3 { left: 66%; width: 80px; transform: rotate(-6deg); }

	.scene.mode-decay .stem {
		background: linear-gradient(to top, rgba(150, 120, 90, 0.95), rgba(90, 70, 55, 0.95));
	}

	.scene.mode-decay .leaf {
		background: rgba(170, 140, 95, 0.85);
	}

	.scene.mode-decay .petal {
		filter: grayscale(0.7) brightness(0.7);
	}

	.sceneLabel {
		position: absolute;
		top: 12px;
		left: 12px;
	}

	.label {
		display: inline-block;
		font-size: 12px;
		padding: 6px 10px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.06);
		color: rgba(234, 240, 255, 0.9);
	}

	.label.good {
		border-color: rgba(80, 255, 170, 0.35);
		background: rgba(80, 255, 170, 0.12);
	}

	.label.bad {
		border-color: rgba(255, 170, 120, 0.35);
		background: rgba(255, 170, 120, 0.12);
	}

	.label.neutral {
		border-color: rgba(255, 255, 255, 0.16);
		background: rgba(255, 255, 255, 0.06);
	}

	.tip {
		margin-top: 12px;
		padding: 10px 12px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: rgba(234, 240, 255, 0.78);
		font-size: 13px;
	}

	.footer {
		margin-top: 14px;
	}
</style>



