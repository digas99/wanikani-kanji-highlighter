<template>
	<!--
		The vocabulary's reading(s) with the pitch accent drawn on them: a line over the high
		morae, a hook where the pitch drops. A plain reading while loading / when unknown.
	-->
	<span v-if="!onlyWithPitch || hasPitch" class="sd-pitch">
		<template v-for="(entry, index) in entries" :key="entry.reading">
			<span v-if="index" class="sd-pitch-separator">、</span>
			<template v-if="entry.accents.length">
				<template v-for="(accent, accentIndex) in entry.accents" :key="accentIndex">
					<span v-if="accentIndex" class="sd-pitch-or" title="Both are used">/</span>
					<span class="sd-pitch-word" :title="accent.title">
						<span
							v-for="(mora, moraIndex) in accent.morae"
							:key="moraIndex"
							class="sd-pitch-mora"
							:class="{ high: mora.high, drop: mora.drop }"
						>{{ mora.text }}</span>
						<!-- heiban: a following particle stays high (that's what tells it from odaka) -->
						<span v-if="accent.particleHigh" class="sd-pitch-particle" aria-hidden="true"></span>
						<sup class="sd-pitch-number">{{ accent.drop }}</sup>
					</span>
				</template>
			</template>
			<span v-else>{{ entry.reading }}</span>
		</template>
	</span>
</template>

<script>
import {
	getPitchAccents,
	pitchLevels,
	pitchPattern,
	splitMorae,
} from '@/utils/scripts/pitchAccent';

const PATTERN_TEXT = {
	heiban: 'Heiban (flat): low first, then high, staying high on a following particle',
	atamadaka: 'Atamadaka: high on the first mora, then low',
	nakadaka: 'Nakadaka: rises after the first mora, drops before the end',
	odaka: 'Odaka: rises after the first mora, drops on a following particle',
};

export default {
	name: 'SubjectPitchReading',

	props: {
		item: {
			type: Object,
			required: true,
		},
		/** Show nothing without pitch data (kana vocabulary: the word is already shown above). */
		onlyWithPitch: Boolean,
	},

	data() {
		return {
			pitch: [],
		};
	},

	computed: {
		/** WaniKani's readings; kana vocabulary is its own reading. */
		readings() {
			if (this.item.type === 'kana_vocabulary') return [this.item.characters].filter(Boolean);
			return (this.item.readings ?? []).map(reading => reading.reading).filter(Boolean);
		},
		hasPitch() {
			return this.pitch.some(entry => entry.accents.length);
		},
		entries() {
			return this.readings.map(reading => {
				const found = this.pitch.find(entry => entry.reading === reading);
				const morae = splitMorae(reading);
				return {
					reading,
					accents: (found?.accents ?? []).map(accent => {
						const levels = pitchLevels(accent.drop, morae.length);
						const pattern = pitchPattern(accent.drop, morae.length);
						return {
							drop: accent.drop,
							particleHigh: levels.particle,
							morae: morae.map((text, index) => ({
								text,
								high: levels.morae[index],
								// the hook: high here, low on the next mora (or the particle after the last)
								drop: levels.morae[index] && !(index + 1 < morae.length ? levels.morae[index + 1] : levels.particle),
							})),
							title: [
								`Pitch accent ${accent.drop}: ${PATTERN_TEXT[pattern]}`,
								accent.partOfSpeech && `(as ${accent.partOfSpeech})`,
								'Source: Kanjium (CC BY-SA 4.0)',
							].filter(Boolean).join('\n'),
						};
					}),
				};
			});
		},
	},

	watch: {
		'item.id': {
			handler() {
				void this.load();
			},
			immediate: true,
		},
	},

	methods: {
		async load() {
			const id = this.item.id;
			this.pitch = [];
			const pitch = await getPitchAccents(this.item.characters ?? '', this.readings);
			if (this.item.id === id) this.pitch = pitch;
		},
	},
};
</script>

<style scoped>
.sd-pitch {
	/* the pitch lines sit above the reading: keep them clear of the big word */
	margin-top: 14px;
	display: inline-flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: center;
	gap: 2px 0;
}

.sd-pitch-word {
	display: inline-flex;
	align-items: flex-end;
	white-space: nowrap;
	cursor: help;
	/* a little larger than the plain readings: the marks need room to read */
	font-size: 1.1em;
}

.sd-pitch-mora {
	position: relative;
	/* room for the line above, so high and low morae sit on the same baseline */
	padding-top: 4px;
	border-top: 2px solid transparent;
	line-height: 1.25;
}

.sd-pitch-mora.high {
	border-top-color: currentColor;
}

/* where the pitch drops: a short tick down from the line (not through the kana) */
.sd-pitch-mora.drop::after {
	content: '';
	position: absolute;
	top: -2px;
	right: -1px;
	height: 0.55em;
	border-right: 2px solid currentColor;
}

/* a particle slot after heiban words: the line carries on (dashed, it's not part of the word) */
.sd-pitch-particle {
	width: 0.6em;
	align-self: stretch;
	border-top: 2px dashed currentColor;
	opacity: 0.55;
}

.sd-pitch-number {
	margin-left: 2px;
	font-size: 0.6em;
	opacity: 0.7;
	align-self: flex-start;
}

.sd-pitch-or,
.sd-pitch-separator {
	margin: 0 5px;
	opacity: 0.5;
}
</style>
