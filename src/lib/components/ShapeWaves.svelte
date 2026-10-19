<script lang="ts">
	import { onMount } from 'svelte';

	// Original canvas implementation for Svelte, inspired by the supplied settings.
	let {
		pattern = 'text', text = '</>', fontFamily = '"Geist Variable", Geist, system-ui, sans-serif',
		fontWeight = 500, textSize = 0.6, cellSize = 10, dotSize = 0.75,
		color = '#929292', hoverColor = '#ffffff', backgroundColor = '#000000',
		speed = 1, scale = 1, contrast = 1, brightness = 0.4, flow = 0,
		direction = 0, fade = 0.25, interactive = true, splashRadius = 40,
		splashStrength = 0.4, glow = 0.35, intro = true, introDuration = 1.6,
		paused = false
	}: {
		pattern?: 'text' | 'battery'; text?: string; fontFamily?: string; fontWeight?: number; textSize?: number;
		cellSize?: number; dotSize?: number; color?: string; hoverColor?: string;
		backgroundColor?: string; speed?: number; scale?: number; contrast?: number;
		brightness?: number; flow?: number; direction?: number; fade?: number;
		interactive?: boolean; splashRadius?: number; splashStrength?: number;
		glow?: number; intro?: boolean; introDuration?: number; paused?: boolean;
	} = $props();

	let canvas: HTMLCanvasElement;
	let syncMotion = () => {};
	$effect(() => { paused; syncMotion(); });

	onMount(() => {
		const context = canvas.getContext('2d');
		if (!context) return;
		const ctx: CanvasRenderingContext2D = context;
		// Listen on the hero, since the decorative wrapper does not receive pointer events.
		const host = canvas.parentElement?.parentElement;
		if (!host) return;
		const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
		let width = 0;
		let height = 0;
		let elapsed = 0;
		let frame = 0;
		let previous = 0;
		let visible = true;
		let disposed = false;
		let dark = document.documentElement.classList.contains('dark');
		let pointer: { x: number; y: number } | null = null;
		let splashes: { x: number; y: number; time: number }[] = [];
		let cells: { x: number; y: number; shape: number; ink: number }[] = [];

		function buildGrid() {
			const mask = document.createElement('canvas');
			mask.width = Math.ceil(width);
			mask.height = Math.ceil(height);
			const maskContext = mask.getContext('2d', { willReadFrequently: true });
			if (!maskContext) return;
			maskContext.fillStyle = '#fff';
			if (pattern === 'battery') {
				const batteryWidth = Math.min(width * 0.78, height * 1.25, 1000);
				const batteryHeight = batteryWidth * 0.43;
				const stroke = Math.max(10, batteryWidth * 0.028);
				const terminal = batteryWidth * 0.045;
				const left = (width - batteryWidth - terminal) / 2;
				const top = (height - batteryHeight) / 2;
				maskContext.strokeStyle = '#fff';
				maskContext.lineWidth = stroke;
				maskContext.beginPath();
				maskContext.roundRect(left, top, batteryWidth, batteryHeight, batteryHeight * 0.14);
				maskContext.stroke();
				maskContext.beginPath();
				maskContext.roundRect(left + batteryWidth + stroke / 2, top + batteryHeight * 0.32, terminal, batteryHeight * 0.36, terminal * 0.3);
				maskContext.fill();
				const inset = batteryWidth * 0.075;
				const gap = batteryWidth * 0.035;
				const barWidth = (batteryWidth - inset * 2 - gap * 2) / 3;
				for (let bar = 0; bar < 3; bar++) {
					maskContext.beginPath();
					maskContext.roundRect(left + inset + bar * (barWidth + gap), top + inset, barWidth, batteryHeight - inset * 2, stroke * 0.4);
					maskContext.fill();
				}
			} else {
				maskContext.font = `${fontWeight} ${Math.min(height * textSize, width * 0.42)}px ${fontFamily}`;
				maskContext.textAlign = 'center';
				maskContext.textBaseline = 'middle';
				maskContext.fillText(text, width / 2, height / 2);
			}
			const pixels = maskContext.getImageData(0, 0, mask.width, mask.height).data;
			cells = [];
			const spacing = Math.max(6, cellSize);
			for (let y = spacing / 2; y < height; y += spacing) {
				for (let x = spacing / 2; x < width; x += spacing) {
					const col = Math.floor(x / spacing);
					const row = Math.floor(y / spacing);
					cells.push({ x, y, shape: (col * 13 + row * 7) % 4, ink: pixels[(Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3] / 255 });
				}
			}
		}

		function render() {
			ctx.clearRect(0, 0, width, height);
			const reveal = reducedMotion.matches || !intro ? 1 : Math.min(1, elapsed / Math.max(0.1, introDuration));
			const t = elapsed * speed;
			const radius = Math.max(1, splashRadius);
			splashes = splashes.filter((splash) => elapsed - splash.time < 2.5);
			for (const cell of cells) {
				const u = cell.x / Math.max(width, 1);
				const v = cell.y / Math.max(height, 1);
				const wave = Math.sin(u * 12 * scale + t * 0.6 + Math.sin(v * 9 * scale - t * 0.35) * 1.4);
				const crossWave = Math.cos(v * 13 * scale + u * 6 - t * 0.4);
				let light = Math.max(0, Math.min(1, (wave * 0.3 + crossWave * 0.2 + 0.5 - 0.5) * contrast + 0.5));
				let hover = pointer ? Math.exp(-Math.pow(Math.hypot(cell.x - pointer.x, cell.y - pointer.y) / (radius * 1.8), 2)) : 0;
				let displacement = 0;
				for (const splash of splashes) {
					const age = elapsed - splash.time;
					const distance = Math.hypot(cell.x - splash.x, cell.y - splash.y);
					const ring = Math.exp(-Math.pow((distance - age * radius * 3) / (radius * 0.6), 2)) * Math.exp(-age * 1.5);
					hover += ring * splashStrength;
					displacement += ring * Math.sin(distance * 0.05 - age * 8) * cellSize * splashStrength;
				}
				light = Math.min(1, light + hover);
				const edge = Math.min(1, Math.min(u, 1 - u, v, 1 - v) / Math.max(0.001, fade));
				const entry = Math.min(1, Math.max(0, (reveal * 1.6 - u * 0.4 - v * 0.2) * 2));
				const alpha = Math.min(0.85, ((0.10 + light * 0.56) * (0.25 + cell.ink * 0.9) * brightness + cell.ink * 0.10 + hover * 0.5) * edge * entry);
				if (alpha < 0.008) continue;
				const size = Math.max(0.5, cellSize * dotSize * (0.24 + light * 0.5 + cell.ink * 0.15));
				const drift = flow * Math.sin(t + u * 7 + v * 8) * cellSize;
				const pointerAngle = pointer ? Math.atan2(cell.y - pointer.y, cell.x - pointer.x) : 0;
				const push = reducedMotion.matches ? 0 : Math.min(1, hover) * cellSize * 0.65;
				const x = cell.x + drift * Math.cos(direction) + displacement + Math.cos(pointerAngle) * push;
				const y = cell.y + drift * Math.sin(direction) + Math.sin(pointerAngle) * push;
				ctx.globalAlpha = alpha;
				ctx.fillStyle = dark ? (hover > 0.1 ? hoverColor : color) : (hover > 0.1 ? '#242424' : '#6b6b6b');
				if (cell.shape === 0) ctx.fillRect(x - size / 2, y - size / 2, size, size);
				else {
					ctx.beginPath();
					if (cell.shape === 1) ctx.arc(x, y, size / 2, 0, Math.PI * 2);
					else if (cell.shape === 2) {
						ctx.moveTo(x, y - size / 2); ctx.lineTo(x + size / 2, y); ctx.lineTo(x, y + size / 2); ctx.lineTo(x - size / 2, y);
					} else {
						ctx.moveTo(x, y - size / 2); ctx.lineTo(x + size / 2, y + size / 2); ctx.lineTo(x - size / 2, y + size / 2);
					}
					ctx.closePath(); ctx.fill();
				}
			}
			if (pointer && glow > 0 && dark) {
				const gradient = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius * 3);
				gradient.addColorStop(0, hoverColor); gradient.addColorStop(1, 'transparent');
				ctx.globalAlpha = glow * 0.12;
				ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
			}
			ctx.globalAlpha = 1;
		}
		const tick = (now: number) => {
			frame = requestAnimationFrame(tick);
			if (now - previous < 1000 / 30) return;
			elapsed += previous ? Math.min(0.1, (now - previous) / 1000) : 1 / 30;
			previous = now;
			render();
		};
		const updateMotion = () => {
			cancelAnimationFrame(frame); previous = 0;
			if (visible && !document.hidden && !reducedMotion.matches && !paused) frame = requestAnimationFrame(tick);
			else { if (paused) elapsed = Math.max(elapsed, introDuration); render(); }
		};
		syncMotion = updateMotion;
		const resize = () => {
			width = canvas.clientWidth; height = canvas.clientHeight;
			if (!width || !height) return;
			const ratio = Math.min(devicePixelRatio || 1, 1.5);
			canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			buildGrid(); render();
		};
		const position = (event: PointerEvent) => {
			const bounds = canvas.getBoundingClientRect();
			return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
		};
		const canInteract = (event: PointerEvent) => interactive && !paused && !(event.target instanceof Element && event.target.closest('a, button, input'));
		const move = (event: PointerEvent) => {
			pointer = canInteract(event) ? position(event) : null;
			if (reducedMotion.matches || paused) render();
		};
		const leave = () => { pointer = null; if (reducedMotion.matches || paused) render(); };
		const splash = (event: PointerEvent) => {
			if (!canInteract(event) || reducedMotion.matches) return;
			splashes.push({ ...position(event), time: elapsed });
			splashes = splashes.slice(-5);
		};
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; updateMotion(); });
		intersection.observe(host);
		const themeObserver = new MutationObserver(() => { dark = document.documentElement.classList.contains('dark'); render(); });
		themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		reducedMotion.addEventListener('change', updateMotion);
		document.addEventListener('visibilitychange', updateMotion);
		host.addEventListener('pointermove', move, { passive: true });
		host.addEventListener('pointerleave', leave);
		host.addEventListener('pointerdown', splash, { passive: true });
		void document.fonts.ready.then(() => { if (!disposed) resize(); });
		resize(); updateMotion();
		return () => {
			disposed = true; syncMotion = () => {}; cancelAnimationFrame(frame);
			observer.disconnect(); intersection.disconnect(); themeObserver.disconnect();
			reducedMotion.removeEventListener('change', updateMotion);
			document.removeEventListener('visibilitychange', updateMotion);
			host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); host.removeEventListener('pointerdown', splash);
		};
	});
</script>

<div class="shape-waves" style:--wave-background={backgroundColor} aria-hidden="true">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.shape-waves { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; background: var(--background); }
	:global(.dark) .shape-waves { background: var(--wave-background); }
	canvas { display: block; width: 100%; height: 100%; }
</style>
