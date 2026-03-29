/* Poster View — render domains/capabilities matching finops.org layout */

const Poster = (() => {
  function render(specData, state) {
    const container = document.getElementById('poster-container');
    if (!container) return;

    // Sort domains: pillars (Understand, Quantify, Optimize) then foundation (Manage)
    const sorted = Utils.sortDomains(specData.domains);
    const isFoundation = d => d.title.toLowerCase().includes('manage');
    const pillarDomains = sorted.filter(d => !isFoundation(d));
    const foundationDomains = sorted.filter(isFoundation);

    const defaultOverview = 'FinOps is an operational framework and cultural practice which maximizes the business value of technology, enables timely data-driven decision making, and creates financial accountability through collaboration between engineering, finance, and business teams. This assessment measures maturity across FinOps Capabilities to assess your organization\u2019s ability to achieve the outcomes represented by FinOps Domains.';
    const overviewContent = state.frameworkOverview || defaultOverview;

    let html = '';
    html += '<div class="editable-section"><h2 class="section-heading">Framework Overview</h2>';
    html += `<div id="framework-overview" class="editable-content" contenteditable="true" data-placeholder="Add a framework overview or executive summary...">${esc(overviewContent)}</div>`;
    html += '</div>';

    html += '<div class="poster">';

    // Overall score — centered above the poster
    html += '<div class="poster-overall">';
    html += '<span class="poster-overall-label">Overall Score</span>';
    html += '<span class="poster-overall-maturity" id="overall-maturity-icon"></span>';
    html += '<span class="poster-overall-value unscored" id="overall-score-value">\u2014</span>';
    html += '</div>';

    // Outer blue container
    html += '<div class="poster-outer">';
    html += '<div class="poster-inner">';

    // Labels bar
    html += '<div class="poster-labels">';
    html += '<span class="poster-label-domain">Domains</span>';
    html += '<span class="poster-label-caps">Capabilities</span>';
    html += '</div>';

    // 3-pillar row (top domains)
    html += '<div class="poster-pillars">';
    for (const domain of pillarDomains) {
      html += renderDomainCard(domain, state);
    }
    html += '</div>';

    // Foundation row (Manage the FinOps Practice — full width)
    for (const domain of foundationDomains) {
      html += '<div class="poster-foundation">';
      html += renderDomainCard(domain, state, true);
      html += '</div>';
    }

    html += '</div></div></div>';
    container.innerHTML = html;

    // Listen for priority changes from Assess tab
    App.on('priorityChanged', ({ domainId, rank }) => {
      const badge = document.querySelector(`[data-domain-priority-badge="${domainId}"]`);
      if (badge) {
        if (rank) {
          badge.textContent = '#' + rank;
          badge.classList.remove('hidden');
        } else {
          badge.textContent = '';
          badge.classList.add('hidden');
        }
      }
    });
  }

  function renderDomainCard(domain, state, isFoundation) {
    const priority = (state.priorities && state.priorities[domain.id]) || '';

    let html = `<div class="domain-card" data-domain-id="${domain.id}">`;

    // Domain title row
    html += `<h2 class="domain-title">`;
    if (priority) {
      html += `<span class="domain-priority-badge" data-domain-priority-badge="${domain.id}">#${priority}</span>`;
    } else {
      html += `<span class="domain-priority-badge hidden" data-domain-priority-badge="${domain.id}"></span>`;
    }
    html += `<span class="domain-title-text">${esc(domain.title)}</span>`;
    html += `<span class="domain-maturity" data-domain-maturity="${domain.id}"></span>`;
    html += `<span class="domain-score" data-domain-score="${domain.id}">\u2014</span>`;
    html += `</h2>`;

    // Capabilities
    html += `<div class="capabilities-grid">`;
    for (const cap of domain.capabilities) {
      const hidden = Scoring.isCapabilityHidden(cap, state.config);
      const cls = hidden ? ' excluded' : '';
      html += `<div class="cap-card${cls}" data-cap-id="${cap.id}">`;
      html += `<div class="cap-bar" data-cap-bar="${cap.id}"></div>`;
      html += `<div class="cap-card-inner">`;
      html += `<span class="cap-name">${esc(cap.title)}</span>`;
      html += `<span class="cap-score" data-cap-score="${cap.id}">\u2014</span>`;
      html += `</div></div>`;
    }
    html += `</div></div>`;

    return html;
  }

  function update(scores, state) {
    for (const domain of scores.domains) {
      const el = document.querySelector(`[data-domain-score="${domain.id}"]`);
      if (el) {
        el.textContent = Scoring.formatScore(domain.score);
        el.style.color = domain.score !== null ? Scoring.getScoreColor(domain.score) : '';
      }

      const matEl = document.querySelector(`[data-domain-maturity="${domain.id}"]`);
      if (matEl) {
        matEl.innerHTML = Utils.getMaturitySvg(domain.score);
      }

      for (const cap of domain.capabilities) {
        const scoreEl = document.querySelector(`[data-cap-score="${cap.id}"]`);
        if (scoreEl) {
          scoreEl.textContent = Scoring.formatScore(cap.score);
          scoreEl.classList.toggle('scored', cap.score !== null);
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
          cardEl.classList.toggle('excluded', cap.hidden);
        }
      }
    }

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

    const overallIcon = document.getElementById('overall-maturity-icon');
    if (overallIcon) {
      overallIcon.innerHTML = Utils.getMaturitySvg(scores.overall);
    }
  }

  const esc = Utils.esc;

  return { render, update };
})();
