export type BatteryMetrics = {
	cycles: number | null;
	nominalCapacity: number | null;
	maximumCapacity: number | null;
	health: number | null;
	risk: 'critical' | 'suspicious' | 'healthy' | 'incomplete';
	filename: string;
};

const patterns = {
	cycles: [
		/(?:last_value_)?CycleCount\s*["']?\s*[:=]\s*["']?(\d+)/i,
		/(?:last_value_)?cycle_count\s*["']?\s*[:=]\s*["']?(\d+)/i
	],
	nominal: [
		/(?:last_value_)?NominalChargeCapacity\s*["']?\s*[:=]\s*["']?(\d+)/i,
		/(?:last_value_)?nominal_charge_capacity\s*["']?\s*[:=]\s*["']?(\d+)/i
	],
	maximum: [
		/(?:last_value_)?MaximumFCC\s*["']?\s*[:=]\s*["']?(\d+)/i,
		/(?:last_value_)?maximum_fcc\s*["']?\s*[:=]\s*["']?(\d+)/i
	]
};

function findNumber(source: string, expressions: RegExp[]) {
	for (const expression of expressions) {
		const match = source.match(expression);
		if (match) return Number(match[1]);
	}
	return null;
}

export function analyzeBatteryText(source: string, filename: string): BatteryMetrics {
	const cycles = findNumber(source, patterns.cycles);
	const nominalCapacity = findNumber(source, patterns.nominal);
	const maximumCapacity = findNumber(source, patterns.maximum);
	const health = nominalCapacity && maximumCapacity
		? Math.min(100, Math.round((nominalCapacity / maximumCapacity) * 1000) / 10)
		: null;

	let risk: BatteryMetrics['risk'] = 'incomplete';
	if (cycles !== null && health !== null) {
		if (cycles > 150 && health >= 99) risk = 'critical';
		else if (cycles > 250 && health > 95) risk = 'suspicious';
		else risk = 'healthy';
	}

	return { cycles, nominalCapacity, maximumCapacity, health, risk, filename };
}
