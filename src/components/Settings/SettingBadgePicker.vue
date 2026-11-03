<template>
	<!-- the extension icon's badge: a card per choice, in groups, each with a preview of the badge -->
	<div class="badge-picker">
		<div class="badge-picker-head">
			<span class="settings-item-label">Badge</span>
			<span class="settings-description">What the extension icon shows</span>
		</div>

		<div v-for="group in groups" :key="group.id" class="badge-picker-group">
			<p class="badge-picker-group-title">{{ group.title }}</p>
			<div class="badge-picker-options" role="radiogroup" :aria-label="group.title">
				<button
					v-for="option in group.options"
					:key="option.value"
					type="button"
					role="radio"
					class="badge-picker-option"
					:class="{ active: modelValue === option.value }"
					:aria-checked="modelValue === option.value"
					@click="$emit('update:modelValue', option.value)"
				>
					<!-- the icon with its badge, as it would look -->
					<span class="badge-picker-preview" aria-hidden="true">
						<img :src="icon" alt="">
						<span v-if="option.example" class="badge-picker-badge" :style="{ background: option.color }">{{ option.example }}</span>
					</span>
					<b class="badge-picker-label">{{ option.label }}</b>
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import icon from '@/assets/logo.png';

/** The choices (extensionBadge.ts, BadgeMode), grouped: per page, for the account, none. */
const GROUPS = [
	{
		id: 'page',
		title: 'For each page',
		options: [
			{ value: 'subjects', label: 'Highlighted subjects', hint: 'How many are on the page', example: '35', color: '#f100a1' },
			{ value: 'reading_level', label: 'JLPT level', hint: "The page's reading level", example: 'N3', color: '#e0a020' },
			{ value: 'reading_joyo', label: 'Jōyō grade', hint: "The page's school grade", example: 'G3', color: '#7a9e2a' },
		],
	},
	{
		id: 'account',
		title: 'For your account',
		options: [
			{ value: 'reviews', label: 'Reviews', hint: 'Available now', example: '42', color: '#00aaff' },
			{ value: 'lessons', label: 'Lessons', hint: 'Available now', example: '15', color: '#f100a1' },
			{ value: 'next_reviews', label: 'Upcoming reviews', hint: 'How many are coming', example: '+12', color: '#a100f1' },
			{ value: 'next_time', label: 'Next reviews in', hint: 'How long until they come', example: '3h', color: '#6f3ff5' },
		],
	},
	{
		id: 'none',
		title: 'Nothing',
		options: [
			{ value: 'none', label: 'No badge', hint: 'Just the icon', example: '', color: '' },
		],
	},
];

export default {
	name: 'SettingBadgePicker',

	props: {
		modelValue: { type: String, required: true },
	},

	emits: ['update:modelValue'],

	data() {
		return { groups: GROUPS, icon };
	},
};
</script>

<style scoped>
.badge-picker {
	padding: 10px 14px 14px;
}

.badge-picker-head {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin-bottom: 8px;
}

.badge-picker-group + .badge-picker-group {
	margin-top: 10px;
}

.badge-picker-group-title {
	margin: 0 0 6px;
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.05em;
	text-transform: uppercase;
	color: var(--font-sec-color, #747474);
}

.badge-picker-options {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 6px;
}

.badge-picker-option {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 7px 8px;
	border: 1.5px solid var(--surface-border-color, #e6e6ef);
	border-radius: 10px;
	background: var(--surface-muted-color, #f7f7fb);
	color: inherit;
	font-family: inherit;
	text-align: left;
	cursor: pointer;
	transition: border-color 0.12s, background-color 0.12s;
}

.badge-picker-option:hover {
	border-color: var(--wanikani, #f100a1);
}

.badge-picker-option.active {
	border-color: var(--wanikani, #f100a1);
	background: color-mix(in srgb, var(--wanikani, #f100a1) 9%, var(--fill-color, #fff));
	box-shadow: 0 0 0 1px var(--wanikani, #f100a1);
}

/* the icon, its badge on the bottom right (as the browser draws it) */
.badge-picker-preview {
	position: relative;
	flex-shrink: 0;
	width: 30px;
	height: 30px;
}

.badge-picker-preview img {
	width: 24px;
	height: 24px;
	object-fit: contain;
}

.badge-picker-badge {
	position: absolute;
	right: -4px;
	bottom: 0;
	min-width: 16px;
	padding: 0 3px;
	box-sizing: border-box;
	border-radius: 4px;
	color: #fff;
	font-size: 9px;
	font-weight: 800;
	line-height: 13px;
	text-align: center;
	white-space: nowrap;
}

.badge-picker-label {
	min-width: 0;
	font-size: 11px;
	line-height: 1.25;
	color: var(--heading-color, #2a2d48);
}
</style>
