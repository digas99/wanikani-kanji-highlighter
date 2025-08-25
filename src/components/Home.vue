<template>

</template>

<script>
import { getWKManager } from '@/lib/apiClient';

export default {
	name: 'Main',

	mounted() {
		const wkManager = getWKManager();
	}
}
</script>

<style scoped></style>