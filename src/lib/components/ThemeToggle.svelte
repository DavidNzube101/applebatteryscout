<script lang="ts">
	import { Moon, Sun } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index';
	import { onMount } from 'svelte';

	let dark = $state(false);
	onMount(() => {
		const saved = localStorage.getItem('abs-theme');
		dark = saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		document.documentElement.classList.toggle('dark', dark);
	});

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		localStorage.setItem('abs-theme', dark ? 'dark' : 'light');
	}
</script>

<Button variant="ghost" size="icon" class="theme-toggle" onclick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
	{#if dark}<Sun size={16} strokeWidth={1.8} />{:else}<Moon size={16} strokeWidth={1.8} />{/if}
</Button>
