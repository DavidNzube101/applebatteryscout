<script lang="ts">
	import { ArrowRight, ChevronDown, Github, Star } from 'lucide-svelte';
	import { inView } from 'motion';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ShapeWaves from '$lib/components/ShapeWaves.svelte';
	import { reveal } from '$lib/actions/reveal';

	const introCopy = 'A 100% battery health reading can be misleading on a used iPhone if battery data has been altered. Battery Scout looks at the battery metrics recorded in an iPhone analytics file: its cycle count, current charge capacity, and factory capacity. We compare the capacities to estimate remaining health, then weigh that estimate against the cycle count to flag readings that may deserve a closer inspection.';
	const introWords = introCopy.split(' ');
	let introElement: HTMLParagraphElement;
	let visibleWordCount = $state(0);
	let githubStars = $state<number | null>(null);

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			visibleWordCount = introWords.length;
			return;
		}

		let started = false;
		let timer: number | undefined;
		const stopObserving = inView(introElement, () => {
			if (started) return;
			started = true;
			let wordIndex = 0;
			timer = window.setInterval(() => {
				wordIndex += 1;
				visibleWordCount = wordIndex;
				if (wordIndex >= introWords.length && timer) window.clearInterval(timer);
			}, 100);
		});

		return () => {
			stopObserving();
			if (timer) window.clearInterval(timer);
		};
	});

	onMount(() => {
		const controller = new AbortController();
		fetch('https://api.github.com/repos/davidnzube101/applebatteryscout', {
			headers: { Accept: 'application/vnd.github+json' },
			signal: controller.signal
		})
			.then((response) => {
				if (!response.ok) throw new Error('GitHub repository details unavailable');
				return response.json();
			})
			.then((repository: { stargazers_count?: number }) => {
				if (typeof repository.stargazers_count === 'number') githubStars = repository.stargazers_count;
			})
			.catch(() => {});

		return () => controller.abort();
	});
</script>

<svelte:head>
	<title>Apple Battery Scout: Know the battery before you buy</title>
	<meta name="description" content="A private iPhone battery check for second-hand buyers. Read analytics on your device and understand the battery behind the number on screen." />
</svelte:head>

<main>
	<header class="site-nav">
		<a class="brand" href="#top" aria-label="Battery Scout home">
			<img class="brand-logo" src="/applebatteryscout-logo.png" alt="" />
			<span>Battery Scout</span>
		</a>
		<nav class="nav-links" aria-label="Main navigation">
			<a href="#how-it-works">How it works</a>
		</nav>
		<div class="nav-actions">
			<ThemeToggle />
			<Button href="/app" class="scout-button nav-cta" size="sm">Open checker <ArrowRight size={14} /></Button>
		</div>
	</header>
	<section class="hero-stage" id="top">
		<ShapeWaves pattern="battery" />

		<div class="hero-center">
			<h1 use:reveal>
				<span class="headline-first">Know the real battery <img use:reveal={{ delay: 0.16, distance: 0, blur: 7 }} src="/applebatteryscout-logo.png" alt="" class="headline-mark" /></span>
				<span class="headline-last">before you buy<span use:reveal={{ delay: 0.24, distance: 0, blur: 7 }} class="buy-mark"><img src="/icons8-buy-96.png" alt="" /></span>.</span>
			</h1>
			<div class="hero-actions" use:reveal={{ delay: 0.12 }}>
				<Button href="/app" class="scout-button hero-cta" size="lg">Check a battery <ArrowRight size={17} /></Button>
				<Button href="#how-it-works" variant="outline" class="quiet-cta" size="lg">How it works <ChevronDown size={16} /></Button>
			</div>
		</div>

	</section>

	<section class="process-section" id="how-it-works">
		<div class="section-wrap">
			<div class="section-heading">
				<h2>How we check<br /><span>the battery.</span></h2>
				<p class="section-intro" bind:this={introElement}>
					<span class="sr-only">{introCopy}</span>
					<span class="typed-copy-layout" aria-hidden="true">{introCopy}</span>
					<span class="typed-copy-progress" aria-hidden="true">{#each introWords.slice(0, visibleWordCount) as word}<span class="typed-word">{word}</span>{' '}{/each}</span>
				</p>
			</div>

			<aside class="github-bar" use:reveal aria-label="Apple Battery Scout on GitHub">
				<a class="github-repo" href="https://github.com/davidnzube101/applebatteryscout" target="_blank" rel="noreferrer">
					<Github size={19} strokeWidth={1.8} />
					<span>davidnzube101/applebatteryscout</span>
				</a>
				<div class="github-support">
					<span class="star-count" aria-label={`${githubStars ?? 'Loading'} GitHub stars`}><Star size={15} /> {githubStars === null ? '—' : githubStars.toLocaleString()}</span>
					<a class="star-button" href="https://github.com/davidnzube101/applebatteryscout" target="_blank" rel="noreferrer" aria-label="Star Apple Battery Scout on GitHub">
						<Star size={15} /> <span>Star on GitHub</span>
					</a>
				</div>
			</aside>

			<footer class="site-footer" use:reveal>
				<a class="footer-brand" href="#top" aria-label="Battery Scout home"><img class="brand-logo" src="/applebatteryscout-logo.png" alt="" /></a>
				<p>Apple Battery Scout is an independent utility tools resource. It is not affiliated with, authorized, certified, or sponsored by Apple Inc.</p>
				<a class="copyright-link" href="https://github.com/davidnzube101" target="_blank" rel="noreferrer">© 2026 Skipp</a>
			</footer>
		</div>
	</section>
</main>

<style>
	.site-nav { position: sticky; top: 0; z-index: 20; width: min(100%, 1376px); height: 82px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin: 0 auto; padding: 0 clamp(24px, 5.2vw, 84px); background: var(--background); border-bottom: 1px solid var(--border); }
	.hero-stage { position: relative; min-height: calc(100svh - 82px); display: flex; flex-direction: column; overflow: hidden; padding: 0 clamp(24px, 5.2vw, 84px); background: var(--background); }
	.brand, .footer-brand { display: inline-flex; align-items: center; gap: 10px; width: fit-content; color: var(--foreground); font-size: .9rem; font-weight: 620; letter-spacing: -.035em; }
	.brand-logo { display: block; width: 30px; height: 30px; flex: 0 0 auto; object-fit: contain; border-radius: 8px; }
	.nav-links { display: flex; align-items: center; gap: 30px; color: var(--muted); font-size: .82rem; }
	.nav-links a { transition: color .18s ease; }
	.nav-links a:hover { color: var(--foreground); }
	.nav-actions { display: flex; align-items: center; justify-content: flex-end; gap: 13px; }
	.hero-center { position: relative; z-index: 1; flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 35px 0 48px; text-align: center; }
	h1 { display: flex; flex-direction: column; align-items: center; margin: 0 0 23px; color: var(--foreground); font-size: clamp(4rem, 8.15vw, 7.6rem); font-weight: 570; line-height: .99; letter-spacing: -.085em; }
	h1 > span { display: block; }
	.headline-first { display: inline-flex !important; align-items: center; justify-content: center; gap: .14em; white-space: nowrap; }
	.headline-last { display: inline-flex !important; align-items: center; justify-content: center; gap: .16em; white-space: nowrap; }
	.headline-mark { display: inline-block; width: .78em; height: .78em; border-radius: .2em; object-fit: contain; }
	.buy-mark { display: inline-grid; place-items: center; width: .7em; height: .7em; margin-right: -.12em; padding: .12em; flex: 0 0 auto; border-radius: .2em; background: #22d3ee; }
	.buy-mark img { display: block; width: 100%; height: 100%; object-fit: contain; }
	.hero-actions { display: flex; justify-content: center; align-items: center; gap: 13px; margin-top: 24px; }
	:global(.hero-cta), :global(.nav-cta) { color: #f8fafc !important; background: #101112 !important; border: 1px solid #292b2c !important; background-image: radial-gradient(ellipse 78% 70% at 50% 112%, rgb(34 211 238 / 18%), transparent 70%) !important; box-shadow: inset 0 1px 0 rgb(255 255 255 / 5%), 0 7px 20px rgb(15 23 42 / 9%) !important; transition: transform .16s ease, box-shadow .22s ease, background-image .22s ease !important; }
	:global(.hero-cta:hover), :global(.nav-cta:hover) { background-image: radial-gradient(ellipse 85% 78% at 50% 112%, rgb(34 211 238 / 28%), transparent 70%) !important; box-shadow: inset 0 1px 0 rgb(255 255 255 / 6%), 0 8px 24px rgb(8 145 178 / 15%) !important; }
	:global(.hero-cta) { min-width: 190px; height: 40px !important; min-height: 40px !important; padding: 0 16px !important; justify-content: space-between !important; border-radius: 14px !important; font-size: .84rem !important; }
	:global(.hero-cta:hover), :global(.nav-cta:hover), :global(.quiet-cta:hover) { transform: translateY(-2px); }
	:global(.nav-cta) { height: 40px !important; min-height: 40px !important; padding: 0 12px !important; border-radius: 12px !important; font-size: .76rem !important; }
	:global(.quiet-cta) { height: 40px !important; min-height: 40px !important; min-width: 160px; justify-content: space-between !important; padding: 0 14px !important; color: var(--foreground) !important; background: var(--surface) !important; border: 1px solid var(--border-strong) !important; border-radius: 14px !important; font-size: .82rem !important; transition: transform .16s ease !important; }
	.process-section { min-height: 100svh; display: flex; align-items: stretch; background: var(--surface); border-top: 1px solid var(--border); }
	.section-wrap { width: min(1100px, calc(100% - 64px)); min-height: 100svh; display: flex; flex-direction: column; margin: 0 auto; padding: 88px 0 28px; }
	.section-heading { max-width: 700px; }
	.section-heading h2 { margin: 20px 0 15px; color: var(--foreground); font-size: clamp(3rem, 6vw, 5.3rem); font-weight: 560; line-height: .98; letter-spacing: -.08em; }
	.section-heading h2 span { color: var(--accent-strong); }
	.section-intro { position: relative; max-width: 650px; margin: 0; color: var(--muted); font-size: .96rem; line-height: 1.7; }
	.typed-copy-layout { visibility: hidden; }
	.typed-copy-progress { position: absolute; inset: 0 auto auto 0; width: 100%; }
	.typed-word { display: inline-block; animation: word-soft-reveal .5s cubic-bezier(.22, 1, .36, 1) both; }
	@keyframes word-soft-reveal { from { opacity: 0; filter: blur(4px); transform: translateY(2px); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
	.github-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 72px; padding: 15px 17px; border: 1px solid var(--border); border-radius: 14px; background: var(--background); }
	.github-repo, .github-support, .star-count, .star-button { display: inline-flex; align-items: center; }
	.github-repo { min-width: 0; gap: 10px; color: var(--foreground); font-size: .82rem; font-weight: 550; }
	.github-repo span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.github-support { flex: 0 0 auto; gap: 12px; }
	.star-count { gap: 6px; color: var(--muted); font-size: .78rem; font-variant-numeric: tabular-nums; }
	.star-button { justify-content: center; gap: 7px; min-height: 40px; padding: 0 13px; border: 1px solid var(--border-strong); border-radius: 11px; color: var(--foreground); background: var(--surface); font-size: .76rem; font-weight: 550; transition: transform .16s ease, box-shadow .2s ease, border-color .2s ease; }
	.star-button:hover { transform: translateY(-2px); border-color: var(--border-strong); box-shadow: 0 5px 18px rgb(34 211 238 / 10%); }
	.star-button:active { transform: translateY(0) scale(.98); }
	.site-footer { display: flex; align-items: center; gap: 20px; margin-top: auto; padding: 17px 0 0; border-top: 1px solid var(--border); }
	.footer-brand { flex: 0 0 auto; gap: 8px; font-size: .77rem; }
	.footer-brand .brand-logo { width: 24px; height: 24px; border-radius: 6px; }
	.site-footer > p { flex: 1; margin: 0; color: var(--subtle); font-size: .61rem; line-height: 1.5; }
	.copyright-link { flex: 0 0 auto; color: var(--subtle); font-size: .61rem; text-decoration: underline; text-underline-offset: 3px; }
	.copyright-link:hover { color: var(--foreground); }
	@media (max-width: 760px) {
		.hero-stage { min-height: calc(100svh - 70px); padding: 0 24px; }
		.site-nav { height: 70px; grid-template-columns: 1fr auto; padding: 0 24px; }
		.nav-links { display: none; }
		.hero-center { min-height: 0; padding: 50px 0 65px; }
		h1 { margin-top: 29px; font-size: clamp(3.65rem, 12.5vw, 6.25rem); }
		.headline-mark { width: .73em; height: .73em; }
		.buy-mark { width: .68em; height: .68em; }
		.section-wrap { width: min(100% - 44px, 560px); padding: 76px 0 24px; }
		.site-footer { align-items: flex-start; flex-wrap: wrap; gap: 10px 15px; }
		.site-footer > p { order: 3; flex-basis: 100%; }
		.github-bar { margin-top: 56px; }
	}
	@media (max-width: 480px) {
		.hero-stage { padding: 0 18px; }
		.site-nav { padding: 0 18px; }
		.brand { gap: 8px; font-size: .82rem; }
		.brand-logo { width: 27px; height: 27px; }
		.nav-actions { gap: 8px; }
		:global(.nav-cta) { height: 40px !important; min-height: 40px !important; padding: 0 10px !important; font-size: .7rem !important; }
		.hero-center { padding: 45px 0 55px; }
		h1 { font-size: clamp(1.55rem, 7vw, 2.65rem); line-height: .98; letter-spacing: -.075em; }
		.headline-mark { width: .68em; height: .68em; }
		.buy-mark { width: .64em; height: .64em; }
		.hero-actions { width: 100%; flex-direction: column; gap: 10px; margin-top: 28px; }
		:global(.hero-cta), :global(.quiet-cta) { width: min(100%, 330px); height: 40px !important; min-height: 40px !important; }
		.section-wrap { width: calc(100% - 36px); padding-top: 67px; }
		.section-heading h2 { font-size: 3.4rem; }
		.section-intro { font-size: .88rem; }
		.github-bar { align-items: flex-start; flex-direction: column; gap: 14px; padding: 14px; }
		.github-repo { max-width: 100%; }
		.github-support { width: 100%; justify-content: space-between; }
	}
	@media (prefers-reduced-motion: reduce) {
		.typed-word { animation: none; }
	}
</style>
