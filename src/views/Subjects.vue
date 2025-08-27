<template>
	<div class="container">
		<SubjectsList :values="values" :colors="colors" :sorting="sorting" :id="id" :type="type" />
	</div>
</template>

<script>
import { getWKManager } from '@/lib/apiClient';

import SubjectsList from '@/components/Subjects/SubjectsList.vue';

export default {
	name: 'Subjects',
	components: {
		SubjectsList
	},

	data() {
		return {
			type: this.$route.query.type,
			id: parseInt(this.$route.query.id),
			functionName: null,
			wkManager: null,
			fetchInterval: null,

			values: [],
			colors: [],
			sorting: {}
		}
	},

	async created() {
		this.wkManager = getWKManager();
		await this.setMetadata(this.type);
		if (this.functionName) {
			this.wkManager[this.functionName](this.id)
			this.fetchInterval = setInterval(() => this.wkManager[this.functionName](this.id), 1000);
		}

		this.wkManager.events.on('get:subjects', async ({ state, data }) => {
			this.values = data;
		});
	},

	beforeUnmount() {
		this.wkManager.events.removeListener('get:subjects');
		clearInterval(this.fetchInterval);
	},

	methods: {
		async setMetadata(type) {
			this.functionName = this.getFunctionName(type);
			this.colors = await this.getColors(type);
		},
		getFunctionName(type) {
			switch (type) {
				case 'srs':
					return 'getSubjectsBySRSStage';
				case 'level':
					return 'getSubjectsByLevel';
			}
			return null;
		},
		async getColors(type) {
			switch (type) {
				case 'srs':
					return {
						"radical": "#00a1f1",
						"kanji": "#f100a1",
						"vocabulary": "#a100f1",
					};
			}
			return [];
		},
	}
}
</script>

<style scoped></style>