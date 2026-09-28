export const LEADS = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];

export function qrsCategory(ms) {
  return ms < 120 ? 'narrow' : 'wide';
}

export function prCategory(ms) {
  if (ms == null) return 'not measurable';
  if (ms < 120) return 'short';
  if (ms <= 200) return 'normal';
  return 'prolonged';
}

export function pathologicalQ(durationMs, depthMm, qRPercent) {
  return durationMs >= 40 || depthMm >= 2 || qRPercent >= 25;
}

export function axisQuadrant(leadI, aVF) {
  if (leadI >= 0 && aVF >= 0) return 'Normal axis quadrant';
  if (leadI >= 0 && aVF < 0) return 'LAD / borderline: check lead II';
  if (leadI < 0 && aVF >= 0) return 'RAD';
  return 'Extreme axis';
}
