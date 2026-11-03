<template>
	<!--
		Your own milestones (milestones.ts): a level-up, accolades unlocked. Said once: when the
		popup opens, or as soon as they're noticed while it's open.
	-->
	<Teleport to="#top-toasts" defer>
	<Transition name="milestone-toast">
		<div v-if="lines.length" class="milestone-toast" role="status">
			<button type="button" class="milestone-toast-main" :title="levelUp ? 'Open your profile' : 'Open Accolades'" @click="open">
				<img v-if="!levelUp && accolades[0]" class="milestone-toast-image" :src="accolades[0].image" alt="">
				<span v-else class="milestone-toast-emoji" aria-hidden="true">🎉</span>
				<span class="milestone-toast-lines">
					<span v-for="(line, index) in shown" :key="index" class="milestone-toast-line">
						<template v-if="line.kind === 'level'">You reached level <b>{{ line.level }}</b>!</template>
						<template v-else>Unlocked: <b>{{ line.title }}</b></template>
					</span>
					<span v-if="lines.length > shown.length" class="milestone-toast-more">
						and {{ lines.length - shown.length }} more
					</span>
				</span>
			</button>
			<button type="button" class="milestone-toast-close" aria-label="Dismiss" @click="dismiss">×</button>
		</div>
	</Transition>
	</Teleport>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
	markMilestonesAnnounced,
	readMilestones,
	unannouncedMilestones,
	watchMilestones,
	type AccoladeUnlock,
	type LevelUp,
} from '@/utils/scripts/milestones';

const VISIBLE_MS = 8000;
const MAX_LINES = 3;

type Line = { kind: 'level'; level: number } | { kind: 'accolade'; title: string };

const router = useRouter();
const levelUp = ref<LevelUp | null>(null);
const accolades = ref<AccoladeUnlock[]>([]);
const lines = computed<Line[]>(() => [
	...(levelUp.value ? [{ kind: 'level' as const, level: levelUp.value.to }] : []),
	...accolades.value.map(unlock => ({ kind: 'accolade' as const, title: unlock.title })),
]);
const shown = computed(() => lines.value.slice(0, MAX_LINES));
let timer: ReturnType<typeof setTimeout> | null = null;
let stopWatching: (() => void) | null = null;

function dismiss() {
	levelUp.value = null;
	accolades.value = [];
	if (timer) clearTimeout(timer);
	timer = null;
}

function open() {
	const route = levelUp.value ? 'Profile' : 'Accolades';
	dismiss();
	void router.push({ name: route });
}

async function show(state: Awaited<ReturnType<typeof readMilestones>>) {
	const found = unannouncedMilestones(state);
	if (!found.levelUps.length && !found.accolades.length) return;
	// added to what's showing (a level-up's accolade comes a moment later)
	if (found.levelUps.length) levelUp.value = found.levelUps.at(-1)!;
	const showing = new Set(accolades.value.map(unlock => unlock.id));
	accolades.value = [...accolades.value, ...found.accolades.filter(unlock => !showing.has(unlock.id))];
	// once: closing the popup quickly doesn't bring it back
	await markMilestonesAnnounced();
	if (timer) clearTimeout(timer);
	timer = setTimeout(dismiss, VISIBLE_MS + (lines.value.length > 1 ? 3000 : 0));
}

onMounted(async () => {
	stopWatching = watchMilestones(state => void show(state));
	await show(await readMilestones());
});

onBeforeUnmount(() => {
	stopWatching?.();
	if (timer) clearTimeout(timer);
});
</script>

<style scoped>
/* in the top toasts stack (App.vue), like the friends' toast */
.milestone-toast {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 6px 6px 8px;
	box-sizing: border-box;
	border-radius: 12px;
	border: 1px solid var(--surface-border-color);
	border-left: 4px solid var(--wanikani, #f100a1);
	background: var(--fill-color);
	box-shadow: 0 6px 20px var(--shadow-soft-color), 0 1px 4px rgba(0, 0, 0, 0.15);
}

.milestone-toast-main {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 2px;
	border: none;
	background: transparent;
	color: var(--heading-color, #2a2d48);
	font-family: inherit;
	font-size: 12.5px;
	text-align: left;
	cursor: pointer;
}

.milestone-toast-image,
.milestone-toast-emoji {
	flex-shrink: 0;
	width: 30px;
	height: 30px;
}

.milestone-toast-emoji {
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22px;
	line-height: 1;
}

.milestone-toast-lines {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
	line-height: 1.35;
}

.milestone-toast-more {
	font-size: 11px;
	color: var(--font-sec-color);
}

.milestone-toast-close {
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	padding: 0;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: var(--font-sec-color);
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
}

.milestone-toast-close:hover {
	background: var(--surface-muted-color);
}

.milestone-toast-enter-active,
.milestone-toast-leave-active {
	transition: opacity 0.25s ease, transform 0.25s ease;
}

.milestone-toast-enter-from,
.milestone-toast-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}
</style>
