import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { initTheme } from '@/utils/scripts/theme';
import './style.css';
import App from './App.vue';

initTheme();

const app = createApp(App);
// shared components can touch stores; the panel itself reads settings from storage
app.use(createPinia());
app.mount('#app');
