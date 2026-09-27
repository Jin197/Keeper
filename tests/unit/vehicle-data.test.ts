import { describe, it, expect } from 'vitest';
import { inferCountryFromPlate } from '@/lib/vehicle-data/country';
import { summarise, normaliseUkPlate } from '@/lib/vehicle-data/mot-history';
import { buildReport, simplifyModel } from '@/lib/vehicle-data/nhtsa-safety';
import { buildHighlights } from '@/lib/vehicle-data/known-issues';

describe('plate → country', () => {
  it('recognises the formats we can tell apart', () => {
    expect(inferCountryFromPlate('AB12 CDE')).toBe('GB');
    expect(inferCountryFromPlate('ab12cde')).toBe('GB');
    expect(inferCountryFromPlate('A123 BCD')).toBe('GB');
    expect(inferCountryFromPlate('AA-123-AA')).toBe('FR');
    expect(inferCountryFromPlate('1234 AB 75')).toBe('FR');
    expect(inferCountryFromPlate('1234 BCD')).toBe('ES');
    expect(inferCountryFromPlate('1-ABC-123')).toBe('BE');
    expect(inferCountryFromPlate('ABC1D23')).toBe('BR');
  });
  it('returns null when unsure', () => {
    expect(inferCountryFromPlate('HELLO')).toBeNull();
    expect(inferCountryFromPlate('')).toBeNull();
  });
});

describe('MOT history summary', () => {
  const raw = {
    registration: 'AB12CDE',
    make: 'FORD',
    model: 'FOCUS',
    firstUsedDate: '2015.03.12',
    fuelType: 'Diesel',
    motTests: [
      { completedDate: '2025.03.10 10:00:00', testResult: 'PASSED', expiryDate: '2026.03.09', odometerValue: '69800', odometerUnit: 'mi', defects: [{ text: 'Nearside front tyre worn close to legal limit', type: 'ADVISORY' }] },
      { completedDate: '2024.03.08 09:00:00', testResult: 'FAILED', odometerValue: '61900', odometerUnit: 'mi', defects: [{ text: 'Brake pad(s) less than 1.5 mm thick', type: 'MAJOR' }, { text: 'Nearside front tyre worn close to legal limit', type: 'ADVISORY' }] },
      { completedDate: '2024.03.08 14:00:00', testResult: 'PASSED', expiryDate: '2025.03.07', odometerValue: '61905', odometerUnit: 'mi', defects: [] },
      { completedDate: '2023.03.01 09:00:00', testResult: 'PASSED', expiryDate: '2024.02.29', odometerValue: '54000', odometerUnit: 'mi', defects: [] },
    ],
  };

  it('orders tests newest-first and converts miles to km', () => {
    const s = summarise('AB12CDE', raw);
    expect(s.tests[0].completedDate).toContain('2025');
    expect(s.latestOdometerKm).toBe(Math.round(69800 * 1.609344));
    expect(s.motExpiryDate).toBe('2026.03.09');
  });

  it('computes fail rate, annual mileage and recurring advisories', () => {
    const s = summarise('AB12CDE', raw);
    expect(s.failRate).toBeCloseTo(0.25, 5);
    expect(s.annualMileageKm).toBeGreaterThan(10_000);
    expect(s.annualMileageKm).toBeLessThan(16_000);
    expect(s.recurringAdvisories).toEqual(['Nearside front tyre worn close to legal limit']);
    expect(s.recentIssues.map((d) => d.type)).toContain('MAJOR');
  });

  it('normalises plates', () => {
    expect(normaliseUkPlate(' ab12 cde ')).toBe('AB12CDE');
  });
});

describe('NHTSA report', () => {
  it('strips trims from model names', () => {
    expect(simplifyModel('Golf GTI 2.0 TSI')).toBe('Golf');
    expect(simplifyModel('F-150')).toBe('F-150');
  });

  it('clusters complaints by top-level component and ranks by count', () => {
    const report = buildReport('Ford', 'Focus', 2014, [
      { NHTSACampaignNumber: '16V123000', Component: 'POWER TRAIN', Summary: 'Clutch may fail', Remedy: 'Replace clutch', ReportReceivedDate: '/Date(1467331200000-0400)/' },
    ], [
      { components: 'POWER TRAIN:AUTOMATIC TRANSMISSION', summary: 'Shudder', odometer: 60000 },
      { components: 'POWER TRAIN:AUTOMATIC TRANSMISSION', summary: 'Shudder again', odometer: 80000 },
      { components: 'ELECTRICAL SYSTEM', summary: 'Battery drain', crash: false },
      { components: 'POWER TRAIN', summary: 'Hesitation', fire: true },
    ]);
    expect(report.recalls).toHaveLength(1);
    expect(report.recalls[0].reportDate).toBe('2016-07-01');
    expect(report.complaintsTotal).toBe(4);
    expect(report.complaintClusters[0].component).toBe('POWER TRAIN');
    expect(report.complaintClusters[0].count).toBe(3);
    expect(report.complaintClusters[0].fires).toBe(1);
    expect(report.complaintClusters[0].medianOdometerKm).toBe(Math.round(70000 * 1.609344));
  });
});

describe('known-issue highlights', () => {
  it('orders critical before warning before info and caps the list', () => {
    const mot = summarise('X', {
      motTests: [
        { completedDate: '2025.01.01', testResult: 'FAILED', defects: [{ text: 'Dangerous brake', type: 'DANGEROUS', dangerous: true }] },
      ],
    });
    const nhtsa = buildReport('A', 'B', 2010, [], Array.from({ length: 6 }, () => ({ components: 'ENGINE', summary: 'x' })));
    const hs = buildHighlights(mot, nhtsa);
    expect(hs[0].severity).toBe('critical');
    expect(hs[0].kind).toBe('mot-defect');
    expect(hs.some((h) => h.kind === 'complaint-cluster')).toBe(true);
    expect(hs.length).toBeLessThanOrEqual(12);
  });

  it('flags an expired MOT as critical', () => {
    const mot = summarise('X', { motTests: [{ completedDate: '2024.01.01', testResult: 'PASSED', expiryDate: '2024-12-31', defects: [] }] });
    const hs = buildHighlights(mot, null);
    expect(hs[0].kind).toBe('mot-expiry');
    expect(hs[0].severity).toBe('critical');
  });
});
