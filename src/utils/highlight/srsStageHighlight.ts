import { srsStages } from '@/utils/scripts/wanikani';

/** Keys used in highlight data maps and `data-wkh-srs` attributes. */
export type SrsStageKey = 'locked' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export const SRS_STAGE_KEYS: SrsStageKey[] = [
	'locked', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
];

export type SrsStageSection = {
	key: SrsStageKey;
	label: string;
	appearanceKey:
		| 'int_color'
		| 'ap1_color'
		| 'ap2_color'
		| 'ap3_color'
		| 'ap4_color'
		| 'gr1_color'
		| 'gr2_color'
		| 'mst_color'
		| 'enl_color'
		| 'brn_color'
		| null;
	fallbackColor: string;
};

/** Display order and labels for SRS-stage list sections and CSS generation. */
export const SRS_STAGE_SECTIONS: SrsStageSection[] = [
	{ key: 'locked', label: 'Locked', appearanceKey: null, fallbackColor: '#888888' },
	{ key: '0', label: srsStages[0].name, appearanceKey: 'int_color', fallbackColor: srsStages[0].color },
	{ key: '1', label: srsStages[1].name, appearanceKey: 'ap1_color', fallbackColor: srsStages[1].color },
	{ key: '2', label: srsStages[2].name, appearanceKey: 'ap2_color', fallbackColor: srsStages[2].color },
	{ key: '3', label: srsStages[3].name, appearanceKey: 'ap3_color', fallbackColor: srsStages[3].color },
	{ key: '4', label: srsStages[4].name, appearanceKey: 'ap4_color', fallbackColor: srsStages[4].color },
	{ key: '5', label: srsStages[5].name, appearanceKey: 'gr1_color', fallbackColor: srsStages[5].color },
	{ key: '6', label: srsStages[6].name, appearanceKey: 'gr2_color', fallbackColor: srsStages[6].color },
	{ key: '7', label: srsStages[7].name, appearanceKey: 'mst_color', fallbackColor: srsStages[7].color },
	{ key: '8', label: srsStages[8].name, appearanceKey: 'enl_color', fallbackColor: srsStages[8].color },
	{ key: '9', label: srsStages[9].name, appearanceKey: 'brn_color', fallbackColor: srsStages[9].color },
];

export function srsStageKeyFromSubject(subject: { assignment?: { srs_stage?: number | null } | null }): SrsStageKey {
	const srs = subject.assignment?.srs_stage;
	if (srs == null || srs < 0) return 'locked';
	if (srs > 9) return '9';
	return String(srs) as SrsStageKey;
}

export function srsStageKeyFromItem(item: { srsStage?: number | null | undefined }): SrsStageKey {
	if (item.srsStage == null || item.srsStage < 0) return 'locked';
	if (item.srsStage > 9) return '9';
	return String(item.srsStage) as SrsStageKey;
}

export function getSrsStageColor(
	stageKey: SrsStageKey,
	appearance: Record<string, string> = {},
): string {
	const section = SRS_STAGE_SECTIONS.find(entry => entry.key === stageKey);
	if (!section) return '#888888';
	if (!section.appearanceKey) return section.fallbackColor;
	return appearance[section.appearanceKey] || section.fallbackColor;
}

export function buildStageColorMap(appearance: Record<string, string> = {}): Record<SrsStageKey, string> {
	return Object.fromEntries(
		SRS_STAGE_KEYS.map(key => [key, getSrsStageColor(key, appearance)]),
	) as Record<SrsStageKey, string>;
}

export function createEmptyKanjiByStage(): Record<SrsStageKey, string> {
	return Object.fromEntries(SRS_STAGE_KEYS.map(key => [key, ''])) as Record<SrsStageKey, string>;
}

export function createEmptyVocabByStage(): Record<SrsStageKey, string[]> {
	return Object.fromEntries(SRS_STAGE_KEYS.map(key => [key, []])) as Record<SrsStageKey, string[]>;
}

/** Build CSS rules coloring `[data-wkh-srs]` spans per stage. */
export function buildSrsStageCss(styleClass: string, appearance: Record<string, string> = {}): string {
	const rules: string[] = [];

	for (const section of SRS_STAGE_SECTIONS) {
		const color = getSrsStageColor(section.key, appearance);
		const selector = `.${styleClass}[data-wkh-srs="${section.key}"]`;

		if (styleClass.endsWith('_underlined')) {
			rules.push(`${selector} { border-bottom: 2px solid ${color} !important; color: inherit !important; background: transparent !important; }`);
		} else if (styleClass.endsWith('_bold')) {
			rules.push(`${selector} { color: ${color} !important; font-weight: bold !important; background: transparent !important; }`);
		} else if (styleClass.endsWith('_nostyle')) {
			rules.push(`${selector} { cursor: pointer; }`);
		} else {
			rules.push(`${selector} { background-color: ${color} !important; }`);
		}
	}

	return rules.join('\n');
}
