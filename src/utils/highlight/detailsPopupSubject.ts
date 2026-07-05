import {
	popHistoryEntry,
	popupState,
	showSubjectBundle,
} from './detailsPopupState';

let requestSeq = 0;

type SubjectBundle = {
	subject: any;
	related?: Record<number, any>;
};

type FetchOptions = {
	includeRelated?: boolean;
	ensureReviews?: boolean;
};

const bundleCache = new Map<string, SubjectBundle>();
const inflight = new Map<string, Promise<SubjectBundle | null>>();

function cacheKey(
	characters?: string,
	subjectType?: string,
	subjectId?: number,
	options: FetchOptions = {},
): string {
	const mode = options.includeRelated ? 'full' : 'preview';
	if (Number.isFinite(subjectId)) return `${mode}:id:${subjectId}`;
	return `${mode}:${subjectType ?? ''}:${characters ?? ''}`;
}

function currentFetchOptions(): FetchOptions {
	return {
		includeRelated: popupState.focused,
		ensureReviews: popupState.focused,
	};
}

async function fetchSubjectBundle(
	characters?: string,
	subjectType?: string,
	subjectId?: number,
	options: FetchOptions = currentFetchOptions(),
): Promise<SubjectBundle | null> {
	const key = cacheKey(characters, subjectType, subjectId, options);
	const cached = bundleCache.get(key);
	if (cached) return cached;

	const pending = inflight.get(key);
	if (pending) return pending;

	const promise = (async () => {
		try {
			const payload: Record<string, unknown> = {
				type: 'wkh:getSubject',
				includeRelated: options.includeRelated !== false,
				ensureReviews: options.ensureReviews !== false,
			};
			if (Number.isFinite(subjectId)) payload.subjectId = subjectId;
			if (characters) payload.characters = characters;
			if (subjectType) payload.subjectType = subjectType;

			const response = await browser.runtime.sendMessage(payload);
			if (!response?.subject) return null;

			const bundle: SubjectBundle = {
				subject: response.subject,
				related: response.related ?? {},
			};
			bundleCache.set(key, bundle);

			if (options.includeRelated && bundle.subject?.id != null) {
				bundleCache.set(
					cacheKey(undefined, undefined, bundle.subject.id, options),
					bundle,
				);
			}

			return bundle;
		} catch {
			return null;
		} finally {
			inflight.delete(key);
		}
	})();

	inflight.set(key, promise);
	return promise;
}

/** Load related subjects + review stats when the popup expands. */
export async function ensureFullSubjectForPopup(): Promise<void> {
	const item = popupState.item;
	if (!item?.id || popupState.locked) return;

	const seq = ++requestSeq;
	const bundle = await fetchSubjectBundle(undefined, undefined, item.id, {
		includeRelated: true,
		ensureReviews: true,
	});
	if (seq !== requestSeq || !bundle?.subject) return;

	popupState.item = bundle.subject;
	popupState.relatedSubjects = bundle.related ?? {};
}

/** Fetch a subject from cache and show it in the in-page details popup. */
export async function openHighlightedSubject(
	value: string,
	subjectType?: string,
	options: { pushHistory?: boolean } = {},
): Promise<void> {
	if (popupState.locked) return;

	const seq = ++requestSeq;
	const bundle = await fetchSubjectBundle(value.trim(), subjectType, undefined, currentFetchOptions());
	if (seq !== requestSeq || !bundle?.subject) return;

	showSubjectBundle(bundle.subject, bundle.related ?? {}, options);
}

export async function openHighlightedSubjectById(
	subjectId: number,
	options: { pushHistory?: boolean } = {},
): Promise<void> {
	if (popupState.locked) return;

	const seq = ++requestSeq;
	const bundle = await fetchSubjectBundle(undefined, undefined, subjectId, currentFetchOptions());
	if (seq !== requestSeq || !bundle?.subject) return;

	showSubjectBundle(bundle.subject, bundle.related ?? {}, options);
}

export async function navigatePopupHistoryBack(): Promise<boolean> {
	const entry = popHistoryEntry();
	if (!entry) return false;

	const seq = ++requestSeq;
	const bundle = await fetchSubjectBundle(undefined, undefined, entry.id, currentFetchOptions());
	if (seq !== requestSeq || !bundle?.subject) return false;

	popupState.item = bundle.subject;
	popupState.relatedSubjects = bundle.related ?? {};
	return true;
}

export function clearSubjectBundleCache(): void {
	bundleCache.clear();
	inflight.clear();
}
