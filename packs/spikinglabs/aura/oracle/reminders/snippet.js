// Verbatim from Aura's sickOverview().
  const lastByMed = {}; es.filter(e => e.type === 'med').forEach(e => { const k = lc(e.name); if (!lastByMed[k]) lastByMed[k] = e; });
  const doses = Object.values(lastByMed).map(e => { const gap = medGap(e.name), next = gap ? e.t + gap * H : null;
    return `<div class="dose-line"><span><b>${esc(e.name)}</b> <span class="muted small">${ago(e.t)} · ${fmtTime(e.t)}</span></span>${next ? (next <= now ? `<span class="pill ok">${gap} h gap passed</span>` : `<span class="pill wait">${gap} h gap at ${fmtTime(next)}</span>`) : ''}</div>`; }).join('');
