import { computed, effectScope, ref, type ComputedRef } from 'vue';
import { useWKStore } from '@/stores';
import {
	ACCOLADES_SNAPSHOT_KEY,
	computeAccolades,
	countAccolades,
	type AccoladeGroup,
	type AccoladeMilestone,
	type AccoladeType,
} from './accolades';
import { readActivityView, watchDailyActivity } from './dailyActivity';
import { useFriendCount, useFriendCountLoaded } from './friendCount';

type Accolades = {
	groups: ComputedRef<AccoladeGroup[]>;
	totals: ComputedRef<{ unlocked: number; total: number }>;
	/** for the Home / Profile buttons: the highest level badge, else the first unlocked one */
	latest: ComputedRef<AccoladeMilestone | null>;
	/** everything they're counted from is in (else a badge could look newly unlocked later) */
	complete: ComputedRef<boolean>;
};

let shared: Accolades | null = null;

type GroupSnapshot = { unlocked: string[]; progress: AccoladeGroup['progress'] };

function readSnapshot(): Partial<Record<AccoladeType, GroupSnapshot>> {
	try {
		return JSON.parse(localStorage.getItem(ACCOLADES_SNAPSHOT_KEY) ?? '{}') ?? {};
	} catch {
		return {};
	}
}

/** Remembers the kinds counted from loaded data (only when something changed). */
function saveSnapshot(groups: AccoladeGroup[], loaded: Record<AccoladeType, boolean>): void {
	const snapshot = readSnapshot();
	for (const group of groups) {
		if (!loaded[group.type]) continue;
		snapshot[group.type] = {
			unlocked: group.milestones.filter(milestone => milestone.unlocked).map(milestone => milestone.id),
			progress: group.progress,
		};
	}
	const json = JSON.stringify(snapshot);
	try {
		if (localStorage.getItem(ACCOLADES_SNAPSHOT_KEY) !== json) localStorage.setItem(ACCOLADES_SNAPSHOT_KEY, json);
	} catch {
		// only smooths the first moments after opening
	}
}

function withSnapshot(group: AccoladeGroup, saved: GroupSnapshot | undefined): AccoladeGroup {
	if (!saved) return group;
	const unlocked = new Set(saved.unlocked);
	const milestones = group.milestones.map(milestone => ({ ...milestone, unlocked: unlocked.has(milestone.id) }));
	return {
		...group,
		milestones,
		unlockedCount: milestones.filter(milestone => milestone.unlocked).length,
		progress: saved.progress,
	};
}

/** The accolades, computed once for the whole popup (Home, Profile, Accolades, the unlock check). */
export function useAccolades(): Accolades {
	if (shared) return shared;
	shared = effectScope(true).run(() => {
		const wk = useWKStore();
		const friendCount = useFriendCount();
		const friendsLoaded = useFriendCountLoaded();
		const correctAnswers = ref<number | null>(null);
		void readActivityView().then(view => { correctAnswers.value = view.correctAnswers; });
		watchDailyActivity(view => { correctAnswers.value = view.correctAnswers; });

		const subjectsComplete = computed(() => wk._subjectsHydratedLevel != null);
		/** what each kind is counted from is in (the school ones keep their own snapshot) */
		const loaded = computed<Record<AccoladeType, boolean>>(() => ({
			level: Boolean(wk.userInfo?.level),
			anniversary: Boolean(wk.userInfo?.started_at),
			burned: wk.assignments.length > 0,
			speed: Boolean(wk.levelsStats),
			answers: correctAnswers.value != null,
			cleared: subjectsComplete.value && wk.assignments.length > 0,
			jlpt: true,
			joyo: true,
			social: friendsLoaded.value,
		}));
		const groups = computed(() => {
			const fresh = computeAccolades({
				userInfo: wk.userInfo,
				assignments: wk.assignments,
				subjects: wk.allSubjects,
				subjectsComplete: subjectsComplete.value,
				levelsStats: wk.levelsStats,
				correctAnswers: correctAnswers.value,
				friendCount: friendCount.value,
			});
			// still loading: the last known result, so the counts don't climb as the data comes in
			const snapshot = readSnapshot();
			const shown = fresh.map(group => (loaded.value[group.type] ? group : withSnapshot(group, snapshot[group.type])));
			saveSnapshot(shown, loaded.value);
			return shown;
		});
		const unlocked = (group: AccoladeGroup) => group.milestones.filter(milestone => milestone.unlocked);
		return {
			groups,
			totals: computed(() => countAccolades(groups.value)),
			latest: computed(() => {
				const [levelGroup, ...others] = groups.value;
				return (levelGroup && unlocked(levelGroup).at(-1)) ?? others.flatMap(unlocked)[0] ?? null;
			}),
			complete: computed(() => Boolean(
				wk.userInfo?.level
				&& wk.assignments.length
				&& subjectsComplete.value
				&& wk.levelsStats
				&& correctAnswers.value != null
				&& friendsLoaded.value,
			)),
		};
	})!;
	return shared;
}
