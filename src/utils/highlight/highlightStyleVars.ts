export type HighlightStyleVars = {
	'--wk-highlight-learned': string;
	'--wk-highlight-not-learned': string;
};

export const DEFAULT_HIGHLIGHT_STYLE_VARS: HighlightStyleVars = {
	'--wk-highlight-learned': '#00aaff',
	'--wk-highlight-not-learned': '#f100a1',
};

export function highlightStyleVarsFromSettings(settings: any): HighlightStyleVars {
	const appearance = settings?.appearance ?? {};
	return {
		'--wk-highlight-learned': appearance.highlight_learned || DEFAULT_HIGHLIGHT_STYLE_VARS['--wk-highlight-learned'],
		'--wk-highlight-not-learned':
			appearance.highlight_not_learned || DEFAULT_HIGHLIGHT_STYLE_VARS['--wk-highlight-not-learned'],
	};
}

export function srsAppearanceVarsFromSettings(settings: any): Record<string, string> {
	const appearance = settings?.appearance ?? {};
	return {
		'--int-color': appearance.int_color || '#c1c0c1',
		'--ap1-color': appearance.ap1_color || '#cf72b0',
		'--ap2-color': appearance.ap2_color || '#d560ad',
		'--ap3-color': appearance.ap3_color || '#db44a9',
		'--ap4-color': appearance.ap4_color || '#dd0093',
		'--gr1-color': appearance.gr1_color || '#894e97',
		'--gr2-color': appearance.gr2_color || '#882d9e',
		'--mst-color': appearance.mst_color || '#294ddb',
		'--enl-color': appearance.enl_color || '#0093dd',
		'--brn-color': appearance.brn_color || '#e20000',
	};
}
