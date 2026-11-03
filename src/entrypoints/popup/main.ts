import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from '@/router';
import { useWKStore } from '@/stores';
import { useSettingsStore } from '@/stores/settings';
import { loadSchoolKanjiMaps } from '@/utils/scripts/schoolKanji';
import { migrateFromV15IfNeeded } from '@/utils/scripts/migrateFromV15';
import { initTheme } from '@/utils/scripts/theme';
import './style.css';
import App from './App.vue';

initTheme();

/**
 * The content ends where the sidebar starts. The sidebar is pinned to the window's right
 * edge, which a page scrollbar moves (desktop), and on phones the window is narrower than
 * the 470px page (the browser zooms out; `clientWidth` is then the phone's width, not the
 * page's). So it's measured from the sidebar itself: its right edge minus its resting width
 * (it widens while expanded).
 */
function trackContentWidth() {
	const root = document.documentElement;
	const update = () => {
		// a window wider than the popup (a tab, popped out): the page is a popup-wide column in
		// its middle; what's pinned to the window moves in by these (0 in the popup itself)
		const body = document.body?.getBoundingClientRect();
		const frameLeft = body ? Math.max(0, Math.round(body.left)) : 0;
		const frameRight = body ? Math.max(0, Math.round(root.clientWidth - body.right)) : 0;
		root.style.setProperty('--frame-left', `${frameLeft}px`);
		root.style.setProperty('--frame-right', `${frameRight}px`);
		const sidebar = document.querySelector('.side-panel');
		const sidebarWidth = parseFloat(getComputedStyle(root).getPropertyValue('--sidebar-width')) || 45;
		const width = sidebar
			? sidebar.getBoundingClientRect().right - sidebarWidth - frameLeft
			: root.clientWidth - sidebarWidth - frameLeft - frameRight;
		root.style.setProperty('--content-width', `${Math.round(width)}px`);
	};
	update();
	// the scrollbar comes and goes with the page's length; the window can be resized; the
	// sidebar appears once the app is ready (the body grows then)
	const observer = new ResizeObserver(update);
	observer.observe(root);
	observer.observe(document.body);
}

trackContentWidth();

async function bootstrap() {
	const pinia = createPinia();
	const app = createApp(App);
	app.use(pinia);
	app.use(router);

	const settings = useSettingsStore();
	const wk = useWKStore();

	await migrateFromV15IfNeeded();
	await settings.init();

	// School kanji maps come from extension storage (fast) or kanjiapi.dev (slow,
	// first run / every 30 days). Don't keep the popup blank on the network:
	// bundled maps are used until the fresh ones arrive.
	const schoolMaps = loadSchoolKanjiMaps();
	const mapsReadyInTime = await Promise.race([
		schoolMaps.then(() => true, () => true),
		new Promise<boolean>(resolve => setTimeout(() => resolve(false), 300)),
	]);

	await wk.init({ bootstrap: true });

	app.mount('#app');
	// the startup placeholder is gone: drop its theme hint (popup-boot-theme.js), so
	// it doesn't hold the dark background if the theme is switched later
	document.documentElement.removeAttribute('data-boot-theme');
	void wk.continueStartupIfNeeded();

	if (!mapsReadyInTime) {
		void schoolMaps.then(() => wk.refreshSchoolGrades()).catch(() => {});
	}
}

void bootstrap();
