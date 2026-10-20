<script lang="ts">
	import { ArrowLeft, ArrowRight } from 'lucide-svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
</script>

<svelte:head>
	<title>Blog | Apple Battery Scout</title>
	<meta name="description" content="Guides to understanding iPhone battery health, analytics, and used-device checks from Apple Battery Scout." />
	<meta property="og:title" content="Apple Battery Scout Blog" />
	<meta property="og:description" content="Practical guides to checking iPhone battery health before you buy." />
</svelte:head>

<header class="site-nav">
	<a class="brand" href="/" aria-label="Apple Battery Scout home">
		<img src="/applebatteryscout-logo.png" alt="" />
		<span>Battery Scout</span>
	</a>
	<div class="nav-actions">
		<ThemeToggle />
		<a class="check-link" href="/app/">Open checker <ArrowRight size={14} /></a>
	</div>
</header>

<main class="blog-main">
	<a class="breadcrumb" href="/"><ArrowLeft size={14} /> Apple Battery Scout</a>
	<section class="blog-heading">
		<h1>Blog</h1>
		<p>Guides to understanding iPhone battery health and checking a used device.</p>
	</section>

	<section class="article-list" aria-label="Blog posts">
		<a class="article-card" href="/blog/how-ios-battery-health-can-be-spoofed/">
			<div class="article-card-copy">
				<p class="article-meta">6 MIN READ</p>
				<h2>How iPhone battery health can be spoofed</h2>
				<p class="article-description">Learn how battery programmers and tag-on flex cables can affect reported health, what analytics can reveal, and what to check before buying used.</p>
			</div>
			<span class="article-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
		</a>
	</section>
</main>

<footer class="page-footer">
	<a class="footer-logo" href="/" aria-label="Apple Battery Scout home"><img src="/applebatteryscout-logo.png" alt="" /></a>
	<a href="https://github.com/davidnzube101" target="_blank" rel="noreferrer">© 2026 Skipp</a>
</footer>

<style>
	.site-nav { position: sticky; top: 0; z-index: 10; height: 72px; display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(20px, 5vw, 72px); border-bottom: 1px solid var(--border); background: var(--background); }
	.brand { display: inline-flex; align-items: center; gap: 9px; color: var(--foreground); font-size: .86rem; font-weight: 620; letter-spacing: -.035em; }
	.brand img { width: 29px; height: 29px; border-radius: 8px; object-fit: contain; }
	.nav-actions { display: inline-flex; align-items: center; gap: 10px; }
	.check-link { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 13px; border: 1px solid var(--border-strong); border-radius: 11px; color: var(--foreground); background: var(--surface); font-size: .76rem; transition: transform .16s ease; }
	.check-link:hover { transform: translateY(-2px); }
	.blog-main { width: min(100% - 48px, 850px); min-height: calc(100svh - 135px); margin: 0 auto; padding: 52px 0 90px; }
	.breadcrumb { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 40px; color: var(--muted); font-size: .75rem; }
	.blog-heading { max-width: 620px; margin-bottom: 48px; }
	.blog-heading h1 { margin: 0; color: var(--foreground); font-size: clamp(3.2rem, 8vw, 5.6rem); font-weight: 560; line-height: .98; letter-spacing: -.08em; }
	.blog-heading p { margin: 18px 0 0; color: var(--muted); font-size: 1rem; line-height: 1.65; }
	.article-list { border-top: 1px solid var(--border); }
	.article-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 27px 4px; border-bottom: 1px solid var(--border); transition: padding .18s ease; }
	.article-card:hover { padding-right: 0; padding-left: 8px; }
	.article-card-copy { min-width: 0; }
	.article-meta { display: flex; gap: 8px; margin: 0 0 12px; color: var(--subtle); font-size: .65rem; font-weight: 600; letter-spacing: .06em; }
	.article-card h2 { margin: 0 0 10px; color: var(--foreground); font-size: clamp(1.25rem, 3vw, 1.7rem); font-weight: 560; line-height: 1.2; letter-spacing: -.045em; }
	.article-description { max-width: 680px; margin: 0; color: var(--muted); font-size: .86rem; line-height: 1.65; }
	.article-arrow { display: grid; width: 40px; height: 40px; flex: 0 0 auto; place-items: center; border: 1px solid var(--border); border-radius: 50%; color: var(--muted); transition: color .16s ease, border-color .16s ease, transform .16s ease; }
	.article-card:hover .article-arrow { color: var(--accent-strong); border-color: var(--border-strong); transform: translateX(2px); }
	.page-footer { width: min(100% - 48px, 850px); display: flex; align-items: center; justify-content: space-between; margin: 0 auto; padding: 16px 0 22px; border-top: 1px solid var(--border); }
	.footer-logo img { display: block; width: 25px; height: 25px; border-radius: 7px; }
	.page-footer > a:last-child { color: var(--subtle); font-size: .68rem; text-decoration: underline; text-underline-offset: 3px; }
	@media (max-width: 600px) {
		.site-nav { height: 66px; padding: 0 16px; }
		.check-link { padding: 0 10px; font-size: .7rem; }
		.blog-main { width: calc(100% - 38px); padding-top: 35px; }
		.breadcrumb { margin-bottom: 32px; }
		.blog-heading { margin-bottom: 35px; }
		.article-card { align-items: flex-start; padding: 23px 0; }
		.article-arrow { width: 34px; height: 34px; }
		.page-footer { width: calc(100% - 38px); }
	}
</style>
