<template>
    <div class="loading-page">
        <div class="loading-stack">
            <section class="load-card hero-card">
                <div class="hero-spinner"></div>
                <div class="hero-title">Loading Subjects…</div>
                <div class="hero-sub">
                    Syncing {{ wk.syncProgress.label || 'levels' }}
                    ({{ wk.syncProgress.loaded }}/{{ wk.syncProgress.total || '…' }})
                </div>
                <div class="progress-track">
                    <div
                        class="progress-fill"
                        :class="{ indeterminate: !wk.syncProgress.total }"
                        :style="wk.syncProgress.total ? { width: syncPercent + '%' } : {}"
                    ></div>
                </div>
                <div class="hero-hint">The first sync downloads all 60 WaniKani levels and may take a few minutes.</div>
            </section>

            <section class="load-card">
                <div class="load-card-title">Progress overview</div>
                <div class="load-card-body">
                    <ProgressionBar :values="typeValues" :colors="typeColors" :type="'type'"/>
                    <ProgressionBar :values="progressionValues" :colors="srsStageColors" :type="'srs'"/>
                    <ProgressionTiles :values="progressionValues" :colors="srsStageColors" :type="'srs'"/>
                </div>
            </section>

            <section class="load-card">
                <div class="cached-row">
                    <span class="cached-label">Cached subjects</span>
                    <span class="cached-count">{{ wk.allSubjects.length }}</span>
                </div>
            </section>
        </div>
    </div>
</template>

<script>
import { useWKStore } from '@/stores';

import ProgressionTiles from '@/components/Home/ProgressionTiles.vue';
import ProgressionBar from '@/components/Home/ProgressionBar.vue';

import { srsStages, typeColors } from '@/utils/scripts/wanikani';
import { groupAssignmentsBySRSStage } from '@/utils/scripts/common';

export default {
    name: 'Loading',
    components: {
        ProgressionTiles,
        ProgressionBar
    },

    data() {
        return {
            progressionValues: [
				{ id: 0, items: [] },
				{ id: 1, items: [] },
				{ id: 2, items: [] },
				{ id: 3, items: [] },
				{ id: 4, items: [] },
				{ id: 5, items: [] },
				{ id: 6, items: [] },
				{ id: 7, items: [] },
				{ id: 8, items: [] },
				{ id: 9, items: [] },
			],
            typeValues: [
                { id: 'radical', items: [] },
                { id: 'kanji', items: [] },
                { id: 'vocabulary', items: [] },
                { id: 'kana_vocabulary', items: [] }
            ],
			srsStageColors: {},
			typeColors: typeColors,
        }
    },

    computed: {
        wk() {
            return useWKStore();
        },
		srsStages() {
			return srsStages;
		},
        syncPercent() {
            const { loaded, total } = this.wk.syncProgress;
            if (!total) return 0;
            return Math.min(100, Math.round((loaded / total) * 100));
        },
    },

	mounted() {
        this.srsStageColors = Object.fromEntries(Object.entries(this.srsStages).map(([k, v]) => [k, v.color]));
    },

    watch: {
        'wk.allSubjects': {
            handler(subjects) {
                this.updateProgressViews(subjects);
            },
            deep: true,
            immediate: true,
        },
    },

    methods: {
        updateProgressViews(subjects) {
            const progressionValues = groupAssignmentsBySRSStage(
                subjects.map(subject => ({
                    ...subject,
                    srs_stage: subject.assignment?.srs_stage,
                    subject_type: subject.type,
                })),
            );
            const typeValues = this.typeValues.map(entry => ({ ...entry, items: [] }));

            subjects.forEach(subject => {
                const typeIndex = typeValues.findIndex(entry => entry.id === subject.type);
                if (typeIndex !== -1) typeValues[typeIndex].items.push(subject);
            });

            this.progressionValues = progressionValues;
            this.typeValues = typeValues;
        },
    },
}
</script>

<style scoped>
.loading-page {
    padding: 16px 12px 24px;
    box-sizing: border-box;
}

.loading-stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.load-card {
    background: var(--fill-color);
    border: 1px solid var(--surface-border-color);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 10px var(--shadow-soft-color);
}

.hero-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 22px 18px 20px;
    text-align: center;
}

.hero-spinner {
    width: 26px;
    height: 26px;
    margin-bottom: 14px;
    border: 4px solid var(--surface-border-color);
    border-top-color: var(--wanikani);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.hero-title {
    font-size: 19px;
    font-weight: bold;
    color: var(--default-color);
}

.hero-sub {
    font-size: 12px;
    color: var(--muted-color);
    margin-top: 6px;
}

.hero-hint {
    font-size: 11px;
    color: var(--font-sec-color);
    margin-top: 10px;
}

.progress-track {
    width: 100%;
    max-width: 260px;
    height: 8px;
    margin: 12px auto 0;
    background: rgba(0, 0, 0, 0.08);
    border-radius: 999px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--wanikani), var(--wanikani-sec));
    transition: width 0.4s ease;
}

.progress-fill.indeterminate {
    width: 40%;
    animation: progress-indeterminate 1.2s ease-in-out infinite;
}

@keyframes progress-indeterminate {
    0% {
        margin-left: -40%;
    }
    100% {
        margin-left: 100%;
    }
}

.load-card-title {
    padding: 9px 14px;
    background: var(--default-color);
    color: white;
    font-weight: bold;
    font-size: 13px;
}

.load-card-body {
    padding: 10px 8px;
}

.cached-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 14px;
}

.cached-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--default-color);
}

.cached-count {
    font-size: 14px;
    font-weight: bold;
    color: var(--wanikani);
}

#progression-bar {
    padding: 7px 0 0;
}
</style>

<style>
.load-card #progression-bar>li:first-child,
.load-card #progression-bar>li:first-child>a {
	border-radius: 5px 0 0 5px;
}

.load-card #progression-bar>li:last-child,
.load-card #progression-bar>li:last-child>a {
	border-radius: 0 5px 5px 0;
}
</style>
