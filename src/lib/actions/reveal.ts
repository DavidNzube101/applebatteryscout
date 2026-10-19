import { animate, inView } from 'motion';

type RevealOptions = {
	delay?: number;
	distance?: number;
	blur?: number;
};

export function reveal(node: HTMLElement, options: RevealOptions = {}) {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return {};

	const delay = options.delay ?? 0;
	const distance = options.distance ?? 14;
	const blur = options.blur ?? 0;
	node.style.opacity = '0';
	node.style.transform = `translateY(${distance}px)`;
	if (blur > 0) node.style.filter = `blur(${blur}px)`;

	let stopAnimation: (() => void) | undefined;
	let hasRevealed = false;
	const stopObserving = inView(node, (element) => {
		if (hasRevealed) return;
		hasRevealed = true;
		const controls = animate(
			element,
			{ opacity: [0, 1], y: [distance, 0], filter: blur > 0 ? [`blur(${blur}px)`, 'blur(0px)'] : undefined },
			{ duration: 0.55, delay, ease: 'easeOut' }
		);
		stopAnimation = () => controls.stop();
		return stopAnimation;
	});

	return {
		destroy() {
			stopObserving();
			stopAnimation?.();
			node.style.removeProperty('will-change');
			node.style.removeProperty('filter');
		}
	};
}
