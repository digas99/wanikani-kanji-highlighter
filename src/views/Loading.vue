<template>
    <div class="loading-page">
        <div class="loading-stack">
            <!-- the sync: a ring with how far it got, what it's doing, about how long is left -->
            <section class="load-card hero-card">
                <div class="hero-ring" :class="{ spinning: !hasTotal || waiting }" :title="hasTotal ? `${syncPercent}%` : ''">
                    <svg viewBox="0 0 44 44" aria-hidden="true">
                        <circle class="ring-track" cx="22" cy="22" r="19" />
                        <circle
                            class="ring-fill"
                            cx="22"
                            cy="22"
                            r="19"
                            :stroke-dasharray="RING"
                            :stroke-dashoffset="hasTotal && !waiting ? RING * (1 - syncPercent / 100) : RING * 0.72"
                        />
                    </svg>
                    <span v-if="hasTotal && !waiting" class="ring-label">{{ syncPercent }}%</span>
                </div>
                <div class="hero-title">{{ waiting ? 'Waiting for WaniKani…' : 'Loading Subjects…' }}</div>
                <div class="hero-sub">
                    <template v-if="waiting">
                        WaniKani asked to slow down (rate limit): resumes in <b>{{ waitSeconds }}s</b>
                    </template>
                    <template v-else>{{ stepLabel }}<template v-if="etaLabel"> · {{ etaLabel }}</template></template>
                </div>
                <div class="hero-saved">
                    <b>{{ wk.allSubjects.length.toLocaleString() }}</b> subjects saved so far
                </div>
                <div class="hero-hint">
                    The first sync downloads all 60 WaniKani levels.
                    <b>You can close this:</b> it carries on in the background.
                </div>
            </section>

            <!-- what's known already (arrives in seconds, long before the subjects) -->
            <section v-if="username" class="load-card welcome-card">
                <img class="welcome-avatar" :src="wk.userAvatar || defaultAvatar" alt="" />
                <div class="welcome-text">
                    <div class="welcome-title">Welcome, <b>{{ username }}</b></div>
                    <div class="welcome-chips">
                        <span v-if="userLevel" class="welcome-chip">Level {{ userLevel }}</span>
                        <span class="welcome-chip reviews">{{ wk.reviewsCount }} {{ wk.reviewsCount === 1 ? 'review' : 'reviews' }} waiting</span>
                        <span class="welcome-chip lessons">{{ wk.lessonsCount }} {{ wk.lessonsCount === 1 ? 'lesson' : 'lessons' }}</span>
                    </div>
                </div>
            </section>

            <!-- the subjects saved so far: by type, by SRS stage (in your colours) -->
            <section v-if="wk.allSubjects.length" class="load-card">
                <div class="load-card-title">Progress overview</div>
                <div class="load-card-body">
                    <ProgressionBar :values="typeValues" :colors="typeColorsThemed" :type="'type'" />
                    <div class="legend">
                        <span v-for="entry in TYPE_LEGEND" :key="entry.key"><span class="dot" :style="{ background: typeColorsThemed[entry.key] }"></span>{{ entry.label }}</span>
                    </div>
                    <ProgressionBar :values="progressionValues" :colors="srsStageColors" :type="'srs'" />
                    <div class="legend">
                        <span v-for="entry in SRS_LEGEND" :key="entry.key"><span class="dot" :style="{ background: srsStageColors[entry.stage] }"></span>{{ entry.label }}</span>
                    </div>
                </div>
            </section>

            <!-- something to read meanwhile: what the extension does -->
            <section class="load-card tip-card">
                <span class="tip-label">Did you know?</span>
                <Transition name="tip" mode="out-in">
                    <p :key="tipIndex" class="tip-text">{{ TIPS[tipIndex] }}</p>
                </Transition>
            </section>
        </div>
    </div>
</template>

<script>
import { browser } from 'wxt/browser';
import { useWKStore } from '@/stores';
import { useSettingsStore } from '@/stores/settings';

import ProgressionBar from '@/components/Home/ProgressionBar.vue';

import { srsStages, typeColors } from '@/utils/scripts/wanikani';
import { groupAssignmentsBySRSStage } from '@/utils/scripts/common';
import defaultAvatar from '@/assets/wanikani-default.png';

const RING = 2 * Math.PI * 19;

/** SRS stage → its colour in Settings → Appearance */
const STAGE_COLOR_KEYS = ['int_color', 'ap1_color', 'ap2_color', 'ap3_color', 'ap4_color', 'gr1_color', 'gr2_color', 'mst_color', 'enl_color', 'brn_color'];

const TYPE_LEGEND = [
    { key: 'radical', label: 'Radicals' },
    { key: 'kanji', label: 'Kanji' },
    { key: 'vocabulary', label: 'Vocabulary' },
];

/** the bar's stages, by group (each group's last stage's colour) */
const SRS_LEGEND = [
    { key: 'apprentice', label: 'Apprentice', stage: 4 },
    { key: 'guru', label: 'Guru', stage: 6 },
    { key: 'master', label: 'Master', stage: 7 },
    { key: 'enlightened', label: 'Enlightened', stage: 8 },
    { key: 'burned', label: 'Burned', stage: 9 },
];

const TIPS = [
    'Hover a highlighted kanji or word on any page to see its meaning, readings and your progress.',
    'The Home page shows a calendar of everything you started, passed and burned: click a day to see its subjects.',
    'Pick how pages are highlighted in Settings → Highlight: by learned, SRS stage, JLPT level or Jōyō grade.',
    'Turn on the reading level bar (Settings → Reading) to see how much of a page’s kanji you know.',
    'Back up your settings and history to a file or your Google Drive in Settings → Data.',
    'On WaniKani’s reviews, the extension can show the subject’s SRS stage and stats, and a review timer (Settings → Details).',
    'The Trouble page lists the subjects you keep getting wrong, ready to practice.',
    'Right-click selected Japanese text on a page to look it up in the extension.',
    'Add friends by their WaniKani username to follow their levels.',
];
const TIP_EVERY_MS = 7000;

export default {
    name: 'Loading',
    components: {
        ProgressionBar,
    },

    data() {
        return {
            progressionValues: Array.from({ length: 10 }, (_, id) => ({ id, items: [] })),
            typeValues: [
                { id: 'radical', items: [] },
                { id: 'kanji', items: [] },
                { id: 'vocabulary', items: [] },
                { id: 'kana_vocabulary', items: [] },
            ],
            defaultAvatar,
            RING,
            TYPE_LEGEND,
            SRS_LEGEND,
            TIPS,
            tipIndex: Math.floor(Math.random() * TIPS.length),
            /** where the levels' download started (for the time left) */
            started: null,
            now: Date.now(),
        };
    },

    computed: {
        wk() {
            return useWKStore();
        },
        appearance() {
            return useSettingsStore().settings.appearance ?? {};
        },
        srsStageColors() {
            return Object.fromEntries(Object.entries(srsStages).map(([stage, value]) => [stage, this.appearance[STAGE_COLOR_KEYS[stage]] || value.color]));
        },
        typeColorsThemed() {
            return {
                radical: this.appearance.radical_color || typeColors.radical,
                kanji: this.appearance.kanji_color || typeColors.kanji,
                vocabulary: this.appearance.vocab_color || typeColors.vocabulary,
                kana_vocabulary: this.appearance.vocab_color || typeColors.kana_vocabulary,
            };
        },
        hasTotal() {
            return Boolean(this.wk.syncProgress.total);
        },
        syncPercent() {
            const { loaded, total } = this.wk.syncProgress;
            if (!total) return 0;
            return Math.min(100, Math.round((loaded / total) * 100));
        },
        stepLabel() {
            const { loaded, total, label } = this.wk.syncProgress;
            if (label === 'dashboard') return 'Getting your dashboard';
            if (label === 'subjects' && total) return `Level ${Math.min(loaded + 1, total)} of ${total}`;
            return 'Getting ready';
        },
        /** from how fast the levels came so far (once a few have) */
        etaLabel() {
            const { loaded, total, label } = this.wk.syncProgress;
            if (label !== 'subjects' || !this.started || !total || loaded >= total) return '';
            const done = loaded - this.started.loaded;
            const elapsed = this.now - this.started.at;
            if (done < 2 || elapsed < 3000) return '';
            const left = ((total - loaded) * elapsed) / done;
            if (left < 60_000) return 'less than a minute left';
            const minutes = Math.round(left / 60_000);
            return `about ${minutes} min left`;
        },
        waiting() {
            const notice = this.wk.rateLimitNotice;
            return Boolean(notice && notice.retryAt > this.now);
        },
        waitSeconds() {
            return Math.max(1, Math.ceil((this.wk.rateLimitNotice.retryAt - this.now) / 1000));
        },
        username() {
            return this.wk.userInfo?.username ?? '';
        },
        userLevel() {
            return this.wk.userInfo?.level ?? null;
        },
    },

    watch: {
        'wk.allSubjects': {
            handler(subjects) {
                this.updateProgressViews(subjects);
            },
            immediate: true,
        },
        // the levels' download started (or restarted): the time left counts from here
        'wk.syncProgress': {
            handler(progress) {
                if (progress.label !== 'subjects') return;
                if (!this.started || progress.loaded < this.started.loaded) this.started = { loaded: progress.loaded, at: Date.now() };
            },
            immediate: true,
        },
    },

    mounted() {
        this.clock = setInterval(() => { this.now = Date.now(); }, 1000);
        this.tipTimer = setInterval(() => { this.tipIndex = (this.tipIndex + 1) % TIPS.length; }, TIP_EVERY_MS);
        // closing the popup hands the sync to the background (it goes on from where this got)
        try {
            this.port = browser.runtime.connect({ name: 'wkh:first-sync' });
        } catch {
            this.port = null;
        }
    },

    beforeUnmount() {
        clearInterval(this.clock);
        clearInterval(this.tipTimer);
        // done here (not closed): nothing to hand over
        this.port?.disconnect();
    },

    methods: {
        updateProgressViews(subjects) {
            this.progressionValues = groupAssignmentsBySRSStage(
                subjects.map(subject => ({
                    ...subject,
                    srs_stage: subject.assignment?.srs_stage,
                    subject_type: subject.type,
                })),
            );
            const typeValues = this.typeValues.map(entry => ({ ...entry, items: [] }));
            for (const subject of subjects) {
                typeValues.find(entry => entry.id === subject.type)?.items.push(subject);
            }
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
    gap: 8px;
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

/* the progress as a ring, its percentage inside (spinning while there's no count yet) */
.hero-ring {
    position: relative;
    width: 64px;
    height: 64px;
    margin-bottom: 12px;
}

.hero-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
}

.hero-ring.spinning svg {
    animation: spin 0.9s linear infinite;
}

.ring-track {
    fill: none;
    stroke: var(--surface-border-color);
    stroke-width: 4;
}

.ring-fill {
    fill: none;
    stroke: var(--wanikani);
    stroke-width: 4;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.4s ease;
}

.ring-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    color: var(--heading-color, #2a2d48);
    font-variant-numeric: tabular-nums;
}

@keyframes spin {
    from {
        transform: rotate(-90deg);
    }
    to {
        transform: rotate(270deg);
    }
}

.hero-title {
    font-size: 19px;
    font-weight: bold;
    color: var(--heading-color, #2a2d48);
}

.hero-sub {
    font-size: 12.5px;
    color: var(--font-sec-color);
    margin-top: 6px;
    font-variant-numeric: tabular-nums;
}

.hero-saved {
    margin-top: 10px;
    font-size: 12px;
    color: var(--font-sec-color);
}

.hero-saved b {
    color: var(--wanikani);
}

.hero-hint {
    font-size: 11px;
    line-height: 1.5;
    color: var(--font-sec-color);
    margin-top: 10px;
}

.hero-hint b {
    color: var(--font-color);
}

/* who's syncing: known in seconds */
.welcome-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
}

.welcome-avatar {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--surface-border-color);
    background: var(--surface-muted-color);
}

.welcome-title {
    font-size: 14px;
    color: var(--heading-color, #2a2d48);
}

.welcome-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 5px;
}

.welcome-chip {
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--surface-muted-color);
    color: var(--font-color);
    font-size: 11px;
    font-weight: 700;
}

.welcome-chip.reviews {
    background: color-mix(in srgb, var(--wanikani-sec, #00aaff) 15%, transparent);
    color: var(--wanikani-sec, #00aaff);
}

.welcome-chip.lessons {
    background: color-mix(in srgb, var(--wanikani, #f100a1) 13%, transparent);
    color: var(--wanikani, #f100a1);
}

.load-card-title {
	/* pink pill label, as in the subject details popup */
	display: block;
	width: fit-content;
	margin: 12px 12px 2px;
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-weight: 700;
	font-size: 11.5px;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	line-height: 1.4;
}

.load-card-body {
    padding: 6px 10px 12px;
}

/* what each colour of the bar above is */
.legend {
    display: flex;
    flex-wrap: wrap;
    gap: 3px 12px;
    margin: 5px 2px 4px;
    font-size: 11px;
    color: var(--font-sec-color);
}

.legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

/* a span (an <i> would get the global icon style) */
.legend .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 3px;
}

/* tips while waiting */
.tip-card {
    padding: 12px 14px;
}

.tip-label {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pill-color, #e36f94);
}

.tip-text {
    margin: 4px 0 0;
    min-height: 3em;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--font-color);
}

.tip-enter-active,
.tip-leave-active {
    transition: opacity 0.35s ease, transform 0.35s ease;
}

.tip-enter-from {
    opacity: 0;
    transform: translateY(4px);
}

.tip-leave-to {
    opacity: 0;
    transform: translateY(-4px);
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
