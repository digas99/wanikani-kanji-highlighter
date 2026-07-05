<template>
	<div v-if="activeMenu" class="menu-popup" @click.stop>
		<p>{{ activeMenu }}</p>
		<ul>
			<template v-if="activeMenu === 'Sort'">
				<li>
					<label>Type</label>
					<select
						class="settings-select"
						:value="menu.sort.type"
						@change="updateSort('type', $event.target.value)"
					>
						<option v-for="option in sortTypeOptions" :key="option" :value="option">
							{{ option }}
						</option>
					</select>
				</li>
				<li>
					<label>Direction</label>
					<select
						class="settings-select"
						:value="menu.sort.direction"
						@change="updateSort('direction', $event.target.value)"
					>
						<option v-for="option in sortDirectionOptions" :key="option" :value="option">
							{{ option }}
						</option>
					</select>
				</li>
			</template>

			<template v-else-if="activeMenu === 'Filter'">
				<li>
					<label>SRS Stage</label>
					<select
						class="settings-select"
						:value="menu.filter.srs_stage"
						@change="updateFilter('srs_stage', $event.target.value)"
					>
						<option v-for="option in filterSrsOptions" :key="option" :value="option">
							{{ option }}
						</option>
					</select>
				</li>
				<li>
					<label>State</label>
					<select
						class="settings-select"
						:value="menu.filter.state"
						@change="updateFilter('state', $event.target.value)"
					>
						<option v-for="option in filterStateOptions" :key="option" :value="option">
							{{ option }}
						</option>
					</select>
				</li>
			</template>

			<template v-else-if="activeMenu === 'Menu'">
				<li>
					<label>Color by</label>
					<select
						class="settings-select"
						:value="menu.menu.color_by"
						@change="updateMenuOption('color_by', $event.target.value)"
					>
						<option v-for="option in colorByOptions" :key="option" :value="option">
							{{ option }}
						</option>
					</select>
				</li>
				<li>
					<label>Reviews info</label>
					<div
						class="checkbox_wrapper clickable setting-control"
						:class="{ 'checkbox-enabled': menu.menu.reviews_info }"
						@click="updateMenuOption('reviews_info', !menu.menu.reviews_info)"
					>
						<div class="custom-checkbox-ball"></div>
						<div class="custom-checkbox-back"></div>
					</div>
				</li>
				<li>
					<label>Disabled subjects</label>
					<div
						class="checkbox_wrapper clickable setting-control"
						:class="{ 'checkbox-enabled': menu.menu.disabled_subjects }"
						@click="updateMenuOption('disabled_subjects', !menu.menu.disabled_subjects)"
					>
						<div class="custom-checkbox-ball"></div>
						<div class="custom-checkbox-back"></div>
					</div>
				</li>
			</template>
		</ul>
	</div>
</template>

<script>
import {
	COLOR_BY_OPTIONS,
	FILTER_SRS_OPTIONS,
	FILTER_STATE_OPTIONS,
	SORT_DIRECTION_OPTIONS,
	SORT_TYPE_OPTIONS,
} from '@/utils/scripts/profileSubjects';

export default {
	name: 'ProfileSectionMenu',

	props: {
		activeMenu: {
			type: String,
			default: null,
		},
		menu: {
			type: Object,
			required: true,
		},
	},

	emits: ['update-sort', 'update-filter', 'update-menu'],

	data() {
		return {
			sortTypeOptions: SORT_TYPE_OPTIONS,
			sortDirectionOptions: SORT_DIRECTION_OPTIONS,
			filterSrsOptions: FILTER_SRS_OPTIONS,
			filterStateOptions: FILTER_STATE_OPTIONS,
			colorByOptions: COLOR_BY_OPTIONS,
		};
	},

	methods: {
		updateSort(key, value) {
			this.$emit('update-sort', key, value);
		},
		updateFilter(key, value) {
			this.$emit('update-filter', key, value);
		},
		updateMenuOption(key, value) {
			this.$emit('update-menu', key, value);
		},
	},
};
</script>

<style scoped>
.menu-popup {
	position: absolute;
	top: 37px;
	right: 0;
	width: 250px;
	background: var(--fill-color);
	border: 2px solid var(--default-color);
	color: var(--font-color);
	overflow: hidden;
	z-index: 12;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.menu-popup > p {
	font-size: 11px;
	color: white;
	text-align: right;
	padding: 7px;
	border: 1px solid white;
	background-color: var(--default-color);
	margin: 0;
}

.menu-popup > ul {
	padding: 10px;
	margin: 0;
	list-style: none;
}

.menu-popup > ul > li {
	font-size: 13px;
	display: flex;
	align-items: center;
	gap: 8px;
}

.menu-popup > ul > li:not(:last-child) {
	margin-bottom: 10px;
}

.menu-popup > ul > li > label {
	margin-right: auto;
	font-weight: 600;
}
</style>
