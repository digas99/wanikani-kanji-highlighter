/** The sections of the popup's Home page, in their default order. */
export const HOME_SECTIONS = [
	{ id: 'hero', label: 'Level, lessons, reviews & today' },
	{ id: 'progress', label: 'Progress overview' },
	{ id: 'levels', label: 'Levels in progress' },
	{ id: 'activity', label: 'Activity' },
	{ id: 'school', label: 'School kanji (JLPT / Jōyō)' },
	{ id: 'highlighted', label: 'Highlighted on this page' },
] as const;

export type HomeSectionId = typeof HOME_SECTIONS[number]['id'];

export type HomeLayoutSettings = { order: string[]; hidden: string[] };

export const DEFAULT_HOME_ORDER: HomeSectionId[] = HOME_SECTIONS.map(section => section.id);

/**
 * Saved order + visibility → every section once, in order. Sections added in later
 * versions (not in a saved order yet) go where they are in the default order.
 */
export function resolveHomeLayout(layout?: Partial<HomeLayoutSettings> | null) {
	const known = new Set<string>(DEFAULT_HOME_ORDER);
	const saved = (layout?.order ?? []).filter(id => known.has(id));
	const order = [...saved];
	DEFAULT_HOME_ORDER.forEach((id, index) => {
		if (order.includes(id)) return;
		// after the section that precedes it by default (or at the start)
		const previous = DEFAULT_HOME_ORDER.slice(0, index).reverse().find(other => order.includes(other));
		order.splice(previous ? order.indexOf(previous) + 1 : 0, 0, id);
	});
	const hidden = new Set(layout?.hidden ?? []);
	return order.map(id => ({
		id: id as HomeSectionId,
		label: HOME_SECTIONS.find(section => section.id === id)!.label,
		visible: !hidden.has(id),
	}));
}
