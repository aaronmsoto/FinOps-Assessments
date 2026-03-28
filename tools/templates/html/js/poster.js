/* Poster View — render domains/capabilities with score overlays */

const Poster = (() => {
  function render(specData, state) {
    const container = document.getElementById('poster-container');
    if (!container) return;

    let html = '<div class="poster"><div class="grid-2">';

    for (const domain of specData.domains) {
      const priority = (state.priorities && state.priorities[domain.id]) || '';

      html += `<div class="domain-card" data-domain-id="${domain.id}">`;
      html += `<div class="domain-header">`;
      html += `<h3 class="domain-title">${esc(domain.title)}</h3>`;
      html += `<span class="domain-score" data-domain-score="${domain.id}">—</span>`;
      html += `<span class="domain-priority">`;
      html += `<label>Priority</label>`;
      html += `<select data-domain-priority="${domain.id}" aria-label="Priority for ${esc(domain.title)}">`;
      html += `<option value="">—</option>`;
      for (let i = 1; i <= 4; i++) {
        const sel = (priority == i) ? ' selected' : '';
        html += `<option value="${i}"${sel}>${i}</option>`;
      }
      html += `</select>`;
      html += `<span class="domain-priority-print">#${priority || '—'}</span>`;
      html += `</span>`;
      html += `</div>`;

      html += `<div class="capabilities-grid">`;
      for (const cap of domain.capabilities) {
        const hidden = Scoring.isCapabilityHidden(cap, state.config);
        const cls = hidden ? ' excluded' : '';
        html += `<div class="cap-card${cls}" data-cap-id="${cap.id}">`;
        html += `<div class="cap-bar" data-cap-bar="${cap.id}"></div>`;
        html += `<div class="cap-card-inner">`;
        html += `<span class="cap-name">${esc(cap.title)}</span>`;
        html += `<span class="cap-score" data-cap-score="${cap.id}">—</span>`;
        html += `</div></div>`;
      }
      html += `</div></div>`;
    }

    html += '</div></div>';
    container.innerHTML = html;

    // Render overall score
    const overallContainer = document.getElementById('overall-score-container');
    if (overallContainer) {
      overallContainer.innerHTML = `
        <div class="overall-score">
          <div class="label">Overall Score</div>
          <div class="value unscored" id="overall-score-value">—</div>
        </div>`;
    }

    // Bind priority dropdowns
    container.querySelectorAll('[data-domain-priority]').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const domainId = parseInt(e.target.dataset.domainPriority);
        const rank = e.target.value ? parseInt(e.target.value) : null;
        App.setPriority(domainId, rank);
        // Update print text
        const printSpan = e.target.parentElement.querySelector('.domain-priority-print');
        if (printSpan) printSpan.textContent = '#' + (rank || '—');
      });
    });
  }

  function update(scores, state) {
    // Update domain scores
    for (const domain of scores.domains) {
      const el = document.querySelector(`[data-domain-score="${domain.id}"]`);
      if (el) {
        el.textContent = Scoring.formatScore(domain.score);
        el.style.color = domain.score !== null ? Scoring.getScoreColor(domain.score) : '';
      }

      // Update capability scores and bars
      for (const cap of domain.capabilities) {
        const scoreEl = document.querySelector(`[data-cap-score="${cap.id}"]`);
        if (scoreEl) {
          scoreEl.textContent = Scoring.formatScore(cap.score);
          if (cap.score !== null) {
            scoreEl.classList.add('scored');
          } else {
            scoreEl.classList.remove('scored');
          }
        }

        const barEl = document.querySelector(`[data-cap-bar="${cap.id}"]`);
        if (barEl) {
          if (cap.score !== null && !cap.hidden) {
            barEl.style.width = (cap.score * 10) + '%';
            barEl.style.backgroundColor = Scoring.getScoreColor(cap.score);
          } else {
            barEl.style.width = '0%';
          }
        }

        const cardEl = document.querySelector(`[data-cap-id="${cap.id}"]`);
        if (cardEl) {
          if (cap.hidden) {
            cardEl.classList.add('excluded');
          } else {
            cardEl.classList.remove('excluded');
          }
        }
      }
    }

    // Update overall score
    const overallEl = document.getElementById('overall-score-value');
    if (overallEl) {
      overallEl.textContent = Scoring.formatScore(scores.overall);
      if (scores.overall !== null) {
        overallEl.classList.remove('unscored');
        overallEl.style.color = Scoring.getScoreColor(scores.overall);
      } else {
        overallEl.classList.add('unscored');
        overallEl.style.color = '';
      }
    }
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  return { render, update };
})();
