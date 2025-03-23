const WANIKANI_COLOR = "#f100a1";
const WANIKANI_SEC_COLOR = "#00aaff";

export const urls = {
	wanikani: "https://www.wanikani.com",
	wanikani_api: "https://api.wanikani.com/v2",

	kanji_strokes: {
		popup: "https://kanji.wkhighlighter.com/",
		web: "https://kanji.wkhighlighter.com/"
	},
	github_api: "https://api.github.com"
};

export const wanikaniStatics = {
	srsStages: {
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
	},

	WANIKANI_COLOR,
	WANIKANI_SEC_COLOR,

	patterns: {
		wanikani: {
			highlight_learned: WANIKANI_SEC_COLOR,
			highlight_not_learned: WANIKANI_COLOR,
			details_popup: "#404040",
			radical_color: "#00a1f1",
			kanji_color: "#f100a1",
			vocab_color: "#a100f1",
			ap1_color: "#cf72b0",
			ap2_color: "#d560ad",
			ap3_color: "#db44a9",
			ap4_color: "#dd0093",
			gr1_color: "#894e97",
			gr2_color: "#882d9e",
			mst_color: "#294ddb",
			enl_color: "#0093dd",
			brn_color: "#e20000",
			int_color: "#c1c0c1"
		},
		flaming_durtles: {
			highlight_learned: WANIKANI_SEC_COLOR,
			highlight_not_learned: WANIKANI_COLOR,
			details_popup: "#404040",
			radical_color: "#65b6ae",
			kanji_color: "#e7e485",
			vocab_color: "#fc759b",
			ap1_color: "#7dc9fb",
			ap2_color: "#5db9fa",
			ap3_color: "#3da8f6",
			ap4_color: "#1d99f3",
			gr1_color: "#4edeac",
			gr2_color: "#1cdc9a",
			mst_color: "#c9ce3b",
			enl_color: "#f67400",
			brn_color: "#d53b49",
			int_color: "#c1c0c1"
		},
		grays: {
			highlight_learned: "#6B6B6B",
			highlight_not_learned: "#1E1E1E",
			details_popup: "#404040",
			radical_color: "#9E9E9E",
			kanji_color: "#757575",
			vocab_color: "#505050",
			ap1_color: "#C0C0C0",
			ap2_color: "#808080",
			ap3_color: "#6D6D6D",
			ap4_color: "#474747",
			gr1_color: "#708090",
			gr2_color: "#4c6073",
			mst_color: "#36454F",
			enl_color: "#2C3E50",
			brn_color: "#293133",
			int_color: "#B2BEB5",
		}
	},

	// Wanikani SRS stage intervals in ms (only for Apprentice stages)
	SRS_STAGE_INTERVALS: {
		0: 0,
		1: 14400000,
		2: 28800000,
		3: 82800000,
		4: 169200000,
	}
};

export const defaultSettings = {
	"kanji_details_popup": {
		activated: true,
		random_subject: "Any",
		key_bindings: true,
		popup_opacity: 8,
		popup_width: 270,
		subject_drawing: true,
		audio_autoplay: false
	},
	"extension_icon": {
		kanji_counter: true,
		// time_until_next_reviews: false
	},
	"notifications": {
		new_reviews: false,
		practice_reminder: false,
		practice_reminder_timestamp: "21:30",
		searching_a_webpage_word: true
	},
	"highlight_style": {
		learned: "wkhighlighter_highlighted",
		not_learned: "wkhighlighter_highlightedNotLearned",
	},
	"search": {
		targeted_search: false,
		results_display: "searchResultOptionlist",
		disabled_subjects: true,
		radicals: true,
		kanji: true,
		vocabulary: true,
		passed: true,
		locked: true,
		in_progress: true,
	},
	"appearance": {
		highlight_learned: WANIKANI_SEC_COLOR,
		highlight_not_learned: WANIKANI_COLOR,
		details_popup: "#404040",
		radical_color: "#00a1f1",
		kanji_color: "#f100a1",
		vocab_color: "#a100f1",
		int_color: wanikaniStatics.srsStages[0].color,
		ap1_color: wanikaniStatics.srsStages[1].color,
		ap2_color: wanikaniStatics.srsStages[2].color,
		ap3_color: wanikaniStatics.srsStages[3].color,
		ap4_color: wanikaniStatics.srsStages[4].color,
		gr1_color: wanikaniStatics.srsStages[5].color,
		gr2_color: wanikaniStatics.srsStages[6].color,
		mst_color: wanikaniStatics.srsStages[7].color,
		enl_color: wanikaniStatics.srsStages[8].color,
		brn_color: wanikaniStatics.srsStages[9].color
	},
	"assignments": {
		srsMaterialsDisplay: {
			0: true,
			1: true,
			2: true,
			3: true,
			4: true,
			5: true,
			6: true,
			7: true,
			8: true,
			9: true,
		}
	},
	"miscellaneous": {
		time_in_12h_format: true,
		update_interval: 60,
		background_updates: true,
		sidebar_animation: true,
		//extension_popup_width: 400,
		// srs_info_on_reviews: false
	},
	"sizes": {
		highlighted_kanji_height: 150,
		reviews_list_height: 235,
		lessons_list_height: 450
	},
	"extension_popup_interface": {
		scripts_status: true,
		search_bar: true,
		highlighted_kanji: true,
		lessons_and_reviews: true,
		overall_progression_bar: true,
		overall_progression_stats: true,
		levels_in_progress: true,
		jlpt_kanji_progress: true,
		joyo_kanji_progress: true,
	},
	"home_page": {
		"page": null
	},
	"profile_menus": {
		"all": {
			"opened": true,
			"menu": {
				"color_by": "Subject Type",
				"reviews_info": true,
				"disabled_subjects": true
			},
			"filter": {
				"srs_stage": "None",
				"state": "None"
			},
			"sort": {
				"type": "None",
				"direction": "Ascending"
			}
		},
		"radical": {
			"opened": true,
			"menu": {
				"color_by": "Subject Type",
				"reviews_info": true,
				"disabled_subjects": true
			},
			"filter": {
				"srs_stage": "None",
				"state": "None"
			},
			"sort": {
				"type": "None",
				"direction": "Ascending"
			}
		},
		"kanji": {
			"opened": true,
			"menu": {
				"color_by": "Subject Type",
				"reviews_info": true,
				"disabled_subjects": true
			},
			"filter": {
				"srs_stage": "None",
				"state": "None"
			},
			"sort": {
				"type": "None",
				"direction": "Ascending"
			}
		},
		"vocabulary": {
			"opened": true,
			"menu": {
				"color_by": "Subject Type",
				"reviews_info": true,
				"disabled_subjects": true
			},
			"filter": {
				"srs_stage": "None",
				"state": "None"
			},
			"sort": {
				"type": "None",
				"direction": "Ascending"
			}
		}
	}
};

const storageKeys = {
	REVIEWS: "reviews",
	LESSONS: "lessons",
	
	RADICAL_PROGRESS: "radical_progress",
	KANJI_PROGRESS: "kanji_progress",
	VOCABULARY_PROGRESS: "vocabulary_progress",
	KANA_VOCABULARY_PROGRESS: "kana_vocabulary_progress",
	
	RADICAL_SIZE: "radicals_size",
	KANJI_SIZE: "kanji_size",
	VOCABULARY_SIZE: "vocabulary_size",
	KANA_VOCAB_SIZE: "kana_vocab_size",

	RADICAL_LEVELS: "radical_levelsInProgress",
	KANJI_LEVELS: "kanji_levelsInProgress",
	VOCAB_LEVELS: "vocabulary_levelsInProgress",
	KANA_VOCAB_LEVELS: "kana_vocabulary_levelsInProgress",

	KANJI_ASSOC: "kanji_assoc",

	HIGHLIGHTED_KANJI: "highlighted_kanji",

	SETTINGS: "settings",
	USER_INFO: "userInfo"
};

export const appSetup = {
	unwantedTags: ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"],
	urlChecker: new RegExp("^(chrome|devtools)(-[a-zA-Z0-9]+)?:\/\/"),
	defaultWindowSize: 420,

	data: {
		storage: {
			keys: storageKeys,
			
			ASSIGNMENTS: [storageKeys.REVIEWS, storageKeys.LESSONS],
			PROGRESS: [storageKeys.RADICAL_PROGRESS, storageKeys.KANJI_PROGRESS, storageKeys.VOCABULARY_PROGRESS, storageKeys.KANA_VOCABULARY_PROGRESS, storageKeys.RADICAL_SIZE, storageKeys.KANJI_SIZE, storageKeys.VOCABULARY_SIZE, storageKeys.KANA_VOC_SIZE, storageKeys.RADICAL_LEVELS, storageKeys.KANJI_LEVELS, storageKeys.VOCAB_LEVELS, storageKeys.KANA_VOCAB_LEVELS],
			HIGHLIGHTED: [storageKeys.KANJI_ASSOC, storageKeys.HIGHLIGHTED_KANJI],
		},


		RADICAL: {
			name: "radicals",
			endpoint: `${urls.wanikani_api}/subjects?types=radical`,
			storage: {
				id: "radical",
				updated: "radicals_updated",
				level: "radical_level",
				association: "radical_assoc",
				size: "radicals_size"
			}
		},
		VOCABULARY: {
			name: "vocabulary",
			endpoint: `${urls.wanikani_api}/subjects?types=vocabulary`,
			storage: {
				id: "vocabulary",
				updated: "vocabulary_updated",
				level: "vocab_level",
				association: "vocabulary_assoc",
				size: "vocabulary_size"
			}
		},
		KANA_VOCABULARY: {
			name: "kana vocabulary",
			endpoint: `${urls.wanikani_api}/subjects?types=kana_vocabulary`,
			storage: {
				id: "kana_vocabulary",
				updated: "kana_vocab_updated",
				level: "kanavocab_level",
				association: "kana_vocab_assoc",
				size: "kana_vocab_size"
			}
		},
		KANJI: {
			name: "kanji",
			endpoint: `${urls.wanikani_api}/subjects?types=kanji`,
			storage: {
				id: "kanji",
				updated: "kanji_updated",
				level: "kanji_level",
				association: "kanji_assoc",
				size: "kanji_size"
			},
			jlpt: true,
			joyo: true
		},
		ASSIGNMENTS: {
			endpoint: `${urls.wanikani_api}/assignments`,
			storage: {
				id: "assignments",
				updated: "assignments_updated"
			}
		},
		REVIEWSTATS: {
			endpoint: `${urls.wanikani_api}/review_statistics`,
			storage: {
				updated: "reviewStats_updated"
			}
		},
		LEVELS_STATS: {
			endpoint: `${urls.wanikani_api}/level_progressions`,
			storage: {
				id: "levels_stats",
				updated: "levels_stats_updated"
			}
		},
	},

	// app interface
	interface: {
		theme: {
			light: {
				background: "#eee",
				default: "#2a2d48",
				fill: "#fff",
				font: "#343434",
				fontSec: "#747474",
				border: "#c0c0c0",
				highlight: "#91a1f0",
				fade: "#d8d8d8",
				styles: [`
					.icon {
						opacity: 0.7;
						filter: unset !important;
					}
				`],
				checkboxBack: "#c770aa"
			},
			dark: {
				background: "#25252c",
				default: "#13131b",
				fill: "#212128",
				font: "#dcdcdc",
				fontSec: "#b4b4b4",
				border: "#b8b8b8",
				highlight: "#91a1f0",
				fade: "#747474",
				styles: [`
					.icon {
						opacity: 0.7;
						filter: invert(1) !important;
					}
				`],
				checkboxBack: "#773962" 
			}
		}
	}
};

appSetup.data.storage.HOME_FETCH_KEYS = [
	storageKeys.SETTINGS,
	storageKeys.USER_INFO,
	...appSetup.data.storage.HIGHLIGHTED,
	...appSetup.data.storage.ASSIGNMENTS ,
	...appSetup.data.storage.PROGRESS
];


