import { describe, expect, test } from 'bun:test';
import { analyzeBatteryText } from './battery';

describe('analyzeBatteryText', () => {
	test('parses current analytics keys and flags near-new capacity at high cycle count', () => {
		const result = analyzeBatteryText(
			'{ "last_value_CycleCount": 528, "last_value_NominalChargeCapacity": 3160, "last_value_MaximumFCC": 3200 }',
			'Analytics-2026-10-18.ips'
		);

		expect(result).toEqual({
			cycles: 528,
			nominalCapacity: 3160,
			maximumCapacity: 3200,
			health: 98.8,
			risk: 'suspicious',
			filename: 'Analytics-2026-10-18.ips'
		});
	});

	test('recognizes legacy key names and caps calculated health at 100 percent', () => {
		const result = analyzeBatteryText(
			'CycleCount: 151\nNominalChargeCapacity: 3300\nMaximumFCC: 3200',
			'legacy.txt'
		);

		expect(result.cycles).toBe(151);
		expect(result.nominalCapacity).toBe(3300);
		expect(result.maximumCapacity).toBe(3200);
		expect(result.health).toBe(100);
		expect(result.risk).toBe('critical');
	});

	test('recognizes snake case keys', () => {
		const result = analyzeBatteryText(
			'{ "last_value_cycle_count": 251, "last_value_nominal_charge_capacity": 3072, "last_value_maximum_fcc": 3200 }',
			'analytics.txt'
		);

		expect(result.health).toBe(96);
		expect(result.risk).toBe('suspicious');
	});

	test('uses the critical risk rule before the high suspicion rule', () => {
		const result = analyzeBatteryText(
			'{ "CycleCount": 151, "NominalChargeCapacity": 3168, "MaximumFCC": 3200 }',
			'analytics.ips'
		);

		expect(result.health).toBe(99);
		expect(result.risk).toBe('critical');
	});

	test('marks a profile healthy when it does not meet either risk threshold', () => {
		const result = analyzeBatteryText(
			'{ "CycleCount": 500, "NominalChargeCapacity": 2880, "MaximumFCC": 3200 }',
			'analytics.ips'
		);

		expect(result.health).toBe(90);
		expect(result.risk).toBe('healthy');
	});

	test('returns incomplete metrics when the diagnostic values are absent', () => {
		const result = analyzeBatteryText('{ "DeviceName": "iPhone" }', 'other.ips');

		expect(result).toEqual({
			cycles: null,
			nominalCapacity: null,
			maximumCapacity: null,
			health: null,
			risk: 'incomplete',
			filename: 'other.ips'
		});
	});

	test('does not calculate health when capacity is zero', () => {
		const result = analyzeBatteryText(
			'{ "CycleCount": 10, "NominalChargeCapacity": 0, "MaximumFCC": 3200 }',
			'analytics.ips'
		);

		expect(result.health).toBeNull();
		expect(result.risk).toBe('incomplete');
	});
});
