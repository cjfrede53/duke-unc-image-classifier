import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Static adapter for GitHub Pages: prerenders the app to plain HTML/JS/CSS.
		adapter: adapter({
			fallback: '404.html' // SPA-style fallback so deep links don't 404 on Pages
		}),
		paths: {
			// On GitHub Pages the site lives at https://<user>.github.io/<repo>/,
			// so the CI workflow sets BASE_PATH to "/<repo>". Locally it stays "".
			base: process.env.BASE_PATH || ''
		}
	}
};

export default config;