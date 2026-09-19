export interface ConfidenceInterval {
  low: number;
  high: number;
  level: number;
}

export interface CorrelationInference {
  estimate: number;
  pValue: number;
  confidenceInterval: ConfidenceInterval;
  n: number;
}

export interface LinearCoefficient {
  name: string;
  estimate: number;
  standardizedEstimate: number | null;
  standardError: number;
  pValue: number;
  adjustedPValue: number;
  confidenceInterval: ConfidenceInterval;
  vif: number | null;
}

export interface LinearModelResult {
  outcome: string;
  n: number;
  predictorCount: number;
  rSquared: number;
  adjustedRSquared: number;
  rmse: number;
  residualDf: number;
  coefficients: LinearCoefficient[];
  warnings: string[];
}

export interface LogisticCoefficient {
  name: string;
  estimate: number;
  standardError: number;
  pValue: number;
  adjustedPValue: number;
  oddsRatio: number;
  confidenceInterval: ConfidenceInterval;
  oddsRatioConfidenceInterval: ConfidenceInterval;
  vif: number | null;
}

export interface LogisticModelResult {
  outcome: string;
  n: number;
  eventCount: number;
  predictorCount: number;
  converged: boolean;
  iterations: number;
  pseudoRSquared: number;
  coefficients: LogisticCoefficient[];
  warnings: string[];
}

const EPSILON = 1e-12;
const Z_95 = 1.959963984540054;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function sampleVariance(values: number[]): number {
  if (values.length < 2) return Number.NaN;
  const avg = mean(values);
  return values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
}

export function sampleStandardDeviation(values: number[]): number {
  return Math.sqrt(sampleVariance(values));
}

export function pearsonCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  const meanX = mean(x);
  const meanY = mean(y);
  let numerator = 0;
  let sumX = 0;
  let sumY = 0;

  for (let index = 0; index < x.length; index += 1) {
    const xv = x[index];
    const yv = y[index];
    if (xv === undefined || yv === undefined) return null;
    const dx = xv - meanX;
    const dy = yv - meanY;
    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }

  const denominator = Math.sqrt(sumX * sumY);
  if (denominator <= EPSILON) return null;
  return clamp(numerator / denominator, -1, 1);
}

function ranks(values: number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length);

  let position = 0;
  while (position < indexed.length) {
    let end = position + 1;
    while (end < indexed.length && indexed[end]?.value === indexed[position]?.value) {
      end += 1;
    }
    const averageRank = (position + 1 + end) / 2;
    for (let cursor = position; cursor < end; cursor += 1) {
      const originalIndex = indexed[cursor]?.index;
      if (originalIndex !== undefined) result[originalIndex] = averageRank;
    }
    position = end;
  }

  return result;
}

export function spearmanCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 3) return null;
  return pearsonCorrelation(ranks(x), ranks(y));
}

function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ];

  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }

  let x = 0.9999999999998099;
  const shifted = value - 1;
  for (let index = 0; index < coefficients.length; index += 1) {
    const coefficient = coefficients[index];
    if (coefficient !== undefined) x += coefficient / (shifted + index + 1);
  }

  const t = shifted + coefficients.length - 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(t) -
    t +
    Math.log(x)
  );
}

function betaContinuedFraction(x: number, alpha: number, beta: number): number {
  const maxIterations = 200;
  const fpMin = 1e-30;
  const qab = alpha + beta;
  const qap = alpha + 1;
  const qam = alpha - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpMin) d = fpMin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (beta - m) * x) / ((qam + m2) * (alpha + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    h *= d * c;

    aa = (-(alpha + m) * (qab + m) * x) / ((alpha + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < 3e-12) break;
  }

  return h;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(x, a, b)) / a;
  }
  return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
}

export function studentTCdf(value: number, degreesOfFreedom: number): number {
  if (!Number.isFinite(value) || degreesOfFreedom <= 0) return Number.NaN;
  if (value === 0) return 0.5;
  const x = degreesOfFreedom / (degreesOfFreedom + value * value);
  const tail = 0.5 * regularizedBeta(x, degreesOfFreedom / 2, 0.5);
  return value > 0 ? 1 - tail : tail;
}

function studentTCritical95(degreesOfFreedom: number): number {
  if (degreesOfFreedom <= 0) return Number.NaN;
  let low = 0;
  let high = 20;
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const mid = (low + high) / 2;
    if (studentTCdf(mid, degreesOfFreedom) < 0.975) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function erf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const polynomial =
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t);
  return sign * (1 - polynomial * Math.exp(-x * x));
}

export function normalCdf(value: number): number {
  return 0.5 * (1 + erf(value / Math.sqrt(2)));
}

export function correlationInference(x: number[], y: number[]): CorrelationInference | null {
  const estimate = pearsonCorrelation(x, y);
  if (estimate === null || x.length < 4) return null;

  const n = x.length;
  const safe = clamp(estimate, -0.999999, 0.999999);
  const fisher = Math.atanh(safe);
  const standardError = 1 / Math.sqrt(n - 3);
  const low = Math.tanh(fisher - Z_95 * standardError);
  const high = Math.tanh(fisher + Z_95 * standardError);

  const degreesOfFreedom = n - 2;
  const denominator = Math.max(EPSILON, 1 - estimate * estimate);
  const statistic = estimate * Math.sqrt(degreesOfFreedom / denominator);
  const pValue = Math.min(1, 2 * (1 - studentTCdf(Math.abs(statistic), degreesOfFreedom)));

  return {
    estimate: roundTo(estimate),
    pValue: roundTo(pValue),
    confidenceInterval: {
      low: roundTo(low),
      high: roundTo(high),
      level: 0.95,
    },
    n,
  };
}

export function benjaminiHochberg(pValues: number[]): number[] {
  if (pValues.length === 0) return [];
  const indexed = pValues
    .map((value, index) => ({ value: clamp(value, 0, 1), index }))
    .sort((a, b) => a.value - b.value);
  const adjusted = new Array<number>(pValues.length).fill(1);
  let runningMinimum = 1;

  for (let position = indexed.length - 1; position >= 0; position -= 1) {
    const item = indexed[position];
    if (!item) continue;
    const rank = position + 1;
    runningMinimum = Math.min(runningMinimum, (item.value * indexed.length) / rank);
    adjusted[item.index] = clamp(runningMinimum, 0, 1);
  }

  return adjusted.map((value) => roundTo(value));
}

export function wilsonInterval(successes: number, total: number): ConfidenceInterval {
  if (total <= 0) return { low: 0, high: 1, level: 0.95 };
  const proportion = successes / total;
  const z2 = Z_95 * Z_95;
  const denominator = 1 + z2 / total;
  const center = (proportion + z2 / (2 * total)) / denominator;
  const margin =
    (Z_95 / denominator) *
    Math.sqrt((proportion * (1 - proportion)) / total + z2 / (4 * total * total));

  return {
    low: roundTo(clamp(center - margin, 0, 1)),
    high: roundTo(clamp(center + margin, 0, 1)),
    level: 0.95,
  };
}

export function rateDifferenceConfidenceInterval(
  exposedSuccesses: number,
  exposedTotal: number,
  comparisonSuccesses: number,
  comparisonTotal: number,
): ConfidenceInterval {
  if (exposedTotal <= 0 || comparisonTotal <= 0) {
    return { low: -1, high: 1, level: 0.95 };
  }

  const p1 = exposedSuccesses / exposedTotal;
  const p0 = comparisonSuccesses / comparisonTotal;
  const ci1 = wilsonInterval(exposedSuccesses, exposedTotal);
  const ci0 = wilsonInterval(comparisonSuccesses, comparisonTotal);
  const difference = p1 - p0;

  const lower = difference - Math.hypot(p1 - ci1.low, ci0.high - p0);
  const upper = difference + Math.hypot(ci1.high - p1, p0 - ci0.low);

  return {
    low: roundTo(clamp(lower, -1, 1)),
    high: roundTo(clamp(upper, -1, 1)),
    level: 0.95,
  };
}

function transpose(matrix: number[][]): number[][] {
  if (matrix.length === 0) return [];
  const width = matrix[0]?.length ?? 0;
  return Array.from({ length: width }, (_, column) =>
    matrix.map((row) => row[column] ?? 0),
  );
}

function multiplyMatrices(left: number[][], right: number[][]): number[][] {
  if (left.length === 0 || right.length === 0) return [];
  const rightT = transpose(right);
  return left.map((row) =>
    rightT.map((column) =>
      row.reduce((sum, value, index) => sum + value * (column[index] ?? 0), 0),
    ),
  );
}

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  return matrix.map((row) =>
    row.reduce((sum, value, index) => sum + value * (vector[index] ?? 0), 0),
  );
}

function isSquareMatrix(matrix: number[][]): boolean {
  const size = matrix.length;
  return size > 0 && matrix.every((row) => row.length === size);
}

function augmentWithIdentity(matrix: number[][], ridge: number): number[][] {
  const size = matrix.length;
  return matrix.map((row, rowIndex) => [
    ...row.map((value, columnIndex) => value + (rowIndex === columnIndex ? ridge : 0)),
    ...Array.from({ length: size }, (_, columnIndex) => (rowIndex === columnIndex ? 1 : 0)),
  ]);
}

function findPivotRow(augmented: number[][], column: number): number {
  let pivot = column;
  for (let row = column + 1; row < augmented.length; row += 1) {
    const candidate = Math.abs(augmented[row]?.[column] ?? 0);
    const current = Math.abs(augmented[pivot]?.[column] ?? 0);
    if (candidate > current) pivot = row;
  }
  return pivot;
}

function swapRows(matrix: number[][], first: number, second: number): void {
  if (first === second) return;
  const temp = matrix[first];
  matrix[first] = matrix[second] ?? [];
  matrix[second] = temp ?? [];
}

function normalizePivotRow(row: number[], pivotValue: number): void {
  for (let index = 0; index < row.length; index += 1) {
    row[index] = (row[index] ?? 0) / pivotValue;
  }
}

function eliminatePivotColumn(
  augmented: number[][],
  pivotRowIndex: number,
  column: number,
): void {
  const pivotRow = augmented[pivotRowIndex];
  if (!pivotRow) return;

  for (let rowIndex = 0; rowIndex < augmented.length; rowIndex += 1) {
    if (rowIndex === pivotRowIndex) continue;
    const target = augmented[rowIndex];
    if (!target) continue;
    const factor = target[column] ?? 0;
    for (let index = 0; index < target.length; index += 1) {
      target[index] = (target[index] ?? 0) - factor * (pivotRow[index] ?? 0);
    }
  }
}

function inverseMatrix(matrix: number[][], ridge = 0): number[][] | null {
  if (!isSquareMatrix(matrix)) return null;
  const size = matrix.length;
  const augmented = augmentWithIdentity(matrix, ridge);

  for (let column = 0; column < size; column += 1) {
    const pivot = findPivotRow(augmented, column);
    const pivotValue = augmented[pivot]?.[column] ?? 0;
    if (Math.abs(pivotValue) < 1e-10) return null;

    swapRows(augmented, column, pivot);
    const active = augmented[column];
    if (!active) return null;

    normalizePivotRow(active, pivotValue);
    eliminatePivotColumn(augmented, column, column);
  }

  return augmented.map((row) => row.slice(size));
}

function addIntercept(predictors: number[][]): number[][] {
  return predictors.map((row) => [1, ...row]);
}

function calculateVif(predictors: number[][], predictorIndex: number): number | null {
  if (predictors.length < 5 || predictors[0]?.length === undefined) return null;
  const outcome = predictors.map((row) => row[predictorIndex] ?? 0);
  const otherPredictors = predictors.map((row) =>
    row.filter((_, index) => index !== predictorIndex),
  );

  if ((otherPredictors[0]?.length ?? 0) === 0) return 1;
  const design = addIntercept(otherPredictors);
  const designT = transpose(design);
  const inverse = inverseMatrix(multiplyMatrices(designT, design));
  if (!inverse) return null;

  const beta = multiplyMatrixVector(inverse, multiplyMatrixVector(designT, outcome));
  const fitted = multiplyMatrixVector(design, beta);
  const average = mean(outcome);
  const total = outcome.reduce((sum, value) => sum + (value - average) ** 2, 0);
  const residual = outcome.reduce(
    (sum, value, index) => sum + (value - (fitted[index] ?? average)) ** 2,
    0,
  );
  if (total <= EPSILON) return null;
  const rSquared = clamp(1 - residual / total, 0, 0.999999);
  return roundTo(1 / (1 - rSquared), 4);
}

function validRegressionInput(
  predictors: number[][],
  outcome: number[],
  predictorCount: number,
  minimumExtraRows: number,
): boolean {
  if (predictorCount === 0 || outcome.length !== predictors.length) return false;
  if (outcome.length <= predictorCount + minimumExtraRows) return false;
  return predictors.every((row) => row.length === predictorCount);
}

function hc3Meat(
  design: number[][],
  inverseXtX: number[][],
  residuals: number[],
): number[][] {
  const width = design[0]?.length ?? 0;
  const meat = Array.from({ length: width }, () => new Array<number>(width).fill(0));

  for (let rowIndex = 0; rowIndex < design.length; rowIndex += 1) {
    const row = design[rowIndex];
    if (!row) continue;
    const leverageVector = multiplyMatrixVector(inverseXtX, row);
    const leverage = clamp(
      row.reduce((sum, value, index) => sum + value * (leverageVector[index] ?? 0), 0),
      0,
      0.999999,
    );
    const scaledResidual = (residuals[rowIndex] ?? 0) / Math.max(1e-6, 1 - leverage);
    const weight = scaledResidual * scaledResidual;
    addOuterProduct(meat, row, weight);
  }

  return meat;
}

function addOuterProduct(target: number[][], row: number[], weight: number): void {
  for (let i = 0; i < row.length; i += 1) {
    const targetRow = target[i];
    if (!targetRow) continue;
    for (let j = 0; j < row.length; j += 1) {
      targetRow[j] =
        (targetRow[j] ?? 0) + (row[i] ?? 0) * (row[j] ?? 0) * weight;
    }
  }
}

interface LinearFitCore {
  beta: number[];
  robustCovariance: number[][];
  residualDf: number;
  rSquared: number;
  adjustedRSquared: number;
  rmse: number;
}

function calculateLinearFit(
  predictors: number[][],
  outcome: number[],
  predictorCount: number,
): LinearFitCore | null {
  const design = addIntercept(predictors);
  const designT = transpose(design);
  const inverseXtX = inverseMatrix(multiplyMatrices(designT, design));
  if (!inverseXtX) return null;

  const beta = multiplyMatrixVector(inverseXtX, multiplyMatrixVector(designT, outcome));
  const fitted = multiplyMatrixVector(design, beta);
  const residuals = outcome.map((value, index) => value - (fitted[index] ?? 0));
  const residualDf = outcome.length - predictorCount - 1;
  const residualSumSquares = residuals.reduce((sum, value) => sum + value * value, 0);
  const outcomeMean = mean(outcome);
  const totalSumSquares = outcome.reduce((sum, value) => sum + (value - outcomeMean) ** 2, 0);
  const rSquared =
    totalSumSquares <= EPSILON ? 0 : clamp(1 - residualSumSquares / totalSumSquares, 0, 1);
  const adjustedRSquared =
    1 - ((1 - rSquared) * (outcome.length - 1)) / Math.max(1, residualDf);
  const rmse = Math.sqrt(residualSumSquares / Math.max(1, residualDf));
  const meat = hc3Meat(design, inverseXtX, residuals);
  const robustCovariance = multiplyMatrices(multiplyMatrices(inverseXtX, meat), inverseXtX);

  return { beta, robustCovariance, residualDf, rSquared, adjustedRSquared, rmse };
}

function coefficientPValue(
  estimate: number,
  standardError: number,
  residualDf: number,
): number {
  if (standardError <= EPSILON) return estimate === 0 ? 1 : 0;
  const statistic = estimate / standardError;
  return Math.min(1, 2 * (1 - studentTCdf(Math.abs(statistic), residualDf)));
}

function standardizedLinearEstimate(
  index: number,
  estimate: number,
  outcomeSd: number,
  predictorSds: number[],
): number | null {
  if (index === 0 || !Number.isFinite(outcomeSd) || outcomeSd <= EPSILON) return null;
  const predictorSd = predictorSds[index - 1];
  if (predictorSd === undefined || !Number.isFinite(predictorSd)) return null;
  return (estimate * predictorSd) / outcomeSd;
}

function applyFdrToLinearCoefficients(coefficients: LinearCoefficient[]): void {
  const adjusted = benjaminiHochberg(coefficients.slice(1).map((coefficient) => coefficient.pValue));
  for (let index = 1; index < coefficients.length; index += 1) {
    const coefficient = coefficients[index];
    if (coefficient) coefficient.adjustedPValue = adjusted[index - 1] ?? 1;
  }
  const intercept = coefficients[0];
  if (intercept) intercept.adjustedPValue = intercept.pValue;
}

function buildLinearCoefficients(args: {
  beta: number[];
  robustCovariance: number[][];
  residualDf: number;
  predictorNames: string[];
  predictors: number[][];
  outcome: number[];
}): LinearCoefficient[] {
  const { beta, robustCovariance, residualDf, predictorNames, predictors, outcome } = args;
  const critical = studentTCritical95(residualDf);
  const outcomeSd = sampleStandardDeviation(outcome);
  const predictorSds = predictorNames.map((_, index) =>
    sampleStandardDeviation(predictors.map((row) => row[index] ?? 0)),
  );

  const coefficients = beta.map((estimate, index): LinearCoefficient => {
    const variance = robustCovariance[index]?.[index] ?? Number.NaN;
    const standardError = Math.sqrt(Math.max(0, variance));
    const pValue = coefficientPValue(estimate, standardError, residualDf);
    const standardizedEstimate = standardizedLinearEstimate(
      index,
      estimate,
      outcomeSd,
      predictorSds,
    );
    const name = index === 0 ? "Intercept" : predictorNames[index - 1] ?? "Predictor";
    const vif = index === 0 ? null : calculateVif(predictors, index - 1);

    return {
      name,
      estimate: roundTo(estimate),
      standardizedEstimate:
        standardizedEstimate === null ? null : roundTo(standardizedEstimate),
      standardError: roundTo(standardError),
      pValue: roundTo(pValue),
      adjustedPValue: 1,
      confidenceInterval: {
        low: roundTo(estimate - critical * standardError),
        high: roundTo(estimate + critical * standardError),
        level: 0.95,
      },
      vif,
    };
  });

  applyFdrToLinearCoefficients(coefficients);
  return coefficients;
}

function linearModelWarnings(
  n: number,
  predictorCount: number,
  rSquared: number,
  coefficients: LinearCoefficient[],
): string[] {
  const warnings: string[] = [];
  if (n < Math.max(20, 5 * (predictorCount + 1))) {
    warnings.push(
      "Small sample for the number of adjusted predictors; treat coefficient estimates as exploratory.",
    );
  }
  if (coefficients.some((coefficient) => (coefficient.vif ?? 0) >= 5)) {
    warnings.push(
      "One or more predictors have VIF >= 5, indicating potentially unstable estimates from multicollinearity.",
    );
  }
  if (rSquared > 0.95) {
    warnings.push(
      "Very high model fit can indicate overfitting in a small repeated-measures dataset.",
    );
  }
  return warnings;
}

export function fitLinearRegression(args: {
  outcomeName: string;
  predictorNames: string[];
  predictors: number[][];
  outcome: number[];
}): LinearModelResult | null {
  const { outcomeName, predictorNames, predictors, outcome } = args;
  const predictorCount = predictorNames.length;
  if (!validRegressionInput(predictors, outcome, predictorCount, 3)) return null;

  const fit = calculateLinearFit(predictors, outcome, predictorCount);
  if (!fit) return null;
  const coefficients = buildLinearCoefficients({
    beta: fit.beta,
    robustCovariance: fit.robustCovariance,
    residualDf: fit.residualDf,
    predictorNames,
    predictors,
    outcome,
  });

  return {
    outcome: outcomeName,
    n: outcome.length,
    predictorCount,
    rSquared: roundTo(fit.rSquared),
    adjustedRSquared: roundTo(fit.adjustedRSquared),
    rmse: roundTo(fit.rmse),
    residualDf: fit.residualDf,
    coefficients,
    warnings: linearModelWarnings(outcome.length, predictorCount, fit.rSquared, coefficients),
  };
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const z = Math.exp(-Math.min(value, 35));
    return 1 / (1 + z);
  }
  const z = Math.exp(Math.max(value, -35));
  return z / (1 + z);
}

function linearPredictor(row: number[], beta: number[]): number {
  return row.reduce((sum, value, index) => sum + value * (beta[index] ?? 0), 0);
}

interface LogisticSystem {
  hessian: number[][];
  gradient: number[];
  probabilities: number[];
}

function buildLogisticSystem(
  design: number[][],
  outcome: number[],
  beta: number[],
): LogisticSystem {
  const width = design[0]?.length ?? 0;
  const probabilities = design.map((row) => sigmoid(linearPredictor(row, beta)));
  const hessian = Array.from({ length: width }, () => new Array<number>(width).fill(0));
  const gradient = new Array<number>(width).fill(0);

  for (let rowIndex = 0; rowIndex < design.length; rowIndex += 1) {
    const row = design[rowIndex];
    if (!row) continue;
    const probability = probabilities[rowIndex] ?? 0.5;
    const residual = (outcome[rowIndex] ?? 0) - probability;
    const weight = Math.max(1e-6, probability * (1 - probability));
    accumulateLogisticRow(hessian, gradient, row, residual, weight);
  }

  return { hessian, gradient, probabilities };
}

function accumulateLogisticRow(
  hessian: number[][],
  gradient: number[],
  row: number[],
  residual: number,
  weight: number,
): void {
  for (let i = 0; i < row.length; i += 1) {
    gradient[i] = (gradient[i] ?? 0) + (row[i] ?? 0) * residual;
    const target = hessian[i];
    if (!target) continue;
    for (let j = 0; j < row.length; j += 1) {
      target[j] =
        (target[j] ?? 0) + (row[i] ?? 0) * weight * (row[j] ?? 0);
    }
  }
}

interface LogisticFitState {
  beta: number[];
  covariance: number[][];
  converged: boolean;
  iterations: number;
  probabilities: number[];
}

function fitLogisticIrls(
  design: number[][],
  outcome: number[],
  maxIterations: number,
): LogisticFitState | null {
  let beta = new Array<number>(design[0]?.length ?? 0).fill(0);
  let converged = false;
  let iterations = 0;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    iterations = iteration + 1;
    const system = buildLogisticSystem(design, outcome, beta);
    const covariance = inverseMatrix(system.hessian, 1e-8);
    if (!covariance) return null;

    const step = multiplyMatrixVector(covariance, system.gradient);
    const next = beta.map((value, index) => value + clamp(step[index] ?? 0, -2, 2));
    const maxChange = Math.max(
      ...next.map((value, index) => Math.abs(value - (beta[index] ?? 0))),
    );
    beta = next;
    if (maxChange < 1e-7) {
      converged = true;
      break;
    }
  }

  const finalSystem = buildLogisticSystem(design, outcome, beta);
  const covariance = inverseMatrix(finalSystem.hessian, 1e-8);
  if (!covariance) return null;

  return {
    beta,
    covariance,
    converged,
    iterations,
    probabilities: finalSystem.probabilities,
  };
}

function binaryLogLikelihood(outcome: number[], probabilities: number[]): number {
  return outcome.reduce((sum, value, index) => {
    const probability = clamp(probabilities[index] ?? 0.5, 1e-10, 1 - 1e-10);
    return sum + value * Math.log(probability) + (1 - value) * Math.log(1 - probability);
  }, 0);
}

function logisticPseudoRSquared(
  outcome: number[],
  probabilities: number[],
  eventCount: number,
): number {
  const n = outcome.length;
  const logLikelihood = binaryLogLikelihood(outcome, probabilities);
  const nullProbability = clamp(eventCount / n, 1e-10, 1 - 1e-10);
  const nullProbabilities = new Array<number>(n).fill(nullProbability);
  const nullLogLikelihood = binaryLogLikelihood(outcome, nullProbabilities);
  if (Math.abs(nullLogLikelihood) <= EPSILON) return 0;
  return 1 - logLikelihood / nullLogLikelihood;
}

function applyFdrToLogisticCoefficients(coefficients: LogisticCoefficient[]): void {
  const adjusted = benjaminiHochberg(coefficients.slice(1).map((coefficient) => coefficient.pValue));
  for (let index = 1; index < coefficients.length; index += 1) {
    const coefficient = coefficients[index];
    if (coefficient) coefficient.adjustedPValue = adjusted[index - 1] ?? 1;
  }
  const intercept = coefficients[0];
  if (intercept) intercept.adjustedPValue = intercept.pValue;
}

function buildLogisticCoefficients(args: {
  beta: number[];
  covariance: number[][];
  predictorNames: string[];
  predictors: number[][];
}): LogisticCoefficient[] {
  const { beta, covariance, predictorNames, predictors } = args;
  const coefficients = beta.map((estimate, index): LogisticCoefficient => {
    const standardError = Math.sqrt(Math.max(0, covariance[index]?.[index] ?? 0));
    const z = standardError > EPSILON ? estimate / standardError : 0;
    const pValue = Math.min(1, 2 * (1 - normalCdf(Math.abs(z))));
    const low = estimate - Z_95 * standardError;
    const high = estimate + Z_95 * standardError;
    const name = index === 0 ? "Intercept" : predictorNames[index - 1] ?? "Predictor";
    const vif = index === 0 ? null : calculateVif(predictors, index - 1);

    return {
      name,
      estimate: roundTo(estimate),
      standardError: roundTo(standardError),
      pValue: roundTo(pValue),
      adjustedPValue: 1,
      oddsRatio: roundTo(Math.exp(clamp(estimate, -20, 20))),
      confidenceInterval: { low: roundTo(low), high: roundTo(high), level: 0.95 },
      oddsRatioConfidenceInterval: {
        low: roundTo(Math.exp(clamp(low, -20, 20))),
        high: roundTo(Math.exp(clamp(high, -20, 20))),
        level: 0.95,
      },
      vif,
    };
  });

  applyFdrToLogisticCoefficients(coefficients);
  return coefficients;
}

function logisticWarnings(
  converged: boolean,
  eventCount: number,
  n: number,
  coefficients: LogisticCoefficient[],
): string[] {
  const warnings: string[] = [];
  if (!converged) {
    warnings.push("Logistic model did not fully converge; coefficient estimates are unstable.");
  }
  if (Math.min(eventCount, n - eventCount) < 10) {
    warnings.push("Few outcome/non-outcome days are available; odds ratios may be imprecise.");
  }
  if (coefficients.some((coefficient) => Math.abs(coefficient.estimate) >= 10)) {
    warnings.push("Very large coefficients suggest quasi-separation; interpret odds ratios cautiously.");
  }
  if (coefficients.some((coefficient) => (coefficient.vif ?? 0) >= 5)) {
    warnings.push(
      "One or more predictors have VIF >= 5, indicating potentially unstable adjusted estimates.",
    );
  }
  return warnings;
}

export function fitLogisticRegression(args: {
  outcomeName: string;
  predictorNames: string[];
  predictors: number[][];
  outcome: number[];
  maxIterations?: number;
}): LogisticModelResult | null {
  const { outcomeName, predictorNames, predictors, outcome } = args;
  const predictorCount = predictorNames.length;
  const eventCount = outcome.filter((value) => value === 1).length;
  const validBinaryOutcome = outcome.every((value) => value === 0 || value === 1);

  if (!validRegressionInput(predictors, outcome, predictorCount, 4)) return null;
  if (!validBinaryOutcome || eventCount < 5 || outcome.length - eventCount < 5) return null;

  const design = addIntercept(predictors);
  const fit = fitLogisticIrls(design, outcome, args.maxIterations ?? 60);
  if (!fit) return null;

  const coefficients = buildLogisticCoefficients({
    beta: fit.beta,
    covariance: fit.covariance,
    predictorNames,
    predictors,
  });
  const pseudoRSquared = logisticPseudoRSquared(outcome, fit.probabilities, eventCount);

  return {
    outcome: outcomeName,
    n: outcome.length,
    eventCount,
    predictorCount,
    converged: fit.converged,
    iterations: fit.iterations,
    pseudoRSquared: roundTo(pseudoRSquared),
    coefficients,
    warnings: logisticWarnings(fit.converged, eventCount, outcome.length, coefficients),
  };
}

