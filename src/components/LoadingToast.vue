<template>
	<Transition name="sync-toast">
		<div v-if="visible" class="sync-toast" role="status" aria-live="polite">
			<div class="sync-toast-content">
				<strong>Syncing all WaniKani subjects</strong>
				<p>
					{{ progressLabel }}
					({{ wk.syncProgress.loaded }}/{{ wk.syncProgress.total || '…' }})
				</p>
				<div class="sync-toast-track">
					<div
						class="sync-toast-fill"
						:class="{ indeterminate: !wk.syncProgress.total }"
						:style="wk.syncProgress.total ? { width: syncPercent + '%' } : {}"
					></div>
				</div>
			</div>
		</div>
	</Transition>
</template>

<script>
import { useWKStore } from '@/stores';

export default {
	name: 'LoadingToast',

	computed: {
		wk() {
			return useWKStore();
		},
		visible() {
			return this.wk.showSyncToast;
		},
		progressLabel() {
			const label = this.wk.syncProgress.label;
			if (label === 'dashboard') return 'Loading dashboard';
			if (label === 'subjects') return 'Loading levels';
			return label || 'Loading';
		},
		syncPercent() {
			const { loaded, total } = this.wk.syncProgress;
			if (!total) return 0;
			return Math.min(100, Math.round((loaded / total) * 100));
		},
	},
};
</script>

<style scoped>
.sync-toast {
	position: fixed;
	left: 10px;
	right: 10px;
	bottom: 10px;
	z-index: 100;
	padding: 12px 14px;
	border-radius: 10px;
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	box-shadow: 0 4px 18px var(--shadow-soft-color);
	color: var(--default-color);
}

.sync-toast-content {
	text-align: left;
	line-height: 1.4;
}

.sync-toast-content strong {
	display: block;
	font-size: 13px;
	margin-bottom: 4px;
}

.sync-toast-content p {
	margin: 0 0 10px;
	font-size: 11px;
	color: var(--muted-color);
}

.sync-toast-track {
	width: 100%;
	height: 8px;
	background: rgba(0, 0, 0, 0.08);
	border-radius: 999px;
	overflow: hidden;
}

.sync-toast-fill {
	height: 100%;
	border-radius: 999px;
	background: linear-gradient(90deg, var(--wanikani), var(--wanikani-sec));
	transition: width 0.4s ease;
}

.sync-toast-fill.indeterminate {
	width: 40%;
	animation: sync-toast-indeterminate 1.2s ease-in-out infinite;
}

@keyframes sync-toast-indeterminate {
	0% {
		margin-left: -40%;
	}
	100% {
		margin-left: 100%;
	}
}

.sync-toast-enter-active,
.sync-toast-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.sync-toast-enter-from,
.sync-toast-leave-to {
	opacity: 0;
	transform: translateY(8px);
}
</style>
