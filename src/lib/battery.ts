export type BatteryMetrics = {
	cycles: number | null;
	nominalCapacity: number | null;
	maximumCapacity: number | null;
	health: number | null;
	reportedHealth: number | null;
	risk: 'critical' | 'suspicious' | 'consistent' | 'incomplete';
	filename: string;
};

type MetricRecord = Record<string, unknown>;

const keys = {
	cycles: ['last_value_CycleCount', 'CycleCount', 'last_value_cycle_count', 'cycle_count'],
	nominal: ['last_value_NominalChargeCapacity', 'NominalChargeCapacity', 'last_value_nominal_charge_capacity', 'nominal_charge_capacity'],
	maximum: ['last_value_MaximumFCC', 'MaximumFCC', 'last_value_maximum_fcc', 'maximum_fcc'],
	reportedHealth: ['last_value_MaximumCapacityPercent', 'MaximumCapacityPercent', 'last_value_maximum_capacity_percent', 'maximum_capacity_percent']
} as const;

const patterns = {
	cycles: [/(?:last_value_)?CycleCount\s*["']?\s*[:=]\s*["']?(-?\d+)/i, /(?:last_value_)?cycle_count\s*["']?\s*[:=]\s*["']?(-?\d+)/i],
	nominal: [/(?:last_value_)?NominalChargeCapacity\s*["']?\s*[:=]\s*["']?(-?\d+)/i, /(?:last_value_)?nominal_charge_capacity\s*["']?\s*[:=]\s*["']?(-?\d+)/i],
	maximum: [/(?:last_value_)?MaximumFCC\s*["']?\s*[:=]\s*["']?(-?\d+)/i, /(?:last_value_)?maximum_fcc\s*["']?\s*[:=]\s*["']?(-?\d+)/i],
	reportedHealth: [/(?:last_value_)?MaximumCapacityPercent\s*["']?\s*[:=]\s*["']?(-?\d+)/i, /(?:last_value_)?maximum_capacity_percent\s*["']?\s*[:=]\s*["']?(-?\d+)/i]
};

function readValue(record: MetricRecord, aliases: readonly string[]) {
	for (const alias of aliases) {
		const value = record[alias];
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
	}
	return null;
}

function findNumber(source: string, expressions: RegExp[]) {
	for (const expression of expressions) {
		const match = source.match(expression);
		if (match) return Number(match[1]);
	}
	return null;
}

function getStructuredRecord(source: string): MetricRecord | null {
	const records: MetricRecord[] = [];
	for (const line of source.split(/\r?\n/)) {
		try {
			const parsed: unknown = JSON.parse(line);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				const record = parsed as MetricRecord;
				const message = record.message;
				records.push(message && typeof message === 'object' && !Array.isArray(message)
					? { ...(message as MetricRecord), __recordName: record.name }
					: record);
			}
		} catch {
			// Analytics files can contain plain-text lines alongside JSON records.
		}
	}

	const batteryRecords = records.filter((record) => record.__recordName === 'BatteryConfigValueHistogramFinal_V2');
	if (batteryRecords.length) return batteryRecords.at(-1) ?? null;

	const metricCount = (record: MetricRecord) => Object.values(keys).filter((aliases) => readValue(record, aliases) !== null).length;
	return records.reduce<MetricRecord | null>((best, record) => {
		if (metricCount(record) === 0) return best;
		return !best || metricCount(record) >= metricCount(best) ? record : best;
	}, null);
}

export function analyzeBatteryText(source: string, filename: string): BatteryMetrics {
	const record = getStructuredRecord(source);
	const cycles = record ? readValue(record, keys.cycles) : findNumber(source, patterns.cycles);
	const nominalCapacity = record ? readValue(record, keys.nominal) : findNumber(source, patterns.nominal);
	const maximumCapacity = record ? readValue(record, keys.maximum) : findNumber(source, patterns.maximum);
	const rawReportedHealth = record ? readValue(record, keys.reportedHealth) : findNumber(source, patterns.reportedHealth);
	const reportedHealth = rawReportedHealth !== null && rawReportedHealth >= 0 && rawReportedHealth <= 100
		? rawReportedHealth
		: null;
	const health = nominalCapacity !== null && nominalCapacity > 0 && maximumCapacity !== null && maximumCapacity > 0
		? Math.min(100, Math.round((nominalCapacity / maximumCapacity) * 1000) / 10)
		: null;

	let risk: BatteryMetrics['risk'] = 'incomplete';
	if (cycles !== null && health !== null) {
		if (cycles > 150 && health >= 99) risk = 'critical';
		else if (cycles > 250 && health > 95) risk = 'suspicious';
		else risk = 'consistent';
	}

	return { cycles, nominalCapacity, maximumCapacity, health, reportedHealth, risk, filename };
}
