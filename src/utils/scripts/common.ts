interface Item {
	subject_type: string;
	srs_stage: string;
	[id: string]: any;
}

interface GroupedItem {
	id: string;
	items: Item[];
}

/** Radical → kanji → vocabulary display order. */
export const SUBJECT_TYPE_ORDER = ['radical', 'kanji', 'vocabulary'] as const;

export const groupByType = (items: Item[]): GroupedItem[] => {
	const byType = new Map<string, Item[]>();

	for (const item of items) {
		const subjectType = item.subject_type || item.type;
		const type = subjectType === 'kana_vocabulary' ? 'vocabulary' : subjectType;
		if (!byType.has(type)) byType.set(type, []);
		byType.get(type)!.push(item);
	}

	return SUBJECT_TYPE_ORDER
		.filter(type => byType.has(type))
		.map(type => ({ id: type, items: byType.get(type)! }));
};

export const groupBySRSStage = (items: Item[]): GroupedItem[] => {
	return items.reduce((acc: GroupedItem[], item: Item): GroupedItem[] => {
		let stage: string | number = item.srs_stage ?? item.assignment?.srs_stage;
		if (stage === undefined || stage === null)
			stage = "-1";

		const stageId = String(stage);
		if (!acc.find((i: GroupedItem) => i.id === stageId)) {
			acc.push({ id: stageId, items: [] });
		}
		acc.find((i: GroupedItem) => i.id === stageId)!.items.push(item);
		return acc;
	}, []);
};

/** SRS stage ids shown on the Home dashboard (Initiate → Burned). */
export const SRS_STAGE_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Group assignments into all SRS stages, including empty Initiate (0). */
export const groupAssignmentsBySRSStage = (items: Item[] = []): Array<{ id: number; items: Item[] }> => {
	const byStage = new Map<number, Item[]>(SRS_STAGE_IDS.map(id => [id, []]));

	for (const item of items) {
		const raw = item.srs_stage ?? item.assignment?.srs_stage;
		if (raw === undefined || raw === null) continue;
		const stage = Number(raw);
		if (!byStage.has(stage)) continue;
		byStage.get(stage)!.push(item);
	}

	return SRS_STAGE_IDS.map(id => ({ id, items: byStage.get(id)! }));
};

/** Collapse Guru+ SRS stages and passed items into stage 5 (levels-in-progress bars). */
export const wrapSubjectsToStage5 = (items: Item[]): Item[] =>
	items.map(item => {
		const stage = item.srs_stage ?? item.assignment?.srs_stage;
		const wrapStage = (stage >= 5 && stage < 10) || item.assignment?.passed_at;
		return { ...item, srs_stage: wrapStage ? 5 : stage };
	});

export const groupByLevel = (items: Item[]): GroupedItem[] => {
	return items.reduce((acc: GroupedItem[], item: Item): GroupedItem[] => {
		const level: string = `${item.level}`;
		if (!acc.find((i: GroupedItem) => i.id === level)) {
			acc.push({ id: level, items: [] });
		}
		acc.find((i: GroupedItem) => i.id === level)!.items.push(item);
		return acc;
	}, []);
}

export const correctnessColor = (percentage: number): string => {
	if (percentage >= 90) return "#00ff00"; // Green
	if (percentage >= 75) return "#aaff00"; // Yellow-Green
	if (percentage >= 50) return "#ffff00"; // Yellow
	if (percentage >= 25) return "#ffaa00"; // Orange
	return "#ff0000"; // Red
}