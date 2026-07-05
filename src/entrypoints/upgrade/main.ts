import { createApp } from 'vue';
import { initTheme } from '@/utils/scripts/theme';
import UpgradeNotice from '@/views/UpgradeNotice.vue';
import './style.css';

initTheme();

createApp(UpgradeNotice).mount('#app');
