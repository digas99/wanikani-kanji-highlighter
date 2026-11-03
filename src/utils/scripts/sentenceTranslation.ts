/**
 * Translating a kept sentence (pageSentences.ts), when asked: with the browser's own translator
 * (Chrome's Translator API, on this device: the sentence isn't sent anywhere). Browsers without
 * it (or without Japanese → English) don't offer it at all.
 *
 * The first use may download the language model (once): its progress is reported.
 */

const SOURCE = 'ja';
const TARGET = 'en';

type Availability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

type TranslatorApi = {
	availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
	create(options: {
		sourceLanguage: string;
		targetLanguage: string;
		monitor?: (monitor: EventTarget) => void;
	}): Promise<{ translate(text: string): Promise<string> }>;
};

function api(): TranslatorApi | null {
	const translator = (globalThis as any).Translator;
	return translator && typeof translator.availability === 'function' && typeof translator.create === 'function'
		? translator
		: null;
}

let support: Promise<boolean> | null = null;

/** Whether this browser can translate Japanese to English on the device (checked once). */
export function canTranslateSentences(): Promise<boolean> {
	if (!support) {
		const translator = api();
		support = translator
			? translator.availability({ sourceLanguage: SOURCE, targetLanguage: TARGET })
				.then(availability => availability !== 'unavailable')
				.catch(() => false)
			: Promise.resolve(false);
	}
	return support;
}

let instance: Promise<{ translate(text: string): Promise<string> }> | null = null;

/**
 * The sentence in English. `onProgress` (0–1): the model downloading, the first time. Called
 * from a click: creating the translator may need it (the download is the user's choice).
 */
export async function translateSentence(text: string, onProgress?: (share: number) => void): Promise<string> {
	const translator = api();
	if (!translator) throw new Error('No translator in this browser');
	if (!instance) {
		instance = translator.create({
			sourceLanguage: SOURCE,
			targetLanguage: TARGET,
			monitor(monitor) {
				monitor.addEventListener('downloadprogress', (event: any) => {
					const loaded = Number(event?.loaded);
					if (Number.isFinite(loaded)) onProgress?.(loaded > 1 ? loaded / (Number(event.total) || 1) : loaded);
				});
			},
		});
		// failed (e.g. no space for the model): asked again next time
		instance.catch(() => { instance = null; });
	}
	return (await (await instance).translate(text)).trim();
}
