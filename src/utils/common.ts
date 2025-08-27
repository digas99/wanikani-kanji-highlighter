interface Item {
	subject_type: string;
	srs_stage: string;
	[id: string]: any;
}

interface GroupedItem {
	id: string;
	items: Item[];
}

export const groupByType = (items: Item[]): GroupedItem[] => {
	return items.reduce((acc: GroupedItem[], item: Item): GroupedItem[] => {
		const type: string = item.subject_type === "kana_vocabulary" ? "vocabulary" : item.subject_type;
		if (!acc.find((i: GroupedItem) => i.id === type)) {
			acc.push({ id: type, items: [] });
		}
		acc.find((i: GroupedItem) => i.id === type)!.items.push(item);
		return acc;
	}, []);
}

export const groupBySRSStage = (items: Item[]): GroupedItem[] => {
	return items.reduce((acc: GroupedItem[], item: Item): GroupedItem[] => {
		const stage: string = item.srs_stage;
		if (!acc.find((i: GroupedItem) => i.id === stage)) {
			acc.push({ id: stage, items: [] });
		}
		acc.find((i: GroupedItem) => i.id === stage)!.items.push(item);
		return acc;
	}, []);
};