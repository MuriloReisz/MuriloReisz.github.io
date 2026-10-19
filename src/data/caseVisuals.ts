// ---------------------------------------------------------------------------
// caseVisuals — pure helpers behind the visual case-study components
// (ProjectDash, ProjectFlow, AgentTrace). Nothing in here invents a figure:
// every function only rearranges what a Project already states.
// ---------------------------------------------------------------------------
import type { ImpactMetric, Finding, Project } from './projects';

/** A 6-step ramp from the brand accent toward its softer tone and out to a
    near-white version, so a chart's CSS --c1..--c6 stay in the project's
    colourway however many bars/segments it draws. */
export function hexRamp(from: string, via: string): string[] {
  const STEPS = 6;
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgb1 = rgb(from);
  const rgb2 = rgb(via);
  return Array.from({ length: STEPS }, (_, i) => {
    const t = i / (STEPS - 1);
    const tone = t < 0.4 ? t / 0.4 : 1;
    const fade = t < 0.4 ? 0 : (t - 0.4) / 0.6;
    const channels = rgb1.map((c1, idx) => {
      const c = c1 + (rgb2[idx] - c1) * tone;
      return Math.round(c + (255 - c) * fade * 0.85);
    });
    return `#${channels.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  });
}

export const rampVars = (p: Project) =>
  hexRamp(p.brand.accent, p.brand.accent2).map((c, i) => `--c${i + 1}:${c}`).join('; ');

/** The approach step that acts as the guardrail, if any — the one the flow
    diagram and the trace single out. -1 when no step reads as a gate. */
export function gateIndex(approach: Project['approach']): number {
  const re = /check|review|guardrail|honest|verif|gate|rules|refus|scope|validat|closed book|cannot lie|tested/i;
  return approach.findIndex((s) => re.test(`${s.title} ${s.body}`));
}

export type DashMode = 'pairs' | 'series' | 'flow';

/** What the dashboard's main panel can show without inventing anything:
    measured before/after pairs first, then a measured series, otherwise
    the flow of the approach. */
export function dashMode(p: Project): DashMode {
  if (p.beforeAfter.length) return 'pairs';
  if (p.chart && p.chart.series.length) return 'series';
  return 'flow';
}

/** Only the figures that are real numbers — the ones that carry `count`. */
export function numericMetrics(p: Project): (Finding | ImpactMetric)[] {
  const all: (Finding | ImpactMetric)[] = [
    p.impact.value, p.impact.time, p.impact.effort, p.impact.quality, ...p.findings,
  ];
  const seen = new Set<string>();
  return all.filter((m) => {
    if (m.count === undefined) return false;
    const key = `${m.value}|${m.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type TraceLine = {
  kind: 'cmd' | 'plan' | 'step' | 'sub' | 'gate' | 'tools' | 'handoff' | 'exit';
  text: string;
};

/** First clause of a sentence, for the indented line under each step. */
const clause = (s: string, max = 72) => {
  const cut = s.split(/[.;:—]/)[0].trim();
  return cut.length > max ? cut.slice(0, max - 1).trimEnd() + '…' : cut;
};

/**
 * The illustrative run: the approach steps in order, the gate step called
 * out, the stack named once, the first result as the hand-off. It is a
 * reading of the write-up, not a log, and the component says so.
 */
export function traceLines(p: Project): TraceLine[] {
  const gate = gateIndex(p.approach);
  const lines: TraceLine[] = [
    { kind: 'cmd', text: `run ${p.brand.wordmark.toLowerCase().replace(/\s+/g, '-')}` },
    { kind: 'plan', text: `[plan] ${p.approach.length} steps` },
  ];
  p.approach.forEach((s, i) => {
    if (i === gate) lines.push({ kind: 'gate', text: `[gate] ✓ ${s.title}` });
    else lines.push({ kind: 'step', text: `[step ${String(i + 1).padStart(2, '0')}] ${s.title}` });
    lines.push({ kind: 'sub', text: `↳ ${clause(s.body)}` });
  });
  lines.push({ kind: 'tools', text: `[tools] ${p.stack.join(' · ')}` });
  if (p.results[0]) lines.push({ kind: 'handoff', text: `[handoff] ${clause(p.results[0], 90)}` });
  lines.push({ kind: 'exit', text: '[exit 0]' });
  return lines;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
