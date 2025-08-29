export const srsStages = {
	0: {name:"Initiate", short: "Int", color: "#c1c0c1"},
	1: {name:"Apprentice I", short: "Ap1", color: "#cf72b0"},
	2: {name:"Apprentice II", short: "Ap2", color: "#d560ad"},
	3: {name:"Apprentice III", short: "Ap3", color: "#db44a9"},
	4: {name:"Apprentice IV", short: "Ap4", color: "#dd0093"},
	5: {name:"Guru I", short: "Gr1", color: "#894e97"},
	6: {name:"Guru II", short: "Gr2", color: "#882d9e"},
	7: {name:"Master", short: "Mst", color: "#294ddb"},
	8: {name:"Enlightened", short: "Enl", color: "#0093dd"},
	9: {name:"Burned", short: "Brn", color: "#e20000"}
};

export const typeColors = {
	"radical": "#00a1f1",
	"kanji": "#f100a1",
	"vocabulary": "#a100f1",
	"kana_vocabulary": "#a100f1"
};

export const subjectDisplay = {
	srsStageName(item: any, srsStages: any) {
		const stage = item?.assignment?.srs_stage;
		if (!stage) return "Locked";
		return srsStages[stage]?.name || "Locked";
	},
	srsStageColor(item: any, srsStages: any) {
		const stage = item?.assignment?.srs_stage;
		if (!stage) return "#888";
		return srsStages[stage]?.color || "#888";
	},
	partsOfSpeech(item: any) {
		return item.parts_of_speech.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
	},
	joinMeanings(item: any) {
		return item.meanings.map((m: any) => m.meaning).join(', ');
	},
	onyomiReadings(item: any) {
		return item.readings.filter((r: any) => r.type === 'onyomi').map((r: any) => r.reading).join(', ');
	},
	kunyomiReadings(item: any) {
		return item.readings.filter((r: any) => r.type === 'kunyomi').map((r: any) => r.reading).join(', ');
	},
	readings(item: any) {
		return item.readings.map((r: any) => r.reading).join(', ');
	},
	filterByType(item: any, type: string) {
		let itemType = item.type === 'kana_vocabulary' ? 'vocabulary' : item.type;
		return itemType === type;
	}
}