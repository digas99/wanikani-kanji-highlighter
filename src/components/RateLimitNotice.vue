<template>
	<Transition name="rate-limit">
		<div v-if="wk.rateLimitNotice" class="rate-limit-notice" role="alert">
			<div class="rate-limit-header">
				<strong>Too many requests</strong>
				<button
					type="button"
					class="rate-limit-dismiss clickable"
					aria-label="Dismiss rate limit notice"
					@click="wk.dismissRateLimitNotice()"
				>
					×
				</button>
			</div>
			<div class="rate-limit-body">
				<p>Loading will continue in {{ secondsLeft }}s…</p>
				<div class="rate-limit-track">
					<div class="rate-limit-fill" :style="{ width: progressPercent + '%' }"></div>
				</div>
			</div>
		</div>
	</Transition>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useWKStore } from '@/stores';

const wk = useWKStore();
const now = ref(Date.now());
const initialSeconds = ref(1);
let tickTimer: ReturnType<typeof setInterval> | null = null;

const secondsLeft = computed(() => {
	if (!wk.rateLimitNotice) return 0;
	return Math.max(0, Math.ceil((wk.rateLimitNotice.retryAt - now.value) / 1000));
});

const progressPercent = computed(() => {
	if (!wk.rateLimitNotice || initialSeconds.value <= 0) return 0;
	return Math.min(100, Math.round((secondsLeft.value / initialSeconds.value) * 100));
});

function stopTick() {
	if (tickTimer) {
		clearInterval(tickTimer);
		tickTimer = null;
	}
}

function startTick() {
	stopTick();
	now.value = Date.now();
	tickTimer = setInterval(() => {
		now.value = Date.now();
	}, 250);
}

watch(
	() => wk.rateLimitNotice,
	notice => {
		if (notice) {
			const remaining = Math.max(1, Math.ceil((notice.retryAt - Date.now()) / 1000));
			initialSeconds.value = Math.max(initialSeconds.value, remaining);
			startTick();
		} else {
			initialSeconds.value = 1;
			stopTick();
		}
	},
	{ immediate: true },
);

watch(secondsLeft, seconds => {
	if (wk.rateLimitNotice && seconds <= 0) {
		wk.dismissRateLimitNotice();
	}
});

onBeforeUnmount(stopTick);
</script>

<style scoped>
.rate-limit-notice {
	position: fixed;
	left: 10px;
	right: 10px;
	bottom: 10px;
	z-index: 100;
	overflow: hidden;
	border-radius: 12px;
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	box-shadow: 0 4px 18px var(--shadow-soft-color);
	color: var(--default-color);
}

.rate-limit-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: 9px 14px;
	background: var(--default-color);
	color: white;
}

.rate-limit-header strong {
	font-size: 13px;
	font-weight: 700;
}

.rate-limit-body {
	padding: 12px 14px 14px;
	text-align: left;
	line-height: 1.4;
}

.rate-limit-body p {
	margin: 0 0 10px;
	font-size: 11px;
	color: var(--muted-color);
}

.rate-limit-track {
	width: 100%;
	height: 8px;
	background: rgba(0, 0, 0, 0.08);
	border-radius: 999px;
	overflow: hidden;
}

.rate-limit-fill {
	height: 100%;
	border-radius: 999px;
	background: linear-gradient(90deg, var(--wanikani), var(--wanikani-sec));
	transition: width 0.25s linear;
}

.rate-limit-dismiss {
	flex-shrink: 0;
	border: none;
	background: transparent;
	color: rgba(255, 255, 255, 0.85);
	font-size: 20px;
	line-height: 1;
	padding: 0;
	width: 22px;
	height: 22px;
}

.rate-limit-dismiss:hover {
	color: var(--wanikani);
}

.rate-limit-enter-active,
.rate-limit-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.rate-limit-enter-from,
.rate-limit-leave-to {
	opacity: 0;
	transform: translateY(8px);
}
</style>
