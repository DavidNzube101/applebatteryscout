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
			reportedHealth: null,
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

	test('marks a profile consistent when it does not meet either risk threshold', () => {
		const result = analyzeBatteryText(
			'{ "CycleCount": 500, "NominalChargeCapacity": 2880, "MaximumFCC": 3200 }',
			'analytics.ips'
		);

		expect(result.health).toBe(90);
		expect(result.risk).toBe('consistent');
	});

	test('prefers the daily battery record over an older calibration record and reads iOS health', () => {
		const source = [
			JSON.stringify({ name: 'BatteryConfigValueHistogramFinal_V2', message: {
				last_value_CycleCount: 1657,
				last_value_NominalChargeCapacity: 2294,
				last_value_MaximumFCC: 3351,
				last_value_MaximumCapacityPercent: 72
			} }),
			JSON.stringify({ name: 'AzulE_Battery_Calibration_Baseline', message: {
				last_value_CycleCount: 205,
				last_value_NominalChargeCapacity: 2802,
				last_value_MaximumFCC: 3351,
				last_value_MaximumCapacityPercent: -1
			} })
		].join('\n');
		const result = analyzeBatteryText(source, 'Analytics.ips.ca.synced');

		expect(result.cycles).toBe(1657);
		expect(result.nominalCapacity).toBe(2294);
		expect(result.maximumCapacity).toBe(3351);
		expect(result.health).toBe(68.5);
		expect(result.reportedHealth).toBe(72);
		expect(result.risk).toBe('consistent');
	});

	test('returns incomplete metrics when the diagnostic values are absent', () => {
		const result = analyzeBatteryText('{ "DeviceName": "iPhone" }', 'other.ips');

		expect(result).toEqual({
			cycles: null,
			nominalCapacity: null,
			maximumCapacity: null,
			health: null,
			reportedHealth: null,
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
