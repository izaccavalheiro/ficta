/**
 * Statistical distribution samplers.
 *
 * All functions are pure and environment-agnostic. No external dependencies.
 * By default they use `Math.random()` for random sampling, but every function
 * accepts an optional `rng` parameter — a `() => number` function that returns
 * a uniform sample in the range [0, 1). Pass a seeded random function (e.g.
 * `getFaker().number.float`) to make output deterministic.
 *
 * @module distributions
 */

/**
 * Uniform sample in [min, max).
 * @param {number} min
 * @param {number} max
 * @param {() => number} [rng]
 * @returns {number}
 */
export function sampleUniform(min, max, rng = Math.random) {
  return min + rng() * (max - min);
}

/**
 * Normal (Gaussian) sample using the Box-Muller transform.
 * @param {number} mean
 * @param {number} stddev
 * @param {() => number} [rng]
 * @returns {number}
 */
export function sampleNormal(mean, stddev, rng = Math.random) {
  // Box-Muller transform: two uniform samples → one normal sample
  let u, v;
  do {
    u = rng();
  } while (u === 0); // avoid log(0)
  v = rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + stddev * z;
}

/**
 * Exponential sample using the inverse CDF.
 * @param {number} lambda - Rate parameter (λ > 0). Mean = 1/λ.
 * @param {() => number} [rng]
 * @returns {number} Non-negative sample.
 */
export function sampleExponential(lambda, rng = Math.random) {
  if (lambda <= 0) {
    throw new Error(`sampleExponential: lambda must be > 0, got ${lambda}`);
  }
  let u;
  do {
    u = rng();
  } while (u === 1); // avoid log(0) from 1 - 1 = 0
  return -Math.log(1 - u) / lambda;
}

/**
 * Zipf distribution sample over `n` items with exponent `s`.
 *
 * Returns an integer in [1, n] (1-indexed rank) where rank 1 is the most
 * frequent and the probability of rank k is proportional to 1 / k^s.
 *
 * @param {number} n - Number of distinct items (must be ≥ 1).
 * @param {number} s - Exponent parameter (s > 0). Higher s = more skewed.
 * @param {() => number} [rng]
 * @returns {number} Integer rank in [1, n].
 */
export function sampleZipf(n, s, rng = Math.random) {
  if (n < 1 || !Number.isInteger(n)) {
    throw new Error(`sampleZipf: n must be a positive integer, got ${n}`);
  }
  if (s <= 0) {
    throw new Error(`sampleZipf: s must be > 0, got ${s}`);
  }

  // Pre-compute the normalisation constant H_{n,s} = sum(1/k^s, k=1..n)
  let h = 0;
  for (let k = 1; k <= n; k++) {
    h += 1 / Math.pow(k, s);
  }

  const u = rng() * h;
  let cumulative = 0;
  for (let k = 1; k <= n; k++) {
    cumulative += 1 / Math.pow(k, s);
    if (u <= cumulative) return k;
  }
  return n; // fallback
}

/**
 * Sample from a named statistical distribution.
 *
 * @param {Object} opts
 * @param {'uniform'|'normal'|'exponential'|'zipf'} opts.type
 * @param {number} [opts.min] - Uniform: lower bound
 * @param {number} [opts.max] - Uniform: upper bound
 * @param {number} [opts.mean] - Normal: mean
 * @param {number} [opts.stddev] - Normal: standard deviation
 * @param {number} [opts.lambda] - Exponential: rate (λ)
 * @param {number} [opts.n] - Zipf: number of items
 * @param {number} [opts.s] - Zipf: exponent
 * @param {() => number} [opts.rng] - Optional RNG (defaults to Math.random)
 * @returns {number}
 */
export function sampleFromDistribution({ type, min = 0, max = 1, mean = 0, stddev = 1, lambda = 1, n = 10, s = 1, rng = Math.random }) {
  switch (type) {
    case 'uniform':
      return sampleUniform(min, max, rng);
    case 'normal':
      return sampleNormal(mean, stddev, rng);
    case 'exponential':
      return sampleExponential(lambda, rng);
    case 'zipf':
      return sampleZipf(n, s, rng);
    default:
      throw new Error(`sampleFromDistribution: unknown type "${type}". Supported: uniform, normal, exponential, zipf`);
  }
}
