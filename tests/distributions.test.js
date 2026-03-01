import {
  sampleUniform,
  sampleNormal,
  sampleExponential,
  sampleZipf,
  sampleFromDistribution,
} from '../src/distributions.js';

// ----- helpers ---------------------------------------------------------------

/** Deterministic linear-congruential RNG (seed=1) for repeatable tests. */
function makeLCG(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// =============================================================================
// sampleUniform
// =============================================================================
describe('sampleUniform', () => {
  test('returns value within [min, max)', () => {
    const rng = makeLCG();
    for (let i = 0; i < 1000; i++) {
      const v = sampleUniform(5, 10, rng);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });

  test('default rng (Math.random) produces values in range', () => {
    const v = sampleUniform(0, 1);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  test('mean of many samples is close to midpoint', () => {
    const rng = makeLCG(42);
    const samples = Array.from({ length: 10000 }, () => sampleUniform(0, 100, rng));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(mean).toBeGreaterThan(45);
    expect(mean).toBeLessThan(55);
  });
});

// =============================================================================
// sampleNormal
// =============================================================================
describe('sampleNormal', () => {
  test('mean of 10000 samples is within 2% of specified mean', () => {
    const rng = makeLCG(7);
    const mean = 50;
    const samples = Array.from({ length: 10000 }, () => sampleNormal(mean, 10, rng));
    const actualMean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(Math.abs(actualMean - mean) / mean).toBeLessThan(0.02);
  });

  test('default rng returns a number', () => {
    const v = sampleNormal(0, 1);
    expect(typeof v).toBe('number');
    expect(Number.isFinite(v)).toBe(true);
  });

  test('most samples within ±4 stddevs (99.994%)', () => {
    const rng = makeLCG(99);
    const samples = Array.from({ length: 10000 }, () => sampleNormal(100, 15, rng));
    const outliers = samples.filter(v => Math.abs(v - 100) > 60).length;
    // ±4σ ≈ ±60 — statistically expect ~0.6 outliers; allow up to 5.
    expect(outliers).toBeLessThanOrEqual(5);
  });
});

// =============================================================================
// sampleExponential
// =============================================================================
describe('sampleExponential', () => {
  test('all values are non-negative', () => {
    const rng = makeLCG(3);
    for (let i = 0; i < 1000; i++) {
      expect(sampleExponential(1, rng)).toBeGreaterThanOrEqual(0);
    }
  });

  test('mean of samples is approximately 1/lambda', () => {
    const rng = makeLCG(11);
    const lambda = 2;
    const samples = Array.from({ length: 10000 }, () => sampleExponential(lambda, rng));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(Math.abs(mean - 1 / lambda)).toBeLessThan(0.05);
  });

  test('throws if lambda <= 0', () => {
    expect(() => sampleExponential(0)).toThrow('lambda must be > 0');
    expect(() => sampleExponential(-1)).toThrow('lambda must be > 0');
  });

  test('default rng produces a non-negative value', () => {
    const v = sampleExponential(1);
    expect(v).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// sampleZipf
// =============================================================================
describe('sampleZipf', () => {
  test('returns integer in [1, n]', () => {
    const rng = makeLCG(5);
    for (let i = 0; i < 500; i++) {
      const v = sampleZipf(10, 1, rng);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  test('rank 1 is most frequent (higher s → more skewed)', () => {
    const rng = makeLCG(17);
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 10000; i++) {
      counts[sampleZipf(10, 2, rng) - 1]++;
    }
    // The first item should appear more than the second
    expect(counts[0]).toBeGreaterThan(counts[1]);
    expect(counts[1]).toBeGreaterThan(counts[9]);
  });

  test('throws if n < 1', () => {
    expect(() => sampleZipf(0, 1)).toThrow('n must be a positive integer');
  });

  test('throws if s <= 0', () => {
    expect(() => sampleZipf(5, 0)).toThrow('s must be > 0');
    expect(() => sampleZipf(5, -1)).toThrow('s must be > 0');
  });

  test('works with n=1 (always returns 1)', () => {
    const rng = makeLCG(2);
    for (let i = 0; i < 50; i++) {
      expect(sampleZipf(1, 1, rng)).toBe(1);
    }
  });

  test('default rng returns a value in [1, n]', () => {
    const v = sampleZipf(5, 1);
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(5);
  });

  test('returns n (fallback) when rng produces value above harmonic sum H (floating-point edge)', () => {
    // IEEE-754: (1 + Number.EPSILON) * H > H, so u exceeds every partial sum
    // → the loop never returns early → hits `return n` safety fallback
    const rngAboveOne = () => 1 + Number.EPSILON;
    // n=2, s=1 → H = 1 + 0.5 = 1.5 (exact); u = 1.5*(1+ε) > 1.5 → fallback fires
    const result = sampleZipf(2, 1, rngAboveOne);
    expect(result).toBe(2);
  });
});

// =============================================================================
// sampleFromDistribution
// =============================================================================
describe('sampleFromDistribution', () => {
  const rng = makeLCG(33);

  test('uniform — delegates to sampleUniform', () => {
    const v = sampleFromDistribution({ type: 'uniform', min: 10, max: 20, rng });
    expect(v).toBeGreaterThanOrEqual(10);
    expect(v).toBeLessThan(20);
  });

  test('normal — delegates to sampleNormal', () => {
    const v = sampleFromDistribution({ type: 'normal', mean: 100, stddev: 5, rng });
    expect(typeof v).toBe('number');
    expect(Number.isFinite(v)).toBe(true);
  });

  test('exponential — delegates to sampleExponential', () => {
    const v = sampleFromDistribution({ type: 'exponential', lambda: 2, rng });
    expect(v).toBeGreaterThanOrEqual(0);
  });

  test('zipf — delegates to sampleZipf', () => {
    const v = sampleFromDistribution({ type: 'zipf', n: 5, s: 1, rng });
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(5);
  });

  test('uses sensible defaults when params are omitted', () => {
    const rng2 = makeLCG(1);
    const v = sampleFromDistribution({ type: 'uniform', rng: rng2 }); // uses default min=0, max=1
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  test('throws on unknown distribution type', () => {
    expect(() =>
      sampleFromDistribution({ type: 'power_law' })
    ).toThrow('unknown type "power_law"');
  });
});

// =============================================================================
// Integration with core.js generateData
// =============================================================================
describe('generateData with distribution field', () => {
  let generateData, setFaker;

  beforeAll(async () => {
    const core = await import('../src/core.js');
    generateData = core.generateData;
    setFaker = core.setFaker;
    const { faker } = await import('@faker-js/faker');
    setFaker(faker);
  });

  test('range column with normal distribution stays within clamped bounds', () => {
    const schema = [
      { name: 'score', type: 'range:0-100', distribution: { type: 'normal', mean: 60, stddev: 10 } },
    ];
    const { records } = generateData({ schema, rows: 200 });
    for (const r of records) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  test('range column with normal distribution: mean of samples is clustered around mean param', () => {
    const schema = [
      { name: 'age', type: 'range:0-120', distribution: { type: 'normal', mean: 35, stddev: 5 } },
    ];
    const { records } = generateData({ schema, rows: 1000 });
    const mean = records.reduce((s, r) => s + r.age, 0) / records.length;
    expect(mean).toBeGreaterThan(25);
    expect(mean).toBeLessThan(45);
  });

  test('enum column with zipf distribution: first value appears most', () => {
    const schema = [
      { name: 'tier', type: 'enum:gold|silver|bronze', distribution: { type: 'zipf', s: 2 } },
    ];
    const { records } = generateData({ schema, rows: 1000 });
    const counts = {};
    for (const r of records) counts[r.tier] = (counts[r.tier] || 0) + 1;
    expect(counts['gold']).toBeGreaterThan(counts['silver']);
    expect(counts['silver'] || 0).toBeGreaterThan(counts['bronze'] || 0);
  });

  test('numeric type with distribution returns numbers', () => {
    const schema = [
      { name: 'score', type: 'number', distribution: { type: 'normal', mean: 70, stddev: 15 } },
    ];
    const { records } = generateData({ schema, rows: 100 });
    for (const r of records) {
      expect(typeof r.score).toBe('number');
      expect(Number.isFinite(r.score)).toBe(true);
    }
  });

  test('columns without distribution are unchanged', () => {
    const schema = [
      { name: 'id', type: 'autoIncrement' },
      { name: 'name', type: 'fullName' },
    ];
    const { records } = generateData({ schema, rows: 5 });
    expect(records[0].id).toBe(1);
    expect(records[4].id).toBe(5);
    expect(typeof records[0].name).toBe('string');
  });
});
