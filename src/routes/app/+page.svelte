<script lang="ts">
	import { ArrowLeft, ArrowRight, Check, Download, RotateCcw, ShieldQuestion, X } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index';
	import * as Card from '$lib/components/ui/card/index';
	import * as Carousel from '$lib/components/ui/carousel/index';
	import * as Drawer from '$lib/components/ui/drawer/index';
	import type { CarouselAPI } from '$lib/components/ui/carousel/context.js';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import TypewriterText from '$lib/components/TypewriterText.svelte';
	import { analyzeBatteryText, type BatteryMetrics } from '$lib/battery';
	import { tick } from 'svelte';

	const helpSteps = [
		{ title: 'Open Settings', text: 'On the iPhone you are checking, open Settings.' },
		{ title: 'Privacy & Security', text: 'Scroll down and tap Privacy & Security.' },
		{ title: 'Analytics Data', text: 'Tap Analytics & Improvements, then Analytics Data.' },
		{ title: 'Choose the newest file', text: 'Find the latest file with a name like Analytics-2026-10-19...ips. Do not choose a file with “-Census-” in its name.' },
		{ title: 'Save it, then upload', text: 'Open the file, use Share to save it to Files, then return here and choose that file.' }
	];

	let metrics = $state<BatteryMetrics | null>(null);
	let busy = $state(false);
	let progress = $state(0);
	let dragging = $state(false);
	let error = $state('');
	let inputElement = $state<HTMLInputElement>();
	let helpOpen = $state(false);
	let analyticsHelpOpen = $state(false);
	let activeStep = $state(0);
	let carouselApi = $state<CarouselAPI | undefined>();
	let reportDocument = $state<HTMLElement>();
	let exporting = $state(false);

	const assessmentCopy = {
		critical: {
			summary: 'Capacity and cycle count do not add up.',
			text: 'The cycle count is high while reported capacity is unusually close to new. These readings deserve an independent check.',
			steps: ['Ask whether the battery was replaced and request its repair history.', 'Have a trusted repair shop check the battery before buying.']
		},
		suspicious: {
			summary: 'This battery deserves a closer look.',
			text: 'The recorded capacity is unusually strong for this cycle count. Ask the seller to explain the readings.',
			steps: ['Ask about battery replacement history and any supporting receipts.', 'Request an independent diagnostic before agreeing on a price.']
		},
		healthy: {
			summary: 'These values look broadly consistent.',
			text: 'The readings do not trigger our capacity and cycle-count checks. This does not verify the battery’s condition or repair history.',
			steps: ['Confirm the phone’s battery replacement and repair history.', 'Inspect the phone in person and compare its reported health with this estimate.']
		},
		incomplete: {
			summary: 'There is not enough data for a full check.',
			text: 'Some battery values are missing from this file. Any available capacity estimate is not enough to assess the full profile.',
			steps: ['Choose the newest Analytics file without “-Census-” in its name.', 'If values are still missing, try the next daily file or request an in-person diagnostic.']
		}
	} satisfies Record<BatteryMetrics['risk'], { summary: string; text: string; steps: string[] }>;
	const guidance = $derived(metrics ? assessmentCopy[metrics.risk] : null);

	const riskCopy = $derived(metrics?.risk === 'critical'
		? { label: 'Critical risk', className: 'critical' }
		: metrics?.risk === 'suspicious'
			? { label: 'High suspicion', className: 'suspicious' }
			: metrics?.risk === 'healthy'
				? { label: 'Looks consistent', className: 'healthy' }
				: { label: 'Incomplete report', className: 'incomplete' });

	function openPicker() { inputElement?.click(); }
	async function exportReport(format: 'png' | 'pdf') {
		if (!reportDocument || exporting) return;
		error = '';
		exporting = true;
		try {
			await tick();
			await document.fonts.ready;
			await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
			const { toPng } = await import('html-to-image');
			const dataUrl = await toPng(reportDocument, {
				pixelRatio: 2,
				backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
				cacheBust: true
			});
			const filename = `battery-scout-report.${format}`;
			if (format === 'png') {
				const download = document.createElement('a');
				download.href = dataUrl;
				download.download = filename;
				download.click();
			} else {
				const { default: jsPDF } = await import('jspdf');
				const image = new Image();
				image.src = dataUrl;
				await image.decode();
				const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [image.naturalWidth * 0.75, image.naturalHeight * 0.75] });
				pdf.addImage(dataUrl, 'PNG', 0, 0, image.naturalWidth * 0.75, image.naturalHeight * 0.75);
				pdf.save(filename);
			}
		} catch {
			error = `Could not export the ${format.toUpperCase()} report. Please try again.`;
		} finally {
			exporting = false;
		}
	}
	function openHelp() {
		activeStep = 0;
		carouselApi?.scrollTo(0);
		helpOpen = true;
	}
	function openAnalyticsHelp() {
		helpOpen = false;
		window.setTimeout(() => analyticsHelpOpen = true, 260);
	}
	function setCarouselApi(api: CarouselAPI | undefined) {
		carouselApi = api;
		if (!api) return;
		activeStep = api.selectedScrollSnap();
		api.on('select', () => activeStep = api.selectedScrollSnap());
	}

	function readFile(file: File) {
		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onprogress = (event) => {
				if (event.lengthComputable) progress = Math.max(progress, Math.round((event.loaded / event.total) * 90));
			};
			reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
			reader.onerror = () => reject(reader.error);
			reader.readAsText(file);
		});
	}

	async function processFile(file?: File) {
		error = '';
		if (!file) return;
		if (!/\.(ips(?:\.ca)?\.synced|ips|txt|ca-synced)$/i.test(file.name) || file.size === 0) {
			error = "Could not parse metrics. Ensure this is an active daily 'Analytics-YYYY...' system file.";
			return;
		}
		if (file.size > 15 * 1024 * 1024) {
			error = 'This file is larger than 15 MB. Choose a smaller analytics file.';
			return;
		}

		busy = true;
		progress = 4;
		const startedAt = performance.now();
		const progressTimer = window.setInterval(() => {
			const elapsed = performance.now() - startedAt;
			progress = Math.max(progress, Math.min(90, Math.round(90 * (1 - Math.exp(-elapsed / 850)))));
		}, 35);
		let parsedMetrics: BatteryMetrics | null = null;
		let parseError = '';
		try {
			const result = analyzeBatteryText(await readFile(file), file.name);
			if (!result.cycles && !result.nominalCapacity && !result.maximumCapacity) {
				parseError = "Could not parse metrics. Ensure this is an active daily 'Analytics-YYYY...' system file.";
			} else {
				parsedMetrics = result;
				if (result.risk === 'incomplete') parseError = 'Some battery values are missing. This report is incomplete; try a more recent analytics file.';
			}
		} catch {
			parseError = "Could not parse metrics. Ensure this is an active daily 'Analytics-YYYY...' system file.";
		}

		const visibleFor = performance.now() - startedAt;
		if (visibleFor < 520) await new Promise((resolve) => window.setTimeout(resolve, 520 - visibleFor));
		progress = 100;
		await new Promise((resolve) => window.setTimeout(resolve, 320));
		window.clearInterval(progressTimer);
		metrics = parsedMetrics;
		error = parseError;
		busy = false;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		processFile(event.dataTransfer?.files?.[0]);
	}

	function reset() {
		metrics = null;
		error = '';
		if (inputElement) inputElement.value = '';
	}
</script>

<svelte:head>
	<title>Battery check: Apple Battery Scout</title>
	<meta name="description" content="Check iPhone battery analytics privately on this device." />
</svelte:head>

<div class="app-shell">
	<header class="app-header">
		<a href="/" class="brand" aria-label="Battery Scout home">
			<img src="/applebatteryscout-logo.png" alt="" />
			<span>Battery Scout</span>
		</a>
		<ThemeToggle />
	</header>

	<main class="app-main">
		{#if busy}
			<section class="loading-state" role="status" aria-live="polite">
				<div class="loading-mark">
					<svg class="progress-ring" viewBox="0 0 100 100" aria-hidden="true">
						<circle class="progress-track" cx="50" cy="50" r="43" />
						<circle class="progress-value" cx="50" cy="50" r="43" style={`stroke-dashoffset: ${270.18 * (1 - progress / 100)}`} />
					</svg>
					<img src="/applebatteryscout-logo.png" alt="" />
				</div>
				<p>Reading analytics file</p>
			</section>
		{:else if !metrics}
			<section class="upload-area">
				<div
					class:dragging
					class="dropzone"
					role="region"
					aria-label="Drop an iPhone Analytics file"
					ondragover={(event) => { event.preventDefault(); dragging = true; }}
					ondragleave={() => dragging = false}
					ondrop={onDrop}
				>
					<h1>Drop file here</h1>

					<Button class="choose-button" size="lg" onclick={openPicker} disabled={busy}>
						{busy ? 'Reading file' : 'Choose file'}
						{#if !busy}<ArrowRight size={16} />{/if}
					</Button>
					<Drawer.Root bind:open={helpOpen} shouldScaleBackground={false}>
						<button class="help-trigger" type="button" onclick={openHelp}>How do I find my iPhone Analytics file?</button>
						<Drawer.Content class="help-drawer">
							<Drawer.Close class="drawer-close" aria-label="Close instructions"><X size={17} /></Drawer.Close>
							<Drawer.Header class="help-header">
								<Drawer.Title class="help-title">Find your Analytics file</Drawer.Title>
								<Drawer.Description class="help-description">Follow these steps on the iPhone you are checking.</Drawer.Description>
							</Drawer.Header>
							<Carousel.Root class="help-carousel" opts={{ loop: false }} setApi={setCarouselApi}>
								<Carousel.Content class="help-carousel-content">
									{#each helpSteps as step, index}
										<Carousel.Item class="help-slide">
											<h2>{step.title}</h2>
											<p class="step-description">
												{#if index === 0}On the iPhone you are checking, open <strong>Settings</strong>.
												{:else if index === 1}Scroll down and tap <strong>Privacy &amp; Security</strong>.
												{:else if index === 2}Tap <strong>Analytics &amp; Improvements</strong>, then <strong>Analytics Data</strong>.
												{:else if index === 4}Open the file, use <strong>Share</strong> to save it to <strong>Files</strong>, then return here and choose that file.
												{:else}{step.text}{/if}
											</p>
											{#if index === 3}
												<button class="cant-find-trigger" type="button" onclick={openAnalyticsHelp}>Can’t find it?</button>
											{/if}
										</Carousel.Item>
									{/each}
								</Carousel.Content>
							</Carousel.Root>
							<div class="help-controls">
								<Button variant="outline" onclick={() => carouselApi?.scrollPrev()} disabled={activeStep === 0}><ArrowLeft size={15} /> Back</Button>
								<span>{activeStep + 1} of {helpSteps.length}</span>
								{#if activeStep < helpSteps.length - 1}
									<Button onclick={() => carouselApi?.scrollNext()}>Next <ArrowRight size={15} /></Button>
								{:else}
									<Button onclick={() => helpOpen = false}>Done</Button>
								{/if}
							</div>
						</Drawer.Content>
					</Drawer.Root>
					<Drawer.Root bind:open={analyticsHelpOpen} shouldScaleBackground={false}>
						<Drawer.Content class="help-drawer analytics-help-drawer">
							<Drawer.Close class="drawer-close" aria-label="Close analytics help"><X size={17} /></Drawer.Close>
							<Drawer.Header class="help-header">
								<Drawer.Title class="help-title">No Analytics file yet?</Drawer.Title>
								<Drawer.Description class="help-description">Analytics sharing may be turned off. Turn it on, then give your iPhone time to create a new file.</Drawer.Description>
							</Drawer.Header>
							<ol class="analytics-steps">
								<li><span>1</span><p>Open <strong>Settings</strong>, then tap <strong>Privacy &amp; Security</strong>.</p></li>
								<li><span>2</span><p>Tap <strong>Analytics &amp; Improvements</strong>.</p></li>
								<li><span>3</span><p>Turn on <strong>Share iPhone Analytics</strong> (or <strong>Share iPhone &amp; Watch Analytics</strong>).</p></li>
							</ol>
							<p class="analytics-wait"><strong>Then wait up to 24 hours.</strong> A new Analytics file may take a night or a full day to appear. Check Analytics Data again tomorrow and choose the newest file.</p>
						</Drawer.Content>
					</Drawer.Root>
					<input
						bind:this={inputElement}
						type="file"
						accept=".ips,.txt,.ca-synced,.ips.ca.synced"
						onchange={(event) => processFile(event.currentTarget.files?.[0])}
					/>
				</div>
				{#if error}<p class="error-message" role="alert">{error}</p>{/if}
			</section>
		{:else}
			<section class="results">
				<div class="report-document" class:is-exporting={exporting} bind:this={reportDocument}>
				<Card.Root class="result-card">
					<div class="health-feature">
						<h1>Estimated health</h1>
						<p class="health-value"><TypewriterText text={metrics.health !== null ? `${metrics.health}%` : 'N/A'} /></p>
						<p class="filename" title={metrics.filename}><TypewriterText text={metrics.filename} /></p>
					</div>
					<dl class="metric-list">
						<div class="metric-row"><dt>Cycle count</dt><dd><TypewriterText text={metrics.cycles?.toLocaleString() ?? 'N/A'} /> <small><TypewriterText text="cycles" /></small></dd></div>
						<div class="metric-row"><dt>Current capacity</dt><dd><TypewriterText text={metrics.nominalCapacity?.toLocaleString() ?? 'N/A'} /> <small><TypewriterText text="mAh" /></small></dd></div>
						<div class="metric-row"><dt>Factory capacity</dt><dd><TypewriterText text={metrics.maximumCapacity?.toLocaleString() ?? 'N/A'} /> <small><TypewriterText text="mAh" /></small></dd></div>
					</dl>
				</Card.Root>

				<div class="report-analysis">
					<p class="risk-label {riskCopy.className}"><TypewriterText text={riskCopy.label} /></p>
					<h2 class="summary"><TypewriterText text={guidance?.summary ?? ''} /></h2>
					<p class="analysis-description"><TypewriterText text={guidance?.text ?? ''} /></p>
				</div>
				<div class="assessment-note"><ShieldQuestion size={16} /><span><TypewriterText text="This is a screening signal, not proof of tampering or a hardware diagnosis." /></span></div>

				<section class="next-step" aria-labelledby="next-steps-heading">
					<Card.Root class="recommendations-card">
						<h2 id="next-steps-heading">Recommended next steps</h2>
						<ul>
							{#each guidance?.steps ?? [] as step}
								<li><Check size={16} aria-hidden="true" /><span><TypewriterText text={step} /></span></li>
							{/each}
						</ul>
					</Card.Root>
				</section>
				<div class="report-footer" aria-label="Apple Battery Scout report"><img src="/applebatteryscout-logo.png" alt="Apple Battery Scout" /><span>applebatteryscout.xyz</span></div>
			</div>
				{#if error}<p class="error-message" role="status">{error}</p>{/if}
				<div class="export-actions" aria-label="Export assessment">
					<Button class="export-button" variant="outline" onclick={() => exportReport('png')} disabled={exporting}><Download size={15} /> {exporting ? 'Preparing…' : 'Export PNG'}</Button>
					<Button class="export-button" variant="outline" onclick={() => exportReport('pdf')} disabled={exporting}><Download size={15} /> {exporting ? 'Preparing…' : 'Export PDF'}</Button>
				</div>
				<Button variant="outline" class="reset-button" onclick={reset}><RotateCcw size={15} /> Check another file</Button>
			</section>
		{/if}
	</main>

</div>

<style>
	.app-shell { min-height: 100svh; display: grid; grid-template-rows: auto 1fr; padding: 0 clamp(20px, 5vw, 72px); background: var(--background); }
	.app-header { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; width: min(100%, 1376px); height: 74px; margin: 0 auto; background: var(--background); border-bottom: 1px solid var(--border); }
	.brand { display: inline-flex; align-items: center; gap: 9px; color: var(--foreground); font-size: .9rem; font-weight: 620; letter-spacing: -.035em; }
	.brand img { display: block; width: 29px; height: 29px; object-fit: contain; border-radius: 7px; }
	.app-main { display: grid; place-items: center; width: min(100%, 1376px); margin: 0 auto; padding: 48px 0; }
	.loading-state { display: grid; justify-items: center; gap: 20px; color: var(--muted); font-size: .78rem; }
	.loading-state p { margin: 0; }
	.loading-mark { position: relative; display: grid; place-items: center; width: 108px; height: 108px; }
	.loading-mark > img { width: 52px; height: 52px; object-fit: contain; border-radius: 13px; }
	.progress-ring { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; transform: rotate(-90deg); }
	.progress-ring circle { fill: none; stroke-width: 2; }
	.progress-track { stroke: var(--border); }
	.progress-value { stroke: var(--accent); stroke-dasharray: 270.18; stroke-linecap: round; transition: stroke-dashoffset .32s ease; }
	:global(.help-drawer) { width: min(calc(100% - 24px), 620px); min-height: 385px; max-height: 82vh; margin-inline: auto; padding: 14px 24px 24px; overflow-y: auto; background: var(--background) !important; color: var(--foreground) !important; border-color: var(--border) !important; border-radius: 20px 20px 0 0 !important; }
	:global(.drawer-close) { position: absolute; top: 22px; right: 20px; display: grid; place-items: center; width: 40px; height: 40px; padding: 0; color: var(--muted); background: transparent; border: 0; border-radius: 9px; cursor: pointer; }
	:global(.help-header) { padding: 14px 42px 4px; text-align: center; }
	:global(.help-title) { color: var(--foreground) !important; font-size: 1.12rem !important; font-weight: 590 !important; letter-spacing: -.04em; }
	:global(.help-description) { margin-top: 4px; color: var(--muted) !important; font-size: .75rem !important; }
	:global(.help-carousel) { width: 100%; margin-top: 5px; }
	:global(.help-carousel-content) { align-items: stretch; }
	:global(.help-slide) { display: flex; min-height: 185px; flex-direction: column; align-items: center; justify-content: center; padding: 14px 20px 18px !important; text-align: center; }
	:global(.help-slide) h2 { margin: 0; color: var(--foreground); font-size: clamp(1.5rem, 5vw, 2rem); font-weight: 550; letter-spacing: -.06em; }
	:global(.step-description) { max-width: 410px; margin: 9px 0 0 !important; color: var(--muted) !important; font-size: .83rem !important; line-height: 1.65; }
	:global(.step-description strong) { color: var(--foreground); font-weight: 590; }
	.cant-find-trigger { margin-top: 15px; padding: 0; color: var(--muted); background: transparent; border: 0; font: inherit; font-size: .78rem; text-decoration-line: underline; text-decoration-style: dotted; text-underline-offset: 4px; cursor: pointer; }
	.cant-find-trigger:hover { color: var(--foreground); }
	.analytics-steps { display: grid; gap: 15px; max-width: 470px; margin: 22px auto 0; padding: 0; list-style: none; }
	.analytics-steps li { display: flex; align-items: flex-start; gap: 12px; color: var(--muted); font-size: .82rem; line-height: 1.6; }
	.analytics-steps li > span { display: grid; place-items: center; width: 24px; height: 24px; flex: 0 0 auto; color: var(--foreground); background: var(--surface); border: 1px solid var(--border); border-radius: 50%; font-size: .72rem; }
	.analytics-steps p { margin: 1px 0 0; }
	.analytics-steps strong, .analytics-wait strong { color: var(--foreground); font-weight: 590; }
	.analytics-wait { max-width: 470px; margin: 19px auto 2px; padding: 14px 16px; color: var(--muted); background: var(--surface); border: 1px solid var(--border); border-radius: 12px; font-size: .79rem; line-height: 1.65; }
	.help-controls { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; margin-top: 8px; }
	.help-controls > span { color: var(--subtle); font-size: .7rem; font-variant-numeric: tabular-nums; }
	.help-controls :global([data-slot="button"]:last-child) { justify-self: end; }
	.upload-area { width: min(100%, 640px); }
	.dropzone { min-height: 340px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; text-align: center; border: 1px dashed var(--border-strong); border-radius: 18px; transition: background-color .2s ease, border-color .2s ease; }
	.dropzone.dragging { background: var(--surface-soft); border-color: var(--muted); }
	.dropzone h1 { margin: 0 0 24px; color: var(--foreground); font-size: clamp(1.65rem, 4vw, 2.35rem); font-weight: 540; letter-spacing: -.065em; }
	:global(.choose-button) { min-width: 174px; height: 40px !important; min-height: 40px !important; justify-content: space-between !important; padding: 0 15px !important; color: #f8fafc !important; background: #101112 !important; background-image: radial-gradient(ellipse 78% 70% at 50% 112%, rgb(34 211 238 / 18%), transparent 70%) !important; border: 1px solid #292b2c !important; border-radius: 14px !important; box-shadow: inset 0 1px 0 rgb(255 255 255 / 5%), 0 7px 20px rgb(15 23 42 / 9%) !important; transition: transform .16s ease, box-shadow .22s ease, background-image .22s ease !important; }
	:global(.choose-button:hover) { transform: translateY(-2px); background-image: radial-gradient(ellipse 85% 78% at 50% 112%, rgb(34 211 238 / 28%), transparent 70%) !important; box-shadow: inset 0 1px 0 rgb(255 255 255 / 6%), 0 8px 24px rgb(8 145 178 / 15%) !important; }
	.help-trigger { margin-top: 17px; padding: 0; color: var(--muted); background: transparent; border: 0; font-size: .72rem; line-height: 1.5; text-decoration-line: underline; text-decoration-style: dotted; text-underline-offset: 4px; cursor: pointer; }
	.help-trigger:hover { color: var(--foreground); }
	.dropzone input { display: none; }
	.error-message { margin: 14px 0 0; color: #b45309; font-size: .77rem; line-height: 1.5; }
	:global(.dark) .error-message { color: #fcd34d; }
	.results { width: min(100%, 700px); align-self: start; padding: 0 0 20px; }
	.report-document { padding: 0; background: transparent; }
	.report-footer { display: none; }
	.report-document.is-exporting { padding: 26px; background: var(--background); border: 1px solid var(--border); border-radius: 22px; }
	.report-document.is-exporting :global(.screen-reader-copy) { position: static; width: auto; height: auto; overflow: visible; clip: auto; clip-path: none; white-space: normal; }
	.report-document.is-exporting :global(.typed-copy) { display: none; }
	.report-document.is-exporting .report-footer { display: flex; align-items: center; gap: 10px; margin-top: 25px; padding-top: 17px; border-top: 1px solid var(--border); color: var(--muted); font-size: .75rem; }
	.report-document.is-exporting .report-footer img { width: 27px; height: 27px; object-fit: contain; border-radius: 7px; }
	.export-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
	:global(.export-button) { height: 40px !important; min-height: 40px !important; }
	:global(.result-card), :global(.recommendations-card) { gap: 0; padding: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; box-shadow: none; }
	.health-feature { padding: 35px 24px 30px; text-align: center; }
	.health-feature h1 { margin: 0; color: var(--muted); font-size: .9rem; font-weight: 500; letter-spacing: -.02em; }
	.health-value { margin: 12px 0 16px; color: var(--foreground); font-size: clamp(4.8rem, 15vw, 7.5rem); font-weight: 550; line-height: 1; letter-spacing: -.075em; font-variant-numeric: tabular-nums; }
	.filename { max-width: 100%; overflow: hidden; margin: 0; color: var(--subtle); font-size: .68rem; text-overflow: ellipsis; white-space: nowrap; }
	.metric-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; padding: 24px 14px; border-top: 1px solid var(--border); }
	.metric-row { min-width: 0; padding: 0 12px; text-align: center; }
	.metric-row + .metric-row { border-left: 1px solid var(--border); }
	.metric-row dt { color: var(--muted); font-size: .75rem; }
	.metric-row dd { margin: 9px 0 0; color: var(--foreground); font-size: 1.3rem; font-weight: 550; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
	.metric-row small { color: var(--subtle); font-size: .67rem; font-weight: 450; letter-spacing: 0; }
	.report-analysis { margin-top: 28px; }
	.risk-label { margin: 0 0 9px; font-size: .75rem; font-weight: 550; }
	.risk-label.critical { color: #b91c1c; }
	.risk-label.suspicious { color: #b45309; }
	.risk-label.healthy { color: #047857; }
	.risk-label.incomplete { color: var(--muted); }
	:global(.dark) .risk-label.critical { color: #fca5a5; }
	:global(.dark) .risk-label.suspicious { color: #fcd34d; }
	:global(.dark) .risk-label.healthy { color: #6ee7b7; }
	.summary { margin: 0; color: var(--foreground); font-size: clamp(1.2rem, 4vw, 1.5rem); font-weight: 550; letter-spacing: -.04em; line-height: 1.3; }
	.analysis-description { margin: 10px 0 0; color: var(--muted); font-size: .84rem; line-height: 1.7; }
	.assessment-note { display: flex; align-items: flex-start; gap: 9px; margin-top: 17px; color: var(--subtle); font-size: .73rem; line-height: 1.6; }
	.assessment-note :global(svg) { flex: 0 0 auto; margin-top: 1px; }
	.next-step { margin-top: 28px; }
	:global(.recommendations-card) { padding: 24px; }
	.next-step h2 { margin: 0; color: var(--foreground); font-size: .94rem; font-weight: 580; letter-spacing: -.025em; }
	.next-step ul { display: grid; gap: 14px; margin: 18px 0 0; padding: 0; list-style: none; }
	.next-step li { display: flex; align-items: flex-start; gap: 10px; color: var(--muted); font-size: .8rem; line-height: 1.6; }
	.next-step li :global(svg) { flex: 0 0 auto; margin-top: 3px; color: var(--accent-strong); }
	:global(.reset-button) { margin-top: 22px; }

	@media (max-width: 600px) {
		.app-shell { padding: 0 18px; }
		.app-header { height: 68px; }
		.app-main { padding: 28px 0; }
		.dropzone { min-height: 300px; padding: 22px; border-radius: 15px; }
		:global(.help-drawer) { width: 100%; max-height: 86vh; min-height: 360px; padding-inline: 17px; }
		:global(.drawer-close) { right: 13px; }
		:global(.help-slide) { padding-inline: 12px !important; }
		.analytics-steps { margin-top: 18px; }
		.health-feature { padding: 30px 18px 26px; }
		.metric-list { padding: 20px 5px; }
		.metric-row { padding: 0 6px; }
		.metric-row dt { font-size: .65rem; }
		.metric-row dd { font-size: 1.1rem; }
		.metric-row small { display: block; margin-top: 3px; font-size: .62rem; }
		:global(.recommendations-card) { padding: 20px; }
		.report-document.is-exporting { padding: 17px; }
	}
</style>
