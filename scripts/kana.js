const separateRomaji = input => {
	let finalArray = [];
	let word = "";

	for (let i = 0; i < input.length; i++) {
		const c = input.charAt(i);
		word += c;
		// if it is hiragana/katakana/punctuation, or a value, or the last char
		if (c.match(/[\u3000-\u30ff]/) || i == input.length-1) {
			finalArray.push(word);
			word = "";
		}
			
	}
		
	return finalArray;
}

const convertToKana = text => {
	let finalValue = "";
	const vowels = ["a", "i", "u", "e", "o", "A", "I", "U", "E", "O"];
	const split = separateRomaji(text);
	for (const word of split) {
		let kanaValue = kana[word];
		// handle situations like 'kko' -> 'っこ'
		if (!kanaValue && word.length === 3) {
			if (word.charAt[0] === word.charAt[1] && vowels.includes(word.charAt(2))) {
				kanaValue = kana[/[a-z]/.test(word.charAt(0)) ? 'll' : 'LL']+kana[word.slice(1)];
			}
		}
		finalValue += kanaValue ? kanaValue : word;
	}
	return finalValue;
}

const isAllKana = text => {
	// TODO
}

const isAllKanji = text => {
	// TODO
}

const hasNonJapaneseCharacters = text => {
	// TODO
}

const kana = {
	"a": "あ",
	"i": "い",
	"u": "う",
	"e": "え",
	"o": "お",
	"ka": "か",
	"ki": "き",
	"ku": "く",
	"ke": "け",
	"ko": "こ",
	"ga": "が",
	"gi": "ぎ",
	"gu": "ぐ",
	"ge": "げ",
	"go": "ご",
	"sa": "さ",
	"shi": "し",
	"si": "し",
	"su": "す",
	"se": "せ",
	"so": "そ",
	"za": "ざ",
	"ji": "じ",
	"zu": "ず",
	"ze": "ぜ",
	"zo": "ぞ",
	"ta": "た",
	"chi": "ち",
	"ti": "ち",
	"tsu": "つ",
	"tu": "つ",
	"te": "て",
	"to": "と",
	"da": "だ",
	"di": "ぢ",
	"du": "づ",
	"de": "で",
	"do": "ど",
	"na": "な",
	"ni": "に",
	"nu": "ぬ",
	"ne": "ね",
	"no": "の",
	"ha": "は",
	"hi": "ひ",
	"hu": "ふ",
	"fu": "ふ",
	"he": "へ",
	"ho": "ほ",
	"ba": "ば",
	"bi": "び",
	"bu": "ぶ",
	"be": "べ",
	"bo": "ぼ",
	"pa": "ぱ",
	"pi": "ぴ",
	"pu": "ぷ",
	"pe": "ぺ",
	"po": "ぽ",
	"ma": "ま",
	"mi": "み",
	"mu": "む",
	"me": "め",
	"mo": "も",
	"ra": "ら",
	"ri": "り",
	"ru": "る",
	"re": "れ",
	"ro": "ろ",
	"ya": "や",
	"yu": "ゆ",
	"ye": "いぇ",
	"yo": "よ",
	"wa": "わ",
	"wi": "うぃ",
	"we": "うぇ",
	"wo": "を",
	"nn": "ん",
	"ja": "じゃ",
	"ju": "じゅ",
	"je": "じぇ",
	"jo": "じょ",
	"ca": "か",
	"ci": "し",
	"cu": "く",
	"ce": "せ",
	"co": "こ",
	"qa": "くぁ",
	"qi": "くぃ",
	"qu": "く",
	"qe": "くぇ",
	"qo": "くぉ",
	"fa": "ふぁ",
	"fi": "ふぃ",
	"fe": "ふぇ",
	"fo": "ふぉ",
	"la": "ぁ",
	"li": "ぃ",
	"lu": "ぅ",
	"le": "ぇ",
	"lo": "ぉ",
	"xa": "ぁ",
	"xi": "ぃ",
	"xu": "ぅ",
	"xe": "ぇ",
	"xo": "ぉ",
	"va": "ゔぁ",
	"vi": "ゔぃ",
	"vu": "ゔ",
	"ve": "ゔぇ",
	"vo": "ゔぉ",
	"-": "ー",
	",": "、",
	".": "。",
	"ll": "っ",
	"xx": "っ",
	"kya": "きゃ",
	"kyi": "きぃ",
	"kyu": "きゅ",
	"kye": "きぇ",
	"kyo": "きょ",
	"gya": "ぎゃ",
	"gyi": "ぎぃ",
	"gyu": "ぎゅ",
	"gye": "ぎぇ",
	"gyo": "ぎょ",
	"sha": "しゃ",
	"sya": "しゃ",
	"syi": "しぃ",
	"shu": "しゅ",
	"syu": "しゅ",
	"she": "しぇ",
	"sye": "しぇ",
	"sho": "しょ",
	"syo": "しょ",
	"ja": "じゃ",
	"jya": "じゃ",
	"zya": "じゃ",
	"jyi": "じぃ",
	"zyi": "じぃ",
	"ju": "じゅ",
	"jyu": "じゅ",
	"zyu": "じゅ",
	"je": "じぇ",
	"jye": "じぇ",
	"zye": "じぇ",
	"jo": "じょ",
	"jyo": "じょ",
	"zyo": "じょ",
	"cha": "ちゃ",
	"tya": "ちゃ",
	"tyi": "ちぃ",
	"chu": "ちゅ",
	"tyu": "ちゅ",
	"che": "ちぇ",
	"tye": "ちぇ",
	"cho": "ちょ",
	"tyo": "ちょ",
	"dya": "ぢゃ",
	"dyi": "ぢぃ",
	"dyu": "ぢゅ",
	"dye": "ぢぇ",
	"dyo": "ぢょ",
	"hya": "ひゃ",
	"hyi": "ひぃ",
	"hyu": "ひゅ",
	"hye": "ひぇ",
	"hyo": "ひょ",
	"bya": "びゃ",
	"byi": "びぃ",
	"byu": "びゅ",
	"bye": "びぇ",
	"byo": "びょ",
	"pya": "ぴゃ",
	"pyi": "ぴぃ",
	"pyu": "ぴゅ",
	"pye": "ぴぇ",
	"pyo": "ぴょ",
	"fya": "ふゃ",
	"fyu": "ふゅ",
	"fyo": "ふょ",
	"mya": "みゃ",
	"myi": "みぃ",
	"myu": "みゅ",
	"mye": "みぇ",
	"myo": "みょ",
	"nya": "にゃ",
	"nyi": "にぃ",
	"nyu": "にゅ",
	"nye": "にぇ",
	"nyo": "にょ",
	"rya": "りゃ",
	"ryi": "りぃ",
	"ryu": "りゅ",
	"rye": "りぇ",
	"ryo": "りょ",
	"cya": "ちゃ",
	"cyi": "ちぃ",
	"cyu": "ちゅ",
	"cye": "ちぇ",
	"cyo": "ちょ",
	"lya": "ゃ",
	"lyi": "ぃ",
	"lyu": "ゅ",
	"lye": "ぇ",
	"lyo": "ょ",
	"xya": "ゃ",
	"xyi": "ぃ",
	"xyu": "ゅ",
	"xye": "ぇ",
	"xyo": "ょ",
	"vya": "ゔゃ",
	"vyi": "ゔぃ",
	"vyu": "ゔゅ",
	"vye": "ゔぇ",
	"vyo": "ゔょ",
	"A": "ア",
	"I": "イ",
	"U": "ウ",
	"E": "エ",
	"O": "オ",
	"KA": "カ",
	"KI": "キ",
	"KU": "ク",
	"KE": "ケ",
	"KO": "コ",
	"GA": "ガ",
	"GI": "ギ",
	"GU": "グ",
	"GE": "ゲ",
	"GO": "ゴ",
	"SA": "サ",
	"SHI": "シ",
	"SI": "シ",
	"SU": "ス",
	"SE": "セ",
	"SO": "ソ",
	"ZA": "ザ",
	"JI": "ジ",
	"ZU": "ズ",
	"ZE": "ゼ",
	"ZO": "ゾ",
	"TA": "タ",
	"CHI": "チ",
	"TI": "チ",
	"TSU": "ツ",
	"TU": "ツ",
	"TE": "テ",
	"TO": "ト",
	"DA": "ダ",
	"DI": "ヂ",
	"DU": "ヅ",
	"DE": "デ",
	"DO": "ド",
	"NA": "ナ",
	"NI": "ニ",
	"NU": "ヌ",
	"NE": "ネ",
	"NO": "ノ",
	"HA": "ハ",
	"HI": "ヒ",
	"HU": "フ",
	"FU": "フ",
	"HE": "ヘ",
	"HO": "ホ",
	"BA": "バ",
	"BI": "ビ",
	"BU": "ブ",
	"BE": "ベ",
	"BO": "ボ",
	"PA": "パ",
	"PI": "ピ",
	"PU": "プ",
	"PE": "ペ",
	"PO": "ポ",
	"MA": "マ",
	"MI": "ミ",
	"MU": "ム",
	"ME": "メ",
	"MO": "モ",
	"RA": "ラ",
	"RI": "リ",
	"RU": "ル",
	"RE": "レ",
	"RO": "ロ",
	"YA": "ヤ",
	"YU": "ユ",
	"YE": "イェ",
	"YO": "ヨ",
	"WA": "ワ",
	"WI": "ウィ",
	"WE": "ウェ",
	"WO": "ヲ",
	"NN": "ン",
	"LL": "ッ",
	"XX": "ッ",
	"JA": "ジャ",
	"JU": "ジュ",
	"JE": "ジェ",
	"JO": "ジョ",
	"CA": "カ",
	"CI": "シ",
	"CU": "ク",
	"CE": "セ",
	"CO": "コ",
	"QA": "クァ",
	"QI": "クィ",
	"QU": "ク",
	"QE": "クェ",
	"QO": "クォ",
	"FA": "ファ",
	"FI": "フィ",
	"FE": "フェ",
	"FO": "フォ",
	"LA": "ァ",
	"LI": "ィ",
	"LU": "ゥ",
	"LE": "ェ",
	"LO": "ォ",
	"XA": "ァ",
	"XI": "ィ",
	"XU": "ゥ",
	"XE": "ェ",
	"XO": "ォ",
	"VA": "ヴァ",
	"VI": "ヴィ",
	"VU": "ヴ",
	"VE": "ヴェ",
	"VO": "ヴォ",
	"KYA": "キャ",
	"KYI": "キィ",
	"KYU": "キュ",
	"KYE": "キェ",
	"KYO": "キョ",
	"GYA": "ギャ",
	"GYI": "ギィ",
	"GYU": "ギュ",
	"GYE": "ギェ",
	"GYO": "ギョ",
	"SHA": "シャ",
	"SYA": "シャ",
	"SYI": "シィ",
	"SHU": "シュ",
	"SYU": "シュ",
	"SHE": "シェ",
	"SYE": "シェ",
	"SHO": "ショ",
	"SYO": "ショ",
	"JA": "ジャ",
	"JYA": "ジャ",
	"ZYA": "ジャ",
	"JYI": "ジィ",
	"ZYI": "ジィ",
	"JU": "ジュ",
	"JYU": "ジュ",
	"ZYU": "ジュ",
	"JE": "ジェ",
	"JYE": "ジェ",
	"ZYE": "ジェ",
	"JO": "ジョ",
	"JYO": "ジョ",
	"ZYO": "ジョ",
	"CHA": "チャ",
	"TYA": "チャ",
	"TYI": "チィ",
	"CHU": "チュ",
	"TYU": "チュ",
	"CHE": "チェ",
	"TYE": "チェ",
	"CHO": "チョ",
	"TYO": "チョ",
	"DYA": "ヂャ",
	"DYI": "ヂィ",
	"DYU": "ヂュ",
	"DYE": "ヂェ",
	"DYO": "ヂョ",
	"HYA": "ヒャ",
	"HYI": "ヒィ",
	"HYU": "ヒュ",
	"HYE": "ヒェ",
	"HYO": "ヒョ",
	"BYA": "ビャ",
	"BYI": "ビィ",
	"BYU": "ビュ",
	"BYE": "ビェ",
	"BYO": "ビョ",
	"PYA": "ピャ",
	"PYI": "ピィ",
	"PYU": "ピュ",
	"PYE": "ピェ",
	"PYO": "ピョ",
	"FYA": "フャ",
	"FYU": "フュ",
	"FYO": "フョ",
	"MYA": "ミャ",
	"MYI": "ミィ",
	"MYU": "ミュ",
	"MYE": "ミェ",
	"MYO": "ミョ",
	"NYA": "ニャ",
	"NYI": "ニィ",
	"NYU": "ニュ",
	"NYE": "ニェ",
	"NYO": "ニョ",
	"RYA": "リャ",
	"RYI": "リィ",
	"RYU": "リュ",
	"RYE": "リェ",
	"RYO": "リョ",
	"CYA": "チャ",
	"CYI": "チィ",
	"CYU": "チュ",
	"CYE": "チェ",
	"CYO": "チョ",
	"LYA": "ャ",
	"LYI": "ィ",
	"LYU": "ュ",
	"LYE": "ェ",
	"LYO": "ョ",
	"XYA": "ャ",
	"XYI": "ィ",
	"XYU": "ュ",
	"XYE": "ェ",
	"XYO": "ョ",
	"VYA": "ヴャ",
	"VYI": "ヴィ",
	"VYU": "ヴュ",
	"VYE": "ヴェ",
	"VYO": "ヴョ",
}

const fullKanjiList = [
    "一",
    "乙",
    "〇",
    "丁",
    "七",
    "九",
    "了",
    "二",
    "人",
    "入",
    "八",
    "刀",
    "力",
    "十",
    "又",
    "乃",
    "万",
    "丈",
    "三",
    "上",
    "下",
    "丸",
    "久",
    "亡",
    "凡",
    "刃",
    "千",
    "口",
    "土",
    "士",
    "夕",
    "大",
    "女",
    "子",
    "寸",
    "小",
    "山",
    "川",
    "工",
    "己",
    "干",
    "弓",
    "才",
    "之",
    "巾",
    "乞",
    "于",
    "也",
    "々",
    "勺",
    "不",
    "与",
    "中",
    "丹",
    "予",
    "互",
    "五",
    "井",
    "仁",
    "今",
    "介",
    "仏",
    "元",
    "公",
    "六",
    "内",
    "円",
    "冗",
    "凶",
    "分",
    "切",
    "刈",
    "化",
    "匹",
    "区",
    "升",
    "午",
    "厄",
    "及",
    "友",
    "双",
    "反",
    "収",
    "天",
    "太",
    "夫",
    "孔",
    "少",
    "尺",
    "屯",
    "幻",
    "弔",
    "引",
    "心",
    "戸",
    "手",
    "支",
    "文",
    "斗",
    "斤",
    "方",
    "日",
    "月",
    "木",
    "欠",
    "止",
    "比",
    "毛",
    "氏",
    "水",
    "火",
    "父",
    "片",
    "牛",
    "犬",
    "王",
    "巴",
    "允",
    "爪",
    "牙",
    "匂",
    "勾",
    "乏",
    "勿",
    "出",
    "世",
    "付",
    "仕",
    "代",
    "仙",
    "他",
    "以",
    "令",
    "兄",
    "只",
    "史",
    "号",
    "叶",
    "𠮟",
    "叱",
    "加",
    "占",
    "可",
    "句",
    "司",
    "召",
    "台",
    "古",
    "右",
    "石",
    "四",
    "囚",
    "凸",
    "凹",
    "冬",
    "処",
    "皮",
    "奴",
    "功",
    "巧",
    "包",
    "去",
    "圧",
    "庁",
    "広",
    "刊",
    "北",
    "半",
    "外",
    "央",
    "失",
    "矢",
    "尻",
    "尼",
    "左",
    "布",
    "平",
    "幼",
    "弁",
    "必",
    "打",
    "払",
    "斥",
    "丘",
    "未",
    "末",
    "本",
    "札",
    "正",
    "母",
    "民",
    "氷",
    "永",
    "汁",
    "氾",
    "犯",
    "生",
    "主",
    "玉",
    "巨",
    "用",
    "冊",
    "田",
    "由",
    "甲",
    "申",
    "白",
    "旧",
    "旦",
    "甘",
    "皿",
    "目",
    "且",
    "矛",
    "示",
    "礼",
    "写",
    "立",
    "市",
    "穴",
    "它",
    "玄",
    "辺",
    "込",
    "弘",
    "瓦",
    "丼",
    "丙",
    "両",
    "争",
    "交",
    "仮",
    "仰",
    "仲",
    "件",
    "任",
    "企",
    "伏",
    "伐",
    "休",
    "会",
    "伝",
    "充",
    "兆",
    "先",
    "光",
    "全",
    "共",
    "再",
    "刑",
    "列",
    "劣",
    "匠",
    "印",
    "危",
    "叫",
    "各",
    "合",
    "吉",
    "同",
    "名",
    "后",
    "吏",
    "吐",
    "向",
    "回",
    "因",
    "団",
    "在",
    "地",
    "壮",
    "多",
    "好",
    "如",
    "妃",
    "妄",
    "存",
    "宅",
    "宇",
    "守",
    "安",
    "寺",
    "尽",
    "州",
    "巡",
    "帆",
    "年",
    "式",
    "弐",
    "当",
    "忙",
    "成",
    "旨",
    "早",
    "旬",
    "曲",
    "有",
    "朱",
    "朴",
    "机",
    "朽",
    "次",
    "死",
    "毎",
    "気",
    "汗",
    "汚",
    "江",
    "池",
    "灯",
    "灰",
    "百",
    "竹",
    "米",
    "糸",
    "缶",
    "羊",
    "羽",
    "老",
    "考",
    "耳",
    "肉",
    "肌",
    "自",
    "至",
    "舌",
    "舟",
    "色",
    "芋",
    "芝",
    "虫",
    "血",
    "行",
    "衣",
    "西",
    "迅",
    "字",
    "伊",
    "旭",
    "庄",
    "亘",
    "圭",
    "汐",
    "伎",
    "臼",
    "汎",
    "乱",
    "亜",
    "伯",
    "伴",
    "伸",
    "伺",
    "似",
    "但",
    "位",
    "低",
    "住",
    "佐",
    "体",
    "何",
    "余",
    "作",
    "克",
    "児",
    "兵",
    "冷",
    "初",
    "判",
    "別",
    "利",
    "助",
    "努",
    "励",
    "労",
    "医",
    "即",
    "却",
    "卵",
    "君",
    "吟",
    "否",
    "含",
    "吸",
    "吹",
    "呈",
    "呉",
    "告",
    "困",
    "囲",
    "図",
    "坂",
    "均",
    "坊",
    "坑",
    "声",
    "壱",
    "売",
    "妊",
    "妙",
    "妥",
    "妨",
    "孝",
    "完",
    "対",
    "寿",
    "尾",
    "尿",
    "局",
    "岐",
    "希",
    "床",
    "序",
    "廷",
    "弟",
    "形",
    "役",
    "忌",
    "忍",
    "志",
    "忘",
    "応",
    "快",
    "我",
    "戒",
    "戻",
    "扱",
    "扶",
    "批",
    "技",
    "抄",
    "把",
    "抑",
    "投",
    "抗",
    "折",
    "抜",
    "択",
    "改",
    "攻",
    "更",
    "杉",
    "材",
    "村",
    "束",
    "条",
    "来",
    "求",
    "決",
    "汽",
    "沈",
    "沖",
    "没",
    "沢",
    "災",
    "状",
    "狂",
    "男",
    "町",
    "社",
    "秀",
    "私",
    "究",
    "系",
    "肖",
    "肝",
    "臣",
    "良",
    "花",
    "芳",
    "芸",
    "見",
    "角",
    "言",
    "谷",
    "豆",
    "貝",
    "赤",
    "走",
    "足",
    "身",
    "車",
    "辛",
    "酉",
    "迎",
    "近",
    "返",
    "邦",
    "里",
    "防",
    "麦",
    "串",
    "李",
    "那",
    "沙",
    "呂",
    "杏",
    "冶",
    "汰",
    "肘",
    "阪",
    "弄",
    "沃",
    "妖",
    "吾",
    "並",
    "乳",
    "事",
    "享",
    "京",
    "佳",
    "併",
    "使",
    "例",
    "侍",
    "供",
    "依",
    "価",
    "侮",
    "免",
    "具",
    "典",
    "到",
    "制",
    "刷",
    "券",
    "刺",
    "刻",
    "効",
    "劾",
    "卒",
    "卓",
    "協",
    "参",
    "叔",
    "取",
    "受",
    "周",
    "味",
    "呼",
    "命",
    "和",
    "固",
    "国",
    "坪",
    "垂",
    "夜",
    "奇",
    "奉",
    "奔",
    "妹",
    "妻",
    "姉",
    "始",
    "姓",
    "委",
    "季",
    "学",
    "宗",
    "官",
    "宙",
    "定",
    "宜",
    "宝",
    "実",
    "尚",
    "居",
    "屈",
    "届",
    "岬",
    "岳",
    "岩",
    "岸",
    "幸",
    "底",
    "店",
    "府",
    "延",
    "弦",
    "彼",
    "往",
    "征",
    "径",
    "忠",
    "念",
    "怖",
    "性",
    "怪",
    "房",
    "所",
    "承",
    "披",
    "抱",
    "抵",
    "抹",
    "押",
    "抽",
    "担",
    "拍",
    "拐",
    "拒",
    "拓",
    "拘",
    "招",
    "拝",
    "拠",
    "拡",
    "放",
    "斉",
    "昆",
    "昇",
    "明",
    "易",
    "昔",
    "服",
    "杯",
    "東",
    "松",
    "板",
    "析",
    "林",
    "枚",
    "果",
    "枝",
    "枠",
    "枢",
    "欧",
    "武",
    "歩",
    "殴",
    "毒",
    "河",
    "沸",
    "油",
    "治",
    "沼",
    "沿",
    "況",
    "泊",
    "泌",
    "法",
    "泡",
    "波",
    "泣",
    "泥",
    "注",
    "泳",
    "炉",
    "炊",
    "炎",
    "牧",
    "物",
    "画",
    "的",
    "盲",
    "直",
    "知",
    "祈",
    "祉",
    "空",
    "突",
    "者",
    "肢",
    "肥",
    "肩",
    "肪",
    "肯",
    "育",
    "舎",
    "芽",
    "苗",
    "若",
    "苦",
    "英",
    "茂",
    "茎",
    "表",
    "迫",
    "迭",
    "述",
    "邪",
    "邸",
    "金",
    "長",
    "門",
    "阻",
    "附",
    "雨",
    "青",
    "非",
    "奈",
    "阿",
    "昌",
    "虎",
    "弥",
    "茅",
    "拙",
    "朋",
    "苑",
    "於",
    "尭",
    "旺",
    "采",
    "侃",
    "宛",
    "岡",
    "玩",
    "股",
    "呪",
    "刹",
    "狙",
    "妬",
    "阜",
    "枕",
    "拉",
    "版",
    "乗",
    "亭",
    "侯",
    "侵",
    "便",
    "係",
    "促",
    "俊",
    "俗",
    "保",
    "信",
    "冒",
    "冠",
    "則",
    "削",
    "前",
    "勅",
    "勇",
    "卑",
    "南",
    "卸",
    "厘",
    "厚",
    "叙",
    "咲",
    "単",
    "哀",
    "品",
    "型",
    "垣",
    "城",
    "変",
    "奏",
    "契",
    "姻",
    "姿",
    "威",
    "孤",
    "客",
    "宣",
    "室",
    "封",
    "専",
    "屋",
    "峠",
    "峡",
    "巻",
    "帝",
    "帥",
    "幽",
    "度",
    "建",
    "弧",
    "待",
    "律",
    "後",
    "怒",
    "思",
    "怠",
    "急",
    "恒",
    "恨",
    "悔",
    "括",
    "拷",
    "拾",
    "持",
    "指",
    "挑",
    "挟",
    "政",
    "故",
    "施",
    "星",
    "映",
    "春",
    "昨",
    "昭",
    "是",
    "昼",
    "枯",
    "架",
    "柄",
    "某",
    "染",
    "柔",
    "柱",
    "柳",
    "査",
    "栄",
    "段",
    "泉",
    "洋",
    "洗",
    "洞",
    "洒",
    "津",
    "洪",
    "活",
    "派",
    "浄",
    "浅",
    "海",
    "炭",
    "点",
    "為",
    "牲",
    "狩",
    "独",
    "狭",
    "珍",
    "甚",
    "界",
    "畑",
    "疫",
    "発",
    "皆",
    "皇",
    "盆",
    "相",
    "盾",
    "省",
    "看",
    "県",
    "砂",
    "研",
    "砕",
    "祖",
    "祝",
    "秋",
    "科",
    "秒",
    "窃",
    "糾",
    "紀",
    "約",
    "紅",
    "美",
    "耐",
    "肺",
    "胃",
    "胆",
    "背",
    "胎",
    "胞",
    "臭",
    "茶",
    "草",
    "荒",
    "荘",
    "衷",
    "要",
    "訂",
    "計",
    "貞",
    "負",
    "赴",
    "軌",
    "軍",
    "迷",
    "追",
    "退",
    "送",
    "逃",
    "逆",
    "郊",
    "郎",
    "重",
    "限",
    "面",
    "革",
    "音",
    "風",
    "飛",
    "食",
    "首",
    "香",
    "彦",
    "胡",
    "虹",
    "眉",
    "怨",
    "咽",
    "畏",
    "拶",
    "柵",
    "拭",
    "栃",
    "訃",
    "昧",
    "勃",
    "侶",
    "柿",
    "修",
    "俳",
    "俵",
    "俸",
    "倉",
    "個",
    "倍",
    "倒",
    "候",
    "借",
    "倣",
    "値",
    "倫",
    "倹",
    "俺",
    "党",
    "兼",
    "准",
    "凍",
    "剖",
    "剛",
    "剣",
    "剤",
    "勉",
    "匿",
    "原",
    "員",
    "哲",
    "唆",
    "唇",
    "唐",
    "埋",
    "姫",
    "娘",
    "娠",
    "娯",
    "夏",
    "孫",
    "宮",
    "宰",
    "害",
    "宴",
    "宵",
    "家",
    "容",
    "射",
    "将",
    "展",
    "峰",
    "島",
    "差",
    "師",
    "席",
    "帯",
    "帰",
    "座",
    "庫",
    "庭",
    "弱",
    "徐",
    "徒",
    "従",
    "恋",
    "恐",
    "恥",
    "恩",
    "恭",
    "息",
    "恵",
    "悟",
    "悦",
    "悩",
    "扇",
    "挙",
    "振",
    "挿",
    "捕",
    "捜",
    "敏",
    "料",
    "旅",
    "既",
    "時",
    "書",
    "朕",
    "朗",
    "栓",
    "校",
    "株",
    "核",
    "根",
    "格",
    "栽",
    "桃",
    "案",
    "桑",
    "桜",
    "桟",
    "梅",
    "殉",
    "殊",
    "残",
    "殺",
    "泰",
    "流",
    "浜",
    "浦",
    "浪",
    "浮",
    "浴",
    "浸",
    "消",
    "涙",
    "烈",
    "特",
    "珠",
    "班",
    "瓶",
    "畔",
    "留",
    "畜",
    "畝",
    "疲",
    "疾",
    "病",
    "症",
    "益",
    "真",
    "眠",
    "砲",
    "破",
    "神",
    "祥",
    "秘",
    "租",
    "秩",
    "称",
    "竜",
    "笑",
    "粉",
    "粋",
    "紋",
    "納",
    "純",
    "紙",
    "級",
    "紛",
    "素",
    "紡",
    "索",
    "翁",
    "耕",
    "耗",
    "胴",
    "胸",
    "能",
    "脂",
    "脅",
    "脈",
    "致",
    "航",
    "般",
    "荷",
    "華",
    "虐",
    "蚊",
    "蚕",
    "衰",
    "被",
    "討",
    "訓",
    "託",
    "記",
    "財",
    "貢",
    "起",
    "軒",
    "辱",
    "透",
    "逐",
    "逓",
    "途",
    "通",
    "逝",
    "速",
    "造",
    "連",
    "郡",
    "酌",
    "配",
    "酒",
    "針",
    "降",
    "陛",
    "院",
    "陣",
    "除",
    "陥",
    "隻",
    "飢",
    "馬",
    "骨",
    "高",
    "鬼",
    "浩",
    "栗",
    "桂",
    "桐",
    "拳",
    "唄",
    "冥",
    "挨",
    "挫",
    "桁",
    "恣",
    "脊",
    "凄",
    "芯",
    "捉",
    "捗",
    "酎",
    "剝",
    "剥",
    "脇",
    "哺",
    "釜",
    "乾",
    "偏",
    "停",
    "健",
    "側",
    "偵",
    "偶",
    "偽",
    "副",
    "剰",
    "動",
    "勘",
    "務",
    "唯",
    "唱",
    "商",
    "問",
    "啓",
    "喝",
    "圏",
    "域",
    "執",
    "培",
    "基",
    "堀",
    "堂",
    "婆",
    "婚",
    "婦",
    "宿",
    "寂",
    "寄",
    "密",
    "尉",
    "崇",
    "崎",
    "崩",
    "巣",
    "帳",
    "常",
    "庶",
    "康",
    "庸",
    "張",
    "強",
    "彩",
    "彫",
    "得",
    "悠",
    "患",
    "悪",
    "悼",
    "情",
    "惜",
    "惨",
    "捨",
    "据",
    "掃",
    "授",
    "排",
    "掘",
    "掛",
    "採",
    "探",
    "接",
    "控",
    "推",
    "措",
    "掲",
    "描",
    "救",
    "敗",
    "教",
    "斎",
    "斜",
    "断",
    "旋",
    "族",
    "曹",
    "望",
    "械",
    "欲",
    "殻",
    "涯",
    "液",
    "涼",
    "淑",
    "淡",
    "深",
    "混",
    "添",
    "清",
    "渇",
    "済",
    "渉",
    "渋",
    "渓",
    "猛",
    "猟",
    "猫",
    "率",
    "現",
    "球",
    "理",
    "産",
    "略",
    "異",
    "盗",
    "盛",
    "眺",
    "眼",
    "票",
    "祭",
    "移",
    "窒",
    "窓",
    "章",
    "笛",
    "符",
    "第",
    "粒",
    "粗",
    "粘",
    "粛",
    "粧",
    "累",
    "細",
    "紳",
    "紹",
    "紺",
    "終",
    "組",
    "経",
    "翌",
    "習",
    "脚",
    "脱",
    "脳",
    "舶",
    "船",
    "菊",
    "菌",
    "菓",
    "菜",
    "著",
    "虚",
    "蛇",
    "蛍",
    "術",
    "街",
    "袋",
    "規",
    "視",
    "訟",
    "訪",
    "設",
    "許",
    "訳",
    "豚",
    "貧",
    "貨",
    "販",
    "責",
    "赦",
    "軟",
    "転",
    "逮",
    "週",
    "進",
    "逸",
    "部",
    "郭",
    "郵",
    "郷",
    "都",
    "酔",
    "釈",
    "野",
    "釣",
    "閉",
    "陪",
    "陰",
    "陳",
    "陵",
    "陶",
    "陸",
    "険",
    "隆",
    "雪",
    "頂",
    "魚",
    "鳥",
    "麻",
    "黄",
    "黒",
    "鹿",
    "梨",
    "亀",
    "淳",
    "猪",
    "笹",
    "渚",
    "爽",
    "陳",
    "淫",
    "葛",
    "崖",
    "苛",
    "惧",
    "痕",
    "頃",
    "梗",
    "舷",
    "斬",
    "埼",
    "戚",
    "羞",
    "袖",
    "曽",
    "堆",
    "唾",
    "貪",
    "捻",
    "偉",
    "傍",
    "傘",
    "備",
    "割",
    "創",
    "勝",
    "募",
    "博",
    "善",
    "喚",
    "喜",
    "喪",
    "喫",
    "営",
    "堅",
    "堕",
    "堤",
    "堪",
    "報",
    "場",
    "塀",
    "塁",
    "塔",
    "塚",
    "奥",
    "婿",
    "媒",
    "富",
    "寒",
    "尊",
    "尋",
    "就",
    "属",
    "帽",
    "幅",
    "幾",
    "廃",
    "廊",
    "弾",
    "御",
    "復",
    "循",
    "悲",
    "惑",
    "惰",
    "愉",
    "慌",
    "扉",
    "掌",
    "提",
    "揚",
    "換",
    "握",
    "揮",
    "援",
    "揺",
    "搭",
    "敢",
    "散",
    "敬",
    "晩",
    "普",
    "景",
    "晴",
    "晶",
    "暁",
    "暑",
    "替",
    "最",
    "朝",
    "期",
    "棋",
    "棒",
    "棚",
    "棟",
    "森",
    "棺",
    "植",
    "検",
    "業",
    "極",
    "欺",
    "款",
    "歯",
    "殖",
    "減",
    "渡",
    "渦",
    "温",
    "測",
    "港",
    "湖",
    "湯",
    "湾",
    "湿",
    "満",
    "滋",
    "無",
    "焦",
    "然",
    "焼",
    "煮",
    "猶",
    "琴",
    "番",
    "畳",
    "疎",
    "痘",
    "痛",
    "痢",
    "登",
    "着",
    "短",
    "硝",
    "硫",
    "硬",
    "程",
    "税",
    "童",
    "筆",
    "等",
    "筋",
    "筒",
    "答",
    "策",
    "紫",
    "結",
    "絞",
    "絡",
    "給",
    "統",
    "絵",
    "絶",
    "腐",
    "腕",
    "落",
    "葉",
    "葬",
    "蛮",
    "衆",
    "裁",
    "裂",
    "装",
    "裕",
    "補",
    "覚",
    "訴",
    "診",
    "証",
    "詐",
    "詔",
    "評",
    "詞",
    "詠",
    "象",
    "貫",
    "貯",
    "貴",
    "買",
    "貸",
    "費",
    "貿",
    "賀",
    "超",
    "越",
    "距",
    "軸",
    "軽",
    "遂",
    "遅",
    "遇",
    "遊",
    "運",
    "遍",
    "過",
    "道",
    "達",
    "酢",
    "量",
    "鈍",
    "開",
    "閑",
    "間",
    "陽",
    "隅",
    "隊",
    "階",
    "随",
    "雄",
    "集",
    "雇",
    "雰",
    "雲",
    "項",
    "順",
    "飯",
    "飲",
    "智",
    "須",
    "萩",
    "敦",
    "媛",
    "嵐",
    "椎",
    "翔",
    "喬",
    "巽",
    "湧",
    "茨",
    "椅",
    "喉",
    "腎",
    "痩",
    "貼",
    "斑",
    "喩",
    "勤",
    "傑",
    "催",
    "債",
    "傷",
    "傾",
    "働",
    "僧",
    "勢",
    "勧",
    "嗣",
    "嘆",
    "園",
    "塊",
    "塑",
    "塗",
    "塩",
    "墓",
    "夢",
    "奨",
    "嫁",
    "嫌",
    "寛",
    "寝",
    "幕",
    "幹",
    "廉",
    "微",
    "想",
    "愁",
    "意",
    "愚",
    "愛",
    "感",
    "慈",
    "慎",
    "慨",
    "戦",
    "損",
    "搬",
    "携",
    "搾",
    "摂",
    "数",
    "新",
    "暇",
    "暖",
    "暗",
    "棄",
    "楼",
    "楽",
    "歳",
    "殿",
    "源",
    "準",
    "溝",
    "溶",
    "滅",
    "滑",
    "滝",
    "滞",
    "漠",
    "漢",
    "煙",
    "照",
    "煩",
    "献",
    "猿",
    "環",
    "痴",
    "盟",
    "睡",
    "督",
    "碁",
    "禁",
    "福",
    "稚",
    "節",
    "絹",
    "継",
    "続",
    "罪",
    "置",
    "署",
    "群",
    "義",
    "聖",
    "腰",
    "腸",
    "腹",
    "艇",
    "蒸",
    "蓄",
    "虜",
    "虞",
    "裏",
    "裸",
    "褐",
    "解",
    "触",
    "試",
    "詩",
    "詰",
    "話",
    "該",
    "詳",
    "誇",
    "誉",
    "誠",
    "豊",
    "賃",
    "賄",
    "資",
    "賊",
    "跡",
    "路",
    "跳",
    "践",
    "較",
    "載",
    "辞",
    "農",
    "違",
    "遠",
    "遣",
    "酪",
    "酬",
    "鈴",
    "鉄",
    "鉛",
    "鉢",
    "鉱",
    "隔",
    "雅",
    "零",
    "雷",
    "電",
    "靴",
    "預",
    "頑",
    "頒",
    "飼",
    "飽",
    "飾",
    "鼓",
    "睦",
    "彙",
    "詣",
    "窟",
    "僅",
    "嗅",
    "傲",
    "隙",
    "腫",
    "嫉",
    "塞",
    "詮",
    "煎",
    "羨",
    "頓",
    "塡",
    "填",
    "溺",
    "蜂",
    "慄",
    "楷",
    "賂",
    "毀",
    "像",
    "僕",
    "僚",
    "嘱",
    "塾",
    "境",
    "増",
    "墨",
    "奪",
    "嫡",
    "察",
    "寨",
    "寡",
    "寧",
    "層",
    "彰",
    "徳",
    "徴",
    "態",
    "慕",
    "慢",
    "憎",
    "摘",
    "旗",
    "暦",
    "暮",
    "概",
    "構",
    "様",
    "模",
    "歌",
    "歴",
    "滴",
    "漁",
    "漂",
    "漆",
    "漏",
    "演",
    "漫",
    "漬",
    "漸",
    "獄",
    "疑",
    "碑",
    "磁",
    "禅",
    "禍",
    "種",
    "稲",
    "穀",
    "端",
    "箇",
    "算",
    "管",
    "精",
    "維",
    "綱",
    "網",
    "綿",
    "総",
    "緑",
    "緒",
    "練",
    "罰",
    "聞",
    "膜",
    "製",
    "複",
    "誌",
    "認",
    "誓",
    "誘",
    "語",
    "誤",
    "説",
    "読",
    "豪",
    "踊",
    "適",
    "遭",
    "遮",
    "酵",
    "酷",
    "酸",
    "銀",
    "銃",
    "銅",
    "銘",
    "銭",
    "関",
    "閣",
    "閥",
    "際",
    "障",
    "隠",
    "雌",
    "雑",
    "需",
    "静",
    "領",
    "駄",
    "駅",
    "駆",
    "髪",
    "魂",
    "鳴",
    "鼻",
    "熊",
    "聡",
    "槙",
    "漱",
    "瑠",
    "璃",
    "萎",
    "裾",
    "遜",
    "遡",
    "箋",
    "綻",
    "蜜",
    "貌",
    "辣",
    "瘍",
    "儀",
    "億",
    "劇",
    "勲",
    "器",
    "噴",
    "墜",
    "墳",
    "審",
    "寮",
    "導",
    "履",
    "幣",
    "弊",
    "影",
    "徹",
    "慣",
    "慮",
    "慰",
    "慶",
    "憂",
    "憤",
    "戯",
    "摩",
    "撃",
    "撤",
    "撮",
    "撲",
    "敵",
    "敷",
    "暫",
    "暴",
    "槽",
    "標",
    "権",
    "横",
    "歓",
    "潔",
    "潜",
    "潟",
    "潤",
    "潮",
    "澄",
    "熟",
    "熱",
    "監",
    "盤",
    "確",
    "稼",
    "稿",
    "穂",
    "窮",
    "窯",
    "箱",
    "範",
    "緊",
    "線",
    "締",
    "編",
    "緩",
    "縁",
    "縄",
    "罷",
    "膚",
    "舗",
    "舞",
    "蔵",
    "衝",
    "褒",
    "誕",
    "課",
    "調",
    "談",
    "請",
    "論",
    "諸",
    "諾",
    "謁",
    "賓",
    "賛",
    "賜",
    "賞",
    "賠",
    "賦",
    "質",
    "趣",
    "踏",
    "輝",
    "輩",
    "輪",
    "遵",
    "遷",
    "選",
    "遺",
    "鋭",
    "鋳",
    "閲",
    "震",
    "霊",
    "養",
    "餓",
    "駐",
    "魅",
    "黙",
    "駒",
    "憧",
    "嬉",
    "潰",
    "稽",
    "憬",
    "畿",
    "餌",
    "摯",
    "踪",
    "嘲",
    "緻",
    "誰",
    "膝",
    "箸",
    "罵",
    "蝟",
    "儒",
    "凝",
    "墾",
    "壁",
    "壇",
    "壊",
    "壌",
    "奮",
    "嬢",
    "憩",
    "憲",
    "憶",
    "憾",
    "懐",
    "擁",
    "操",
    "整",
    "曇",
    "橋",
    "機",
    "激",
    "濁",
    "濃",
    "燃",
    "獣",
    "獲",
    "磨",
    "積",
    "穏",
    "築",
    "樹",
    "篤",
    "糖",
    "緯",
    "縛",
    "縦",
    "縫",
    "繁",
    "膨",
    "興",
    "薄",
    "薦",
    "薪",
    "薫",
    "薬",
    "融",
    "衛",
    "衡",
    "親",
    "諭",
    "諮",
    "謀",
    "謡",
    "賢",
    "輸",
    "避",
    "還",
    "鋼",
    "錠",
    "錬",
    "錯",
    "録",
    "隣",
    "隷",
    "頭",
    "頼",
    "館",
    "龍",
    "錦",
    "骸",
    "蓋",
    "諧",
    "醒",
    "膳",
    "賭",
    "諦",
    "麺",
    "頰",
    "頬",
    "錮",
    "償",
    "優",
    "厳",
    "嚇",
    "懇",
    "懲",
    "擦",
    "擬",
    "濯",
    "燥",
    "爵",
    "犠",
    "療",
    "矯",
    "礁",
    "縮",
    "績",
    "繊",
    "翼",
    "聴",
    "覧",
    "謄",
    "謙",
    "講",
    "謝",
    "謹",
    "購",
    "轄",
    "醜",
    "鍛",
    "霜",
    "頻",
    "鮮",
    "磯",
    "瞳",
    "瞭",
    "曖",
    "韓",
    "臆",
    "鍵",
    "鍋",
    "謎",
    "闇",
    "蔑",
    "璧",
    "餅",
    "曜",
    "濫",
    "癒",
    "癖",
    "瞬",
    "礎",
    "穫",
    "簡",
    "糧",
    "織",
    "繕",
    "繭",
    "翻",
    "職",
    "臨",
    "藩",
    "襟",
    "覆",
    "覇",
    "観",
    "贈",
    "鎖",
    "鎮",
    "闘",
    "離",
    "難",
    "題",
    "額",
    "顔",
    "顕",
    "類",
    "騎",
    "騒",
    "験",
    "蔽",
    "藤",
    "鎌",
    "藍",
    "鯉",
    "顎",
    "戴",
    "瀬",
    "爆",
    "璽",
    "簿",
    "繰",
    "羅",
    "臓",
    "藻",
    "識",
    "譜",
    "警",
    "鏡",
    "霧",
    "韻",
    "願",
    "髄",
    "鯨",
    "鶏",
    "麗",
    "艶",
    "蹴",
    "麓",
    "懸",
    "欄",
    "競",
    "籍",
    "議",
    "譲",
    "醸",
    "鐘",
    "響",
    "騰",
    "艦",
    "護",
    "躍",
    "露",
    "顧",
    "魔",
    "鶴",
    "櫻",
    "襲",
    "驚",
    "籠",
    "攣",
    "龕",
    "鑑",
    "靨",
    "鷹",
    "魘",
    "鬱",
    "驫",
    "鸞",
    "麤",
    "䯂"
]