<script lang="ts">
	import '../app.css';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		const saved = localStorage.getItem('abs-theme');
		const theme = saved === 'dark' || saved === 'light'
			? saved
			: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		document.documentElement.classList.toggle('dark', theme === 'dark');
	});
</script>

<svelte:head>
	<meta name="description" content="A private, on-device iPhone battery analytics checker." />
</svelte:head>

<slot />
