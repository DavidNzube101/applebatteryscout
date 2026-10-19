<script lang="ts">
	import { onMount } from 'svelte';

	let { text = '' }: { text: string } = $props();
	let visibleWordCount = $state(0);
	const words = $derived(text.split(/\s+/).filter(Boolean));
	const visibleWords = $derived(words.slice(0, visibleWordCount));

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			visibleWordCount = words.length;
			return;
		}

		const timer = window.setInterval(() => {
			visibleWordCount += 1;
			if (visibleWordCount >= words.length) window.clearInterval(timer);
		}, 100);
		return () => window.clearInterval(timer);
	});
</script>

<span class="screen-reader-copy">{text}</span><span class="typed-copy" aria-hidden="true">{#each visibleWords as word, index}<span class="typed-word">{word}</span>{#if index < visibleWords.length - 1}{' '}{/if}{/each}</span>

<style>
	.screen-reader-copy { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; clip-path: inset(50%); }
	.typed-word { display: inline-block; animation: word-soft-reveal .5s cubic-bezier(.22, 1, .36, 1) both; }
	@keyframes word-soft-reveal { from { opacity: 0; filter: blur(4px); transform: translateY(2px); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
	@media (prefers-reduced-motion: reduce) { .typed-word { animation: none; } }
</style>
