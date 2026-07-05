export type Theme = 'light' | 'dark';

type ThemeColors = {
	background: string;
	default: string;
	fill: string;
	font: string;
	'font-sec': string;
	border: string;
	highlight: string;
	fade: string;
	'checkbox-back': string;
	'surface-border': string;
	'surface-muted': string;
	'surface-subtle': string;
	'row-border': string;
	'input-bg': string;
	'input-text': string;
	muted: string;
	'tab-inactive': string;
	'tab-border': string;
	'scrollbar-track': string;
	success: string;
	'success-muted': string;
	error: string;
	'danger-bg': string;
	'danger-border': string;
	'shadow-soft': string;
	'accent-badge': string;
	'chart-arrow': string;
	'neutral-button-bg': string;
	'neutral-button-border': string;
	'mock-surface': string;
	'mock-text': string;
	'flaming-text': string;
};

/** Interface colors ported from v1.5 (`scripts/static.js`). */
export const INTERFACE_COLORS: Record<Theme, ThemeColors> = {
	light: {
		background: '#ffffff',
		default: '#2a2d48',
		fill: '#fff',
		font: '#343434',
		'font-sec': '#747474',
		border: '#c0c0c0',
		highlight: '#91a1f0',
		fade: '#d8d8d8',
		'checkbox-back': '#c770aa',
		'surface-border': '#e6e6ef',
		'surface-muted': '#f7f7fb',
		'surface-subtle': '#fafafa',
		'row-border': '#efeff4',
		'input-bg': '#e4e4e4',
		'input-text': '#000000',
		muted: '#7c7c7c',
		'tab-inactive': '#666666',
		'tab-border': '#e8e8e8',
		'scrollbar-track': 'silver',
		success: '#6ecf8a',
		'success-muted': '#eefbf2',
		error: '#c0392b',
		'danger-bg': '#c0392b',
		'danger-border': '#a93226',
		'shadow-soft': 'rgba(42, 45, 72, 0.08)',
		'accent-badge': '#ffd4ef',
		'chart-arrow': '#aaaaaa',
		'neutral-button-bg': '#7a7a7a',
		'neutral-button-border': '#999999',
		'mock-surface': '#ececf2',
		'mock-text': '#383838',
		'flaming-text': '#d40000',
	},
	dark: {
		background: '#25252c',
		default: '#13131b',
		fill: '#212128',
		font: '#dcdcdc',
		'font-sec': '#b4b4b4',
		border: '#b8b8b8',
		highlight: '#91a1f0',
		fade: '#747474',
		'checkbox-back': '#773962',
		'surface-border': '#3a3a44',
		'surface-muted': '#2a2a32',
		'surface-subtle': '#1e1e24',
		'row-border': '#3a3a44',
		'input-bg': '#3a3a42',
		'input-text': '#dcdcdc',
		muted: '#9a9a9a',
		'tab-inactive': '#b4b4b4',
		'tab-border': '#3a3a44',
		'scrollbar-track': '#3a3a44',
		success: '#5cb876',
		'success-muted': '#1e2e24',
		error: '#e57373',
		'danger-bg': '#8b2e26',
		'danger-border': '#6d231c',
		'shadow-soft': 'rgba(0, 0, 0, 0.35)',
		'accent-badge': '#ffd4ef',
		'chart-arrow': '#888888',
		'neutral-button-bg': '#4a4a54',
		'neutral-button-border': '#666666',
		'mock-surface': '#2a2a32',
		'mock-text': '#dcdcdc',
		'flaming-text': '#ff6b6b',
	},
};

const STORAGE_KEY = 'theme';

let iconStyleElement: HTMLStyleElement | null = null;

function applyThemeColors(theme: Theme): void {
	const colors = INTERFACE_COLORS[theme];
	const root = document.documentElement;

	root.dataset.theme = theme;
	root.style.setProperty('--body-color', colors.background);
	root.style.setProperty('--default-color', colors.default);
	root.style.setProperty('--fill-color', colors.fill);
	root.style.setProperty('--font-color', colors.font);
	root.style.setProperty('--font-sec-color', colors['font-sec']);
	root.style.setProperty('--border-color', colors.border);
	root.style.setProperty('--highlight', colors.highlight);
	root.style.setProperty('--link', colors.highlight);
	root.style.setProperty('--fade', colors.fade);
	root.style.setProperty('--checkbox-back', colors['checkbox-back']);
	root.style.setProperty('--surface-border-color', colors['surface-border']);
	root.style.setProperty('--surface-muted-color', colors['surface-muted']);
	root.style.setProperty('--surface-subtle-color', colors['surface-subtle']);
	root.style.setProperty('--row-border-color', colors['row-border']);
	root.style.setProperty('--input-bg-color', colors['input-bg']);
	root.style.setProperty('--input-text-color', colors['input-text']);
	root.style.setProperty('--muted-color', colors.muted);
	root.style.setProperty('--tab-inactive-color', colors['tab-inactive']);
	root.style.setProperty('--tab-border-color', colors['tab-border']);
	root.style.setProperty('--scrollbar-track-color', colors['scrollbar-track']);
	root.style.setProperty('--success-color', colors.success);
	root.style.setProperty('--success-muted-color', colors['success-muted']);
	root.style.setProperty('--error-color', colors.error);
	root.style.setProperty('--danger-bg-color', colors['danger-bg']);
	root.style.setProperty('--danger-border-color', colors['danger-border']);
	root.style.setProperty('--shadow-soft-color', colors['shadow-soft']);
	root.style.setProperty('--accent-badge-color', colors['accent-badge']);
	root.style.setProperty('--chart-arrow-color', colors['chart-arrow']);
	root.style.setProperty('--neutral-button-bg-color', colors['neutral-button-bg']);
	root.style.setProperty('--neutral-button-border-color', colors['neutral-button-border']);
	root.style.setProperty('--mock-surface-color', colors['mock-surface']);
	root.style.setProperty('--mock-text-color', colors['mock-text']);
	root.style.setProperty('--flaming-text-color', colors['flaming-text']);

	if (!iconStyleElement) {
		iconStyleElement = document.createElement('style');
		iconStyleElement.id = 'wkh-theme-icons';
		document.head.appendChild(iconStyleElement);
	}

	iconStyleElement.textContent = theme === 'dark'
		? '.icon { opacity: 0.7; filter: invert(1) !important; }'
		: '.icon { opacity: 0.7; filter: unset !important; }';
}

export function getTheme(): Theme {
	return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
	applyThemeColors(theme);
	localStorage.setItem(STORAGE_KEY, theme);
}

export function toggleTheme(): Theme {
	const next: Theme = getTheme() === 'light' ? 'dark' : 'light';
	setTheme(next);
	return next;
}

export function initTheme(): void {
	setTheme(getTheme());
}

export function getThemeToggleIcon(): 'dark' | 'light' {
	return getTheme() === 'light' ? 'dark' : 'light';
}

export function getThemeToggleLabel(): string {
	return getTheme() === 'light' ? 'Dark' : 'Light';
}
