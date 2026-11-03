import {
	popHistoryEntry,
	popupState,
	showSubjectBundle,
} from './detailsPopupState';
import { hasCachedReviewStats } from '@/utils/scripts/subjectDetailsPopup';

let requestSeq = 0;

type SubjectBundle = {
	subject: any;
	related?: Record<number, any>;
};

type FetchOptions = {
	includeRelated?: boolean;
	ensureReviews?: boolean;
};

/** Hover / navigation: cache-only, no related subjects, no network. */
const PREVIEW_OPTIONS: FetchOptions = { includeRelated: false, ensureReviews: false };
/** Expanded popup, first pass: related subjects from cache, no network. */
const FULL_CACHED_OPTIONS: FetchOptions = { includeRelated: true, ensureReviews: false };
/** Expanded popup, second pass: may hit the API for missing review stats. */
const FULL_WITH_REVIEWS_OPTIONS: FetchOptions = { includeRelated: true, ensureReviews: true };

const PREFETCH_BATCH_SIZE = 250;

const bundleCache = new Map<string, SubjectBundle>();
const inflight = new Map<string, Promise<SubjectBundle | null>>();
/** Items already sent for prefetch (hit or miss), so they aren't requested again. */
const prefetched = new Set<string>();

function itemKey(characters?: string, subjectType?: string): string {
	return `${subjectType ?? ''}:${characters ?? ''}`;
}

function cacheKey(
	characters?: string,
	subjectType?: string,
	subjectId?: number,
	options: FetchOptions = {},
): string {
	const mode = `${options.includeRelated ? 'full' : 'preview'}${options.ensureReviews ? '+reviews' : ''}`;
	if (Number.isFinite(subjectId)) return `${mode}:id:${subjectId}`;
	return `${mode}:${itemKey(characters, subjectType)}`;
}

function storeBundle(bundle: SubjectBundle, options: FetchOptions, characters?: string, subjectType?: string) {
	if (characters) bundleCache.set(cacheKey(characters, subjectType, undefined, options), bundle);
	if (bundle.subject?.id != null) {
		bundleCache.set(cacheKey(undefined, undefined, bundle.subject.id, options), bundle);
	}
}

async function fetchSubjectBundle(
	characters?: string,
	subjectType?: string,
	subjectId?: number,
	options: FetchOptions = PREVIEW_OPTIONS,
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
				includeRelated: options.includeRelated === true,
				ensureReviews: options.ensureReviews === true,
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
			storeBundle(bundle, options, characters, subjectType);
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

/**
 * Warm the preview cache for every item highlighted on the page with one
 * batched message, so hovering shows the popup without a round trip.
 */
export async function prefetchHighlightedSubjects(
	items: Array<{ value: string; type?: string }>,
): Promise<void> {
	const pending: Array<{ value: string; type?: string }> = [];
	for (const item of items) {
		if (!item?.value) continue;
		const key = itemKey(item.value, item.type);
		if (prefetched.has(key)) continue;
		prefetched.add(key);
		pending.push({ value: item.value, type: item.type });
	}

	for (let i = 0; i < pending.length; i += PREFETCH_BATCH_SIZE) {
		const batch = pending.slice(i, i + PREFETCH_BATCH_SIZE);
		try {
			const response = await browser.runtime.sendMessage({
				type: 'wkh:getSubjectPreviews',
				items: batch,
			});
			const subjects: Record<string, any> = response?.subjects ?? {};
			for (const item of batch) {
				const subject = subjects[itemKey(item.value, item.type)];
				if (!subject) continue;
				storeBundle({ subject, related: {} }, PREVIEW_OPTIONS, item.value, item.type);
			}
		} catch {
			// let these be fetched on hover instead
			for (const item of batch) prefetched.delete(itemKey(item.value, item.type));
		}
	}
}

/** Wake the background worker and open its database ahead of the first hover. */
export function warmupSubjectLookup(): void {
	try {
		browser.runtime.sendMessage({ type: 'wkh:warmup' }).catch(() => {});
	} catch {
		/* extension context may be gone */
	}
}

/**
 * Load related subjects + review stats when the popup expands.
 * Shows cached related subjects right away, then fills in review stats
 * (which may need an API call) without blocking the panel.
 */
export async function ensureFullSubjectForPopup(): Promise<void> {
	const item = popupState.item;
	if (!item?.id || popupState.locked) return;

	const seq = ++requestSeq;
	const cachedKey = cacheKey(undefined, undefined, item.id, FULL_CACHED_OPTIONS);
	// placeholder cards only when the related subjects really have to be fetched
	popupState.relatedLoading = !bundleCache.has(cachedKey)
		&& !bundleCache.has(cacheKey(undefined, undefined, item.id, FULL_WITH_REVIEWS_OPTIONS));
	popupState.statsLoading = !hasCachedReviewStats(item.reviews);

	const cachedBundle = await fetchSubjectBundle(undefined, undefined, item.id, FULL_CACHED_OPTIONS);
	if (seq !== requestSeq) return;
	popupState.relatedLoading = false;
	if (!cachedBundle?.subject) {
		popupState.statsLoading = false;
		return;
	}

	popupState.item = cachedBundle.subject;
	popupState.relatedSubjects = cachedBundle.related ?? {};

	if (hasCachedReviewStats(cachedBundle.subject.reviews)) {
		popupState.statsLoading = false;
		return;
	}

	popupState.statsLoading = true;
	const withReviews = await fetchSubjectBundle(undefined, undefined, item.id, FULL_WITH_REVIEWS_OPTIONS);
	if (seq !== requestSeq) return;
	popupState.statsLoading = false;
	if (!withReviews?.subject) return;

	popupState.item = withReviews.subject;
	popupState.relatedSubjects = withReviews.related ?? {};
}

async function showBundle(
	bundle: SubjectBundle | null,
	seq: number,
	options: { pushHistory?: boolean },
): Promise<void> {
	if (seq !== requestSeq || !bundle?.subject) return;

	if (!popupState.focused) {
		popupState.relatedLoading = false;
		popupState.statsLoading = false;
		showSubjectBundle(bundle.subject, {}, options);
		return;
	}

	// Expanded panel: reuse a full bundle if we already have one, otherwise
	// show the preview now and upgrade it in the background.
	const id = bundle.subject.id;
	const full = bundleCache.get(cacheKey(undefined, undefined, id, FULL_WITH_REVIEWS_OPTIONS))
		?? bundleCache.get(cacheKey(undefined, undefined, id, FULL_CACHED_OPTIONS));
	showSubjectBundle(full?.subject ?? bundle.subject, full?.related ?? {}, options);
	void ensureFullSubjectForPopup();
}

/** Lookups faster than this never show a skeleton (avoids a flicker). */
const SKELETON_DELAY_MS = 120;

/**
 * Look a subject up and show it. While an uncached lookup is slow, the popup shows a
 * skeleton (with the already-known characters); cached subjects swap in instantly.
 */
async function openWithSkeleton(
	key: string,
	pendingCharacters: string,
	load: () => Promise<SubjectBundle | null>,
	options: { pushHistory?: boolean },
): Promise<void> {
	const seq = ++requestSeq;

	let skeletonTimer: ReturnType<typeof setTimeout> | null = null;
	if (!bundleCache.has(key)) {
		skeletonTimer = setTimeout(() => {
			if (seq !== requestSeq) return;
			popupState.loading = true;
			popupState.pendingCharacters = pendingCharacters;
			popupState.visible = true;
		}, SKELETON_DELAY_MS);
	}

	const bundle = await load();
	if (skeletonTimer) clearTimeout(skeletonTimer);
	if (seq !== requestSeq) return;

	// lookup failed: drop the skeleton (the previous subject, if any, stays)
	popupState.loading = false;
	popupState.pendingCharacters = '';
	await showBundle(bundle, seq, options);
}

/** Fetch a subject from cache and show it in the in-page details popup. */
export async function openHighlightedSubject(
	value: string,
	subjectType?: string,
	options: { pushHistory?: boolean } = {},
): Promise<void> {
	if (popupState.locked) return;

	const characters = value.trim();
	await openWithSkeleton(
		cacheKey(characters, subjectType, undefined, PREVIEW_OPTIONS),
		characters,
		() => fetchSubjectBundle(characters, subjectType, undefined, PREVIEW_OPTIONS),
		options,
	);
}

export async function openHighlightedSubjectById(
	subjectId: number,
	options: { pushHistory?: boolean } = {},
): Promise<void> {
	if (popupState.locked) return;

	const key = cacheKey(undefined, undefined, subjectId, PREVIEW_OPTIONS);
	const known = popupState.relatedSubjects?.[subjectId];

	// Related cards already hold the subject's data: show it right away, then
	// swap in the full lookup (school grades, etc.) without another history entry.
	if (known && !bundleCache.has(key)) {
		const seq = ++requestSeq;
		await showBundle({ subject: known, related: {} }, seq, options);
		if (popupState.focused) return; // the expanded panel upgrades itself
		const bundle = await fetchSubjectBundle(undefined, undefined, subjectId, PREVIEW_OPTIONS);
		if (seq === requestSeq && bundle?.subject) {
			showSubjectBundle(bundle.subject, popupState.relatedSubjects, { pushHistory: false });
		}
		return;
	}

	await openWithSkeleton(
		key,
		'',
		() => fetchSubjectBundle(undefined, undefined, subjectId, PREVIEW_OPTIONS),
		options,
	);
}

export async function navigatePopupHistoryBack(): Promise<boolean> {
	const entry = popHistoryEntry();
	if (!entry) return false;

	const seq = ++requestSeq;
	const bundle = await fetchSubjectBundle(undefined, undefined, entry.id, PREVIEW_OPTIONS);
	if (seq !== requestSeq || !bundle?.subject) return false;

	popupState.item = bundle.subject;
	popupState.relatedSubjects = {};
	if (popupState.focused) void ensureFullSubjectForPopup();
	return true;
}

export function clearSubjectBundleCache(): void {
	bundleCache.clear();
	inflight.clear();
	prefetched.clear();
}
