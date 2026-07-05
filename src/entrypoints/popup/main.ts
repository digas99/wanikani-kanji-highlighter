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

async function bootstrap() {
	const pinia = createPinia();
	const app = createApp(App);
	app.use(pinia);
	app.use(router);

	const settings = useSettingsStore();
	const wk = useWKStore();

	await migrateFromV15IfNeeded();
	await settings.init();
	await loadSchoolKanjiMaps();
	await wk.init({ bootstrap: true });

	app.mount('#app');
	void wk.continueStartupIfNeeded();
}

void bootstrap();
