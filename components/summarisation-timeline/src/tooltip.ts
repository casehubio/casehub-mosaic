import { html, nothing } from 'lit';

type Lane = 'l1' | 'l2' | 'l3' | 'l4';

function formatTimestamp(ms: number, format: 'utc' | 'local'): string {
  const opts: Intl.DateTimeFormatOptions = format === 'utc' ? { timeZone: 'UTC' } : {};
  return new Date(ms).toLocaleTimeString(undefined, opts);
}

export function renderTooltip(
  event: Record<string, unknown> | null,
  lane: Lane | null,
  position: { x: number; y: number } | null,
  timestampFormat: 'utc' | 'local',
  upwardLabels: string[],
  downwardCount: number,
) {
  if (!event || !position || !lane) return nothing;

  const laneLabel = lane === 'l1' ? 'Raw Event' : lane === 'l2' ? 'Episode' : lane === 'l3' ? 'Phase' : 'Decision Step';

  return html`
    <div class="tooltip" style="left: ${position.x}px; top: ${position.y}px;" role="tooltip">
      <div class="tooltip-header">${laneLabel}</div>
      ${_renderTimestamps(event, timestampFormat)}
      ${'classification' in event ? html`<div class="tooltip-row"><strong>Classification:</strong> ${event['classification']}</div>` : nothing}
      ${'label' in event ? html`<div class="tooltip-row"><strong>Label:</strong> ${event['label']}</div>` : nothing}
      ${'stepName' in event ? html`<div class="tooltip-row"><strong>Step:</strong> ${event['stepName']}</div>` : nothing}
      ${'payload' in event ? _renderPayload(event['payload'] as Record<string, unknown>) : nothing}
      ${lane !== 'l4' ? _renderLineage(upwardLabels, downwardCount) : nothing}
    </div>
  `;
}

function _renderTimestamps(event: Record<string, unknown>, format: 'utc' | 'local') {
  if ('timestamp' in event && typeof event['timestamp'] === 'number') {
    return html`<div class="tooltip-row"><strong>Time:</strong> ${formatTimestamp(event['timestamp'], format)}</div>`;
  }
  if ('from' in event && 'to' in event && typeof event['from'] === 'number' && typeof event['to'] === 'number') {
    return html`<div class="tooltip-row"><strong>Time:</strong> ${formatTimestamp(event['from'], format)} — ${formatTimestamp(event['to'], format)}</div>`;
  }
  return nothing;
}

function _renderPayload(payload: Record<string, unknown>) {
  const entries = Object.entries(payload).slice(0, 5);
  if (entries.length === 0) return nothing;
  return html`
    <div class="tooltip-section">
      ${entries.map(([k, v]) => html`<div class="tooltip-row"><strong>${k}:</strong> ${String(v)}</div>`)}
    </div>
  `;
}

function _renderLineage(upwardLabels: string[], downwardCount: number) {
  if (upwardLabels.length === 0 && downwardCount === 0) return nothing;
  return html`
    <div class="tooltip-section">
      ${upwardLabels.length > 0 ? html`<div class="tooltip-row">Summarised into: ${upwardLabels.join(', ')}</div>` : nothing}
      ${downwardCount > 0 ? html`<div class="tooltip-row">Sources: ${downwardCount} events</div>` : nothing}
    </div>
  `;
}
