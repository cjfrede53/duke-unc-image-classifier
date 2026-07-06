<script>
	import { onMount, onDestroy } from 'svelte';
	import { base } from '$app/paths';

	// Put your Teachable Machine export folder in SvelteKit here:
	// /static/tm-my-image-model/{model.json,metadata.json,weights.bin}
	// `base` makes this work both locally ("") and on GitHub Pages ("/<repo>").
	const MODEL_URL = `${base}/tm-my-image-model/`;

	// Below this confidence, we treat the prediction as "not sure" —
	// with two classes, a confused model hovers near 50/50.
	const CONFIDENCE_THRESHOLD = 0.7;

	let tmImage;
	let model;

	let isLoadingModel = false;
	let loadError = false;
	let status = 'Loading model…';
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
		loadError = false;
		status = 'Loading model…';

		try {
			await ensureLibrariesLoaded();
			model = await tmImage.load(`${MODEL_URL}model.json`, `${MODEL_URL}metadata.json`);
			status = 'Ready — upload an image.';
		} catch (err) {
			console.error(err);
			loadError = true;
			status = 'Model failed to load.';
		} finally {
			isLoadingModel = false;
		}
	}

	// Auto-load on page load: land, upload, see results.
	onMount(loadModel);

	function onFileChange(e) {
		const file = e.currentTarget.files?.[0];
		if (!file) return;

		// Clean up old object URL
		if (imageSrc) URL.revokeObjectURL(imageSrc);

		imageSrc = URL.createObjectURL(file);
		status = 'Classifying…';
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

	// Only commit to a verdict when the model is reasonably sure.
	$: confident = confidence >= CONFIDENCE_THRESHOLD;
	$: lowConfidence = predictions.length > 0 && !confident;

	$: isDuke = confident && top.className?.toLowerCase().includes('duke');
	$: isUNC = confident && top.className?.toLowerCase().includes('unc');

	// growth/decay are 0..1 and driven by probability
	$: growth = isDuke ? confidence : 0;
	$: decay = isUNC ? confidence : 0;

	// Stem: fixed CSS height (210px), animated with scaleY so growth is
	// GPU-composited and smooth (animating `height` forces layout every frame).
	$: stemScale = (50 + growth * 160 - decay * 40) / 210;

	onDestroy(() => {
		if (imageSrc) URL.revokeObjectURL(imageSrc);
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Graduate&display=swap" rel="stylesheet" />
	<!-- Start fetching the model in parallel with the TensorFlow.js bundle,
	     instead of waiting for the JS to download + parse first. -->
	<link rel="preload" href="{MODEL_URL}model.json" as="fetch" crossorigin="anonymous" />
	<link rel="preload" href="{MODEL_URL}metadata.json" as="fetch" crossorigin="anonymous" />
	<link rel="preload" href="{MODEL_URL}weights.bin" as="fetch" crossorigin="anonymous" />
</svelte:head>

<main class="page">
	<header class="header">
		<div class="titleBlock">
			<h1>
				<span class="team duke">Duke</span>
				<span class="vs">vs.</span>
				<span class="team unc">UNC</span>
				<span class="titleRest">Image Classifier</span>
			</h1>
			<p class="sub">Rivalry Bloom — browser-based ML with TensorFlow.js</p>
			<p class="how">
				Upload any image and a custom-trained Teachable Machine model classifies it as Duke or
				UNC — right in your browser with TensorFlow.js, so nothing is sent to a server. The
				flower visualizes the verdict: Duke makes it bloom, UNC makes it decay.
			</p>
		</div>

		<div class="actions">
			{#if loadError}
				<button class="btn" type="button" on:click={loadModel}>Retry loading model</button>
			{:else}
				<label class="file {model ? '' : 'disabled'}" aria-disabled={!model}>
					<input type="file" accept="image/*" on:change={onFileChange} disabled={!model} />
					<span>{model ? 'Upload image' : 'Loading model…'}</span>
				</label>
			{/if}
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
						<strong>Drop in something blue</strong>
						<div class="muted">Try a Duke or UNC logo, jersey, campus photo, or screenshot.</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- RIGHT: Results + biomimicry reaction -->
		<div class="card">
			<div class="cardTop">
				<h2>Classification</h2>

				{#if lowConfidence}
					<span class="badge">Uncertain · {topPct}%</span>
				{:else if top.className}
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
								<div
									class="fill {p.className?.toLowerCase().includes('duke')
										? 'duke'
										: p.className?.toLowerCase().includes('unc')
											? 'unc'
											: ''}"
									style="width: {p.probability * 100}%"
								></div>
							</div>
						</div>
					{/each}
				</div>

				{#if lowConfidence}
					<div class="notice">
						Low confidence — this doesn't look strongly like either school. Try a clearer Duke
						or UNC image.
					</div>
				{/if}
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

				<!-- Stem grows (scaleY) + droops on decay -->
				<div
					class="stem"
					style="transform: translateX(-50%) rotate({decay * 18}deg) scaleY({stemScale});"
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
		</div>
	</section>

	<footer class="footer">
		<div class="tags">
			<span class="tag">SvelteKit</span>
			<span class="tag">TensorFlow.js</span>
			<span class="tag">Teachable Machine</span>
			<span class="tag">JavaScript</span>
		</div>
	</footer>
</main>

<style>
	/* Page */
	.page {
		min-height: 100vh;
		padding: 28px;
		background: radial-gradient(1200px 600px at 10% 0%, rgba(0, 83, 155, 0.22), transparent 60%),
			radial-gradient(1200px 600px at 90% 0%, rgba(123, 175, 212, 0.16), transparent 60%),
			#0b1020;
		color: #eaf0ff;
		font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
	}

	.header {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 14px;
		margin-bottom: 24px;
		padding: 18px 0 26px;
	}

	/* Rivalry rule: Duke navy fading into Carolina blue */
	.header::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 2px;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			#00539b,
			rgba(234, 240, 255, 0.18) 50%,
			#7bafd4
		);
	}

	.titleBlock {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	h1 {
		margin: 0;
		font-family: 'Graduate', 'Arial Black', ui-sans-serif, system-ui, sans-serif;
		font-weight: 400;
		font-size: clamp(34px, 6vw, 64px);
		line-height: 1.08;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.team {
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	.team.duke {
		background-image: linear-gradient(180deg, #5aa9ff, #00539b);
		filter: drop-shadow(0 2px 12px rgba(0, 83, 155, 0.45));
	}

	.team.unc {
		background-image: linear-gradient(180deg, #dceefb, #7bafd4);
		filter: drop-shadow(0 2px 12px rgba(123, 175, 212, 0.35));
	}

	.vs {
		font-size: 0.4em;
		letter-spacing: 0.18em;
		color: rgba(234, 240, 255, 0.55);
		vertical-align: 0.35em;
		padding: 0 2px;
	}

	/* Outlined jersey-number treatment for the second line */
	.titleRest {
		display: block;
		margin-top: 6px;
		font-size: 0.5em;
		letter-spacing: 0.14em;
		color: rgba(234, 240, 255, 0.85);
	}

	@supports (-webkit-text-stroke: 1px white) {
		.titleRest {
			color: transparent;
			-webkit-text-stroke: 1.4px rgba(234, 240, 255, 0.55);
		}
	}

	.sub {
		margin: 0;
		color: rgba(234, 240, 255, 0.75);
	}

	.how {
		margin: 2px 0 0;
		font-size: 15px;
		line-height: 1.55;
		max-width: 64ch;
		color: rgba(234, 240, 255, 0.62);
	}

	.actions {
		display: flex;
		gap: 10px;
		align-items: center;
		justify-content: center;
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

	@media (max-width: 640px) {
		.page {
			padding: 16px;
		}
		h1 {
			font-size: 28px;
		}
		.actions,
		.file {
			width: 100%;
		}
		.file {
			text-align: center;
		}
		.scene {
			height: 240px;
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
		min-width: 0;
	}

	.cardTop {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
		flex-wrap: wrap;
	}

	h2 {
		margin: 0;
		font-size: 13px;
		letter-spacing: 0.08em;
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

	.file {
		border: 1px solid rgba(234, 240, 255, 0.25);
		background: linear-gradient(90deg, rgba(0, 83, 155, 0.35), rgba(123, 175, 212, 0.28));
		color: #eaf0ff;
		font-size: 15px;
		font-weight: 600;
		padding: 12px 26px;
		border-radius: 999px;
		cursor: pointer;
		user-select: none;
		transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
		box-shadow: 0 6px 24px rgba(0, 83, 155, 0.25);
	}

	.file:hover:not(.disabled) {
		transform: translateY(-1px);
		border-color: rgba(234, 240, 255, 0.45);
		box-shadow: 0 8px 30px rgba(0, 83, 155, 0.4);
	}

	.file input {
		display: none;
	}

	.file.disabled {
		opacity: 0.5;
		cursor: progress;
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
		border-color: rgba(0, 83, 155, 0.65);
		background: rgba(0, 83, 155, 0.28);
	}

	.badge.unc {
		border-color: rgba(123, 175, 212, 0.55);
		background: rgba(123, 175, 212, 0.2);
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

	.fill.duke {
		background: linear-gradient(90deg, rgba(0, 83, 155, 0.95), rgba(0, 120, 255, 0.9));
	}

	.fill.unc {
		background: linear-gradient(90deg, rgba(123, 175, 212, 0.95), rgba(160, 210, 245, 0.9));
	}

	.notice {
		margin-top: 12px;
		padding: 10px 12px;
		border-radius: 12px;
		border: 1px solid rgba(255, 210, 130, 0.28);
		background: rgba(255, 210, 130, 0.09);
		color: rgba(255, 226, 178, 0.9);
		font-size: 13px;
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
		height: 210px; /* fixed height; growth is scaleY (GPU-smooth, no layout thrash) */
		transform-origin: bottom center;
		transform: translateX(-50%) scaleY(0.24);
		border-radius: 999px;
		background: linear-gradient(to top, rgba(60, 220, 150, 0.95), rgba(25, 140, 85, 0.95));
		filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.35));
		will-change: transform;
		transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1), background 700ms ease;
	}

	.leaf {
		position: absolute;
		width: 70px;
		height: 34px;
		bottom: 155px;
		border-radius: 80px 80px 80px 0;
		background: rgba(70, 230, 160, 0.9);
		filter: drop-shadow(0 10px 10px rgba(0, 0, 0, 0.25));
		will-change: transform, opacity;
		transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease, filter 700ms ease;
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
		will-change: transform, opacity;
		transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms ease, filter 700ms ease;
	}

	@media (prefers-reduced-motion: reduce) {
		.stem,
		.leaf,
		.flower,
		.fill {
			transition: none;
		}
		.fall {
			animation: none;
			opacity: 0;
		}
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

	.footer {
		margin-top: 14px;
	}

	.tags {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.tag {
		font-size: 12px;
		padding: 6px 10px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.05);
		color: rgba(234, 240, 255, 0.65);
	}
</style>