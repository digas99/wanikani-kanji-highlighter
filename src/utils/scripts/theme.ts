export type Theme = 'light' | 'dark';

type ThemeColors = {
	background: string;
	default: string;
	fill: string;
	font: string;
	/** Titles / emphasized text on the page background (navy in light, near-white in dark). */
	heading: string;
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
		// soft off-white page so white cards stand out (like the details popup's cards)
		background: '#f3f3f8',
		default: '#2a2d48',
		fill: '#fff',
		font: '#343434',
		heading: '#2a2d48',
		'font-sec': '#6f7187',
		border: '#cfd0dc',
		highlight: '#91a1f0',
		fade: '#d8d8e2',
		'checkbox-back': '#c770aa',
		'surface-border': '#e4e4ee',
		'surface-muted': '#f1f1f7',
		'surface-subtle': '#f7f7fb',
		'row-border': '#ececf3',
		'input-bg': '#ececf3',
		'input-text': '#1d1f33',
		muted: '#7a7c92',
		'tab-inactive': '#6f7187',
		'tab-border': '#e4e4ee',
		'scrollbar-track': 'transparent',
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
	// Deep navy family, the same as the subject details popup (instead of neutral near-black).
	dark: {
		background: '#171928',
		default: '#262940',
		fill: '#1f2134',
		font: '#e1e2ec',
		heading: '#f0f0f6',
		'font-sec': '#a6a9c2',
		border: '#4a4e70',
		highlight: '#9fadf3',
		fade: '#3d4061',
		'checkbox-back': '#773962',
		'surface-border': '#33365a',
		'surface-muted': '#292c46',
		'surface-subtle': '#1b1d2f',
		'row-border': '#2d3050',
		'input-bg': '#2c2f4b',
		'input-text': '#e1e2ec',
		muted: '#9598b3',
		'tab-inactive': '#a6a9c2',
		'tab-border': '#33365a',
		'scrollbar-track': 'transparent',
		success: '#5cb876',
		'success-muted': '#1d3029',
		error: '#ef7b7b',
		'danger-bg': '#8b2e3a',
		'danger-border': '#6d2330',
		'shadow-soft': 'rgba(0, 0, 0, 0.35)',
		'accent-badge': '#ffd4ef',
		'chart-arrow': '#8f92ad',
		'neutral-button-bg': '#3c4062',
		'neutral-button-border': '#52577d',
		'mock-surface': '#292c46',
		'mock-text': '#e1e2ec',
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
	root.style.setProperty('--heading-color', colors.heading);
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

export const THEME_CHANGE_EVENT = 'wkh:theme-change';

export function setTheme(theme: Theme): void {
	applyThemeColors(theme);
	localStorage.setItem(STORAGE_KEY, theme);
	// Canvas charts read their colors when drawn: let them redraw.
	window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
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
