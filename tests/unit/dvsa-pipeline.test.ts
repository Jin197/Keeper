import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFixture } from '../fixtures/dvsa/make-fixture.mjs';
import { classifySystem, normaliseModel, kmBand } from '../../scripts/dvsa/systems.mjs';

describe('DVSA pipeline', () => {
  it('classifies reasons-for-rejection into systems by keyword', () => {
    expect(classifySystem('Brakes > Brake pads', 'Brake pad(s) less than 1.5 mm thick')).toBe('brakes');
    expect(classifySystem('', 'Nearside front tyre tread depth below requirements')).toBe('tyres');
    expect(classifySystem('Lamps, reflectors and electrical equipment', 'Headlamp aim too high')).toBe('lamps');
    expect(classifySystem('', 'Exhaust emissions carbon monoxide content excessive')).toBe('emissions');
    expect(classifySystem('', 'Suspension arm ball joint excessively worn')).toBe('suspension');
    expect(classifySystem('', 'Windscreen wiper does not clear')).toBe('visibility');
    expect(classifySystem('', 'Something unusual')).toBe('other');
  });

  it('mirrors the app-side helpers', () => {
    expect(normaliseModel('FOCUS ZETEC TDCI')).toBe('FOCUS');
    expect(kmBand(112_480)).toBe('100-120k');
  });

  describe('end to end on a synthetic extract', () => {
    let out: Record<string, unknown>[] = [];
    let dir: string;
    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), 'dvsa-'));
      writeFixture(join(dir, 'in'));
      execFileSync(process.execPath, [
        'scripts/dvsa/build-failure-rates.mjs',
        '--dir', join(dir, 'in'),
        '--db', join(dir, 'work.sqlite'),
        '--out', join(dir, 'rates.json'),
        '--min-tests', '5',
      ], { stdio: 'pipe' });
      out = JSON.parse(readFileSync(join(dir, 'rates.json'), 'utf8'));
    });

    it('merges model variants, skips retests and non-cars, and emits fleet baselines', () => {
      const focus = out.filter((r) => r.make === 'FORD' && r.model === 'FOCUS' && r.age_band === 'ALL');
      expect(focus.length).toBeGreaterThan(0);
      const any100 = focus.find((r) => r.km_band === '100-120k' && r.system === 'any')!;
      expect(any100.tests).toBe(76); // 80 + 10 variants, minus those that roll into the next band; retest + van excluded
      expect(any100.failures).toBe(22);
      const brakes = focus.find((r) => r.km_band === '100-120k' && r.system === 'brakes')!;
      expect(brakes.failures).toBe(22);
      const tyres = focus.find((r) => r.km_band === '100-120k' && r.system === 'tyres')!;
      expect(tyres.failures).toBe(0);
      expect(tyres.advisories).toBe(16);
      expect(out.some((r) => r.make === '*' && r.model === '*' && r.system === 'any')).toBe(true);
      expect(out.every((r) => r.source_years === '2023')).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });
  });
});
