/* Charts — Canvas API (domain maturity, capability bars, distribution) */

const Charts = (() => {
  let lastScores = null;

  function render(scores) {
    lastScores = scores;
    // Only draw if canvases are visible (have non-zero dimensions)
    const testCanvas = document.getElementById('chart-domains');
    if (testCanvas && testCanvas.clientWidth > 0) {
      drawDomainMaturity(scores);
      drawCapabilityBars(scores);
      drawDistribution(scores);
    } else {
      // Schedule a redraw when the Results tab becomes visible
      requestAnimationFrame(() => {
        if (lastScores) {
          const c = document.getElementById('chart-domains');
          if (c && c.clientWidth > 0) {
            drawDomainMaturity(lastScores);
            drawCapabilityBars(lastScores);
            drawDistribution(lastScores);
          }
        }
      });
    }
  }

  function drawEmptyMessage(ctx, w, h, msg) {
    ctx.fillStyle = '#bbb';
    ctx.font = '13px IBM Plex Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, w / 2, h / 2);
  }

  // === Domain Maturity — vertical columns with icons and priorities ===
  function drawDomainMaturity(scores) {
    const canvas = document.getElementById('chart-domains');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const domains = sortDomains(scores.domains);
    const n = domains.length;
    if (n === 0) { drawEmptyMessage(ctx, w, h, 'No domains'); return; }

    const hasAnyScore = domains.some(d => d.score !== null);
    const state = App.getState();
    const thresholds = Scoring.getThresholds();
    const chartTop = 30;
    const chartBottom = h - 60;
    const chartH = chartBottom - chartTop;
    const colWidth = Math.min(120, (w - 80) / n);
    const gap = (w - n * colWidth) / (n + 1);

    // Y-axis gridlines at threshold values
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    ctx.font = '9px IBM Plex Sans, sans-serif';
    ctx.fillStyle = '#bbb';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const t of thresholds) {
      const y = chartBottom - (t.min / 10) * chartH;
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(35, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(t.min.toFixed(1), 30, y);
    }
    // Top line (10)
    const topY = chartBottom - chartH;
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.moveTo(35, topY);
    ctx.lineTo(w - 10, topY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('10', 30, topY);

    // Draw columns
    domains.forEach((d, i) => {
      const x = gap + i * (colWidth + gap);
      const priority = (state.priorities && state.priorities[d.id]) || '';

      // Column bar
      if (d.score !== null) {
        const barH = (d.score / 10) * chartH;
        const barY = chartBottom - barH;
        const color = Scoring.getScoreColor(d.score);

        // Bar with gradient feel
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, barY, colWidth, barH, [6, 6, 0, 0]);
        } else {
          ctx.rect(x, barY, colWidth, barH);
        }
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Score on bar
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px IBM Plex Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = barH > 30 ? 'top' : 'bottom';
        const scoreY = barH > 30 ? barY + 8 : barY - 4;
        ctx.fillText(Scoring.formatScore(d.score), x + colWidth / 2, scoreY);

        // Maturity level label
        const level = Utils.getMaturityLevel(d.score);
        if (level) {
          ctx.fillStyle = '#666';
          ctx.font = '10px IBM Plex Sans, sans-serif';
          ctx.textBaseline = 'top';
          const levelLabel = level.charAt(0).toUpperCase() + level.slice(1).replace('precrawl', 'Pre-crawl');
          ctx.fillText(levelLabel, x + colWidth / 2, chartBottom + 36);
        }
      } else {
        // Empty column
        ctx.fillStyle = '#f0f0f0';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, chartTop, colWidth, chartH, [6, 6, 0, 0]);
        } else {
          ctx.rect(x, chartTop, colWidth, chartH);
        }
        ctx.fill();
      }

      // Domain name
      ctx.fillStyle = '#333';
      ctx.font = 'bold 11px IBM Plex Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const name = d.title.length > 18 ? d.title.substring(0, 16) + '\u2026' : d.title;
      const label = priority ? '#' + priority + ' ' + name : name;
      ctx.fillText(label, x + colWidth / 2, chartBottom + 6);

      // Baseline
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, chartBottom);
      ctx.lineTo(x + colWidth, chartBottom);
      ctx.stroke();
    });
  }

  // === Capability Bars (horizontal, grouped by domain) ===
  function sortDomains(domains) {
    const PILLAR_ORDER = ['understand', 'quantify', 'optimize'];
    const FOUNDATION = ['manage'];
    const pillars = domains
      .filter(d => !FOUNDATION.some(kw => d.title.toLowerCase().includes(kw)))
      .sort((a, b) => {
        const ai = PILLAR_ORDER.findIndex(kw => a.title.toLowerCase().includes(kw));
        const bi = PILLAR_ORDER.findIndex(kw => b.title.toLowerCase().includes(kw));
        return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99);
      });
    const foundation = domains.filter(d => FOUNDATION.some(kw => d.title.toLowerCase().includes(kw)));
    return [...pillars, ...foundation];
  }

  function drawCapabilityBars(scores) {
    const canvas = document.getElementById('chart-capabilities');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;

    const headerH = 24;
    const capRowH = 22;
    const spacing = 8;
    const sorted = sortDomains(scores.domains);
    let totalH = 10;

    for (const d of sorted) {
      totalH += headerH;
      for (const c of d.capabilities) {
        if (!c.hidden) totalH += capRowH;
      }
      totalH += spacing;
    }
    totalH = Math.max(150, totalH + 10);

    canvas.style.height = totalH + 'px';
    canvas.width = w * dpr;
    canvas.height = totalH * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, totalH);

    const labelWidth = 200;
    const barMaxW = w - labelWidth - 50;
    let y = 10;

    for (const d of sorted) {
      // Domain header
      ctx.fillStyle = '#0080AF';
      ctx.font = 'bold 12px IBM Plex Sans, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.title, 4, y + headerH / 2);
      y += headerH;

      // Capability bars
      for (const c of d.capabilities) {
        if (c.hidden) continue;

        ctx.fillStyle = '#555';
        ctx.font = '11px IBM Plex Sans, sans-serif';
        ctx.textAlign = 'left';
        const name = c.title.length > 28 ? c.title.substring(0, 26) + '\u2026' : c.title;
        ctx.fillText(name, 12, y + capRowH / 2);

        if (c.score !== null) {
          const barW = (c.score / 10) * barMaxW;
          ctx.fillStyle = Scoring.getScoreColor(c.score);
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(labelWidth, y + 3, barW, capRowH - 6, 3);
          } else {
            ctx.rect(labelWidth, y + 3, barW, capRowH - 6);
          }
          ctx.fill();

          ctx.fillStyle = '#333';
          ctx.font = '10px IBM Plex Sans, sans-serif';
          ctx.fillText(Scoring.formatScore(c.score), labelWidth + barW + 6, y + capRowH / 2);
        } else {
          ctx.fillStyle = '#f0f0f0';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(labelWidth, y + 3, barMaxW, capRowH - 6, 3);
          } else {
            ctx.rect(labelWidth, y + 3, barMaxW, capRowH - 6);
          }
          ctx.fill();
        }

        y += capRowH;
      }

      y += spacing;
    }
  }

  // === Score Distribution Histogram (high scores on left) ===
  function drawDistribution(scores) {
    const canvas = document.getElementById('chart-distribution');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const thresholds = Scoring.getThresholds();
    const maturityLabels = ['Run', 'Walk', 'Crawl', 'Pre-crawl'];

    // Build buckets (high to low)
    const buckets = [];
    for (let i = 0; i < thresholds.length; i++) {
      const min = thresholds[i].min;
      const max = (i === 0) ? 10 : thresholds[i - 1].min;
      buckets.push({
        label: maturityLabels[i] || (min + '-' + max),
        range: min.toFixed(1) + '-' + max.toFixed(1),
        min, max,
        color: thresholds[i].color,
        count: 0
      });
    }
    buckets.push({ label: 'N/A', range: '', min: -1, max: -1, color: '#c8c8c8', count: 0 });

    // Count actions
    for (const d of scores.domains) {
      for (const c of d.capabilities) {
        if (c.hidden) continue;
        for (const a of c.actions) {
          if (a.weight <= 0) continue;
          if (a.score === null || !a.responded) {
            buckets[buckets.length - 1].count++;
          } else {
            let placed = false;
            for (let i = 0; i < buckets.length - 1; i++) {
              if (a.score >= buckets[i].min) {
                buckets[i].count++;
                placed = true;
                break;
              }
            }
            if (!placed) buckets[buckets.length - 1].count++;
          }
        }
      }
    }

    const maxCount = Math.max(1, ...buckets.map(b => b.count));
    const barWidth = Math.floor((w - 60) / buckets.length) - 8;
    const chartH = h - 50;
    const chartBottom = h - 35;

    ctx.textAlign = 'center';

    buckets.forEach((b, i) => {
      const x = 30 + i * (barWidth + 8);
      const barH = (b.count / maxCount) * chartH;

      ctx.fillStyle = b.color;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, chartBottom - barH, barWidth, barH, [3, 3, 0, 0]);
      } else {
        ctx.rect(x, chartBottom - barH, barWidth, barH);
      }
      ctx.fill();

      // Count
      ctx.fillStyle = '#333';
      ctx.font = '11px IBM Plex Sans, sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.fillText(b.count, x + barWidth / 2, chartBottom - barH - 2);

      // Label
      ctx.fillStyle = '#333';
      ctx.font = 'bold 10px IBM Plex Sans, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(b.label, x + barWidth / 2, chartBottom + 3);

      if (b.range) {
        ctx.fillStyle = '#999';
        ctx.font = '9px IBM Plex Sans, sans-serif';
        ctx.fillText(b.range, x + barWidth / 2, chartBottom + 16);
      }
    });
  }

  return { render };
})();
