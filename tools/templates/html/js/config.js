/* Config Panel — title/subtitle, capability visibility, weight overrides */

const Config = (() => {
  function render(specData, state) {
    const container = document.getElementById('config-content');
    if (!container) return;

    let html = '';

    // General section
    html += `<div class="config-section">`;
    html += `<h3>General</h3>`;
    html += `<div class="config-field">`;
    html += `<label for="config-title">Title</label>`;
    html += `<input type="text" id="config-title" value="${esc(state.config.title || App.getDefault('title'))}" placeholder="Assessment title">`;
    html += `</div>`;
    html += `<div class="config-field">`;
    html += `<label for="config-subtitle">Subtitle</label>`;
    html += `<input type="text" id="config-subtitle" value="${esc(state.config.subtitle || App.getDefault('subtitle'))}" placeholder="Optional subtitle">`;
    html += `</div>`;
    html += `</div>`;

    // Capabilities & Actions (unified hierarchy)
    const showBeta = state.config.showBetaActions || false;
    const ICON_ACTIVE = '<svg class="action-icon active" width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#00C693"/><path d="M5 8l2 2 4-4" stroke="#fff" stroke-width="1.5" fill="none"/></svg>';
    const ICON_BETA = '<svg class="action-icon beta" width="14" height="14" viewBox="0 0 16 16"><path d="M8 1l7 13H1z" fill="#F59E0B"/><text x="8" y="12" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">!</text></svg>';

    html += `<div class="config-section">`;
    html += `<h3>Capabilities & Actions</h3>`;
    html += `<div class="config-beta-toggle">`;
    html += `<input type="checkbox" id="config-show-beta"${showBeta ? ' checked' : ''}>`;
    html += `<label for="config-show-beta">Show Beta Actions <span class="beta-hint">(Weight = 0, not yet accepted)</span></label>`;
    html += `</div>`;
    const hiddenCaps = (state.config.hiddenCapabilities || []);
    const sortedDomains = Utils.sortDomains(specData.domains);

    for (const domain of sortedDomains) {
      html += `<details class="config-domain-group" open>`;
      html += `<summary class="config-domain-title">${esc(domain.title)}</summary>`;
      html += `<div class="config-domain-body">`;

      for (const cap of domain.capabilities) {
        const capChecked = !hiddenCaps.includes(cap.id) ? ' checked' : '';

        html += `<details class="config-cap-group" open>`;
        html += `<summary class="config-cap-summary">`;
        html += `<input type="checkbox" data-cap-vis="${cap.id}"${capChecked} onclick="event.stopPropagation()">`;
        html += `<span class="config-cap-name">${esc(cap.title)}</span>`;
        html += `</summary>`;
        html += `<div class="config-actions-list">`;

        for (const action of cap.actions) {
          const currentWeight = Scoring.getEffectiveWeight(action, state.config);
          const isBeta = action.weight === 0;
          if (isBeta && !showBeta) continue;
          const icon = currentWeight > 0 ? ICON_ACTIVE : ICON_BETA;
          html += `<div class="config-action-row">`;
          html += `<span class="config-action-icon">${icon}</span>`;
          html += `<span class="config-action-name" title="${esc(action.description || '')}">${esc(action.title)}</span>`;
          html += `<span class="config-action-weight">`;
          html += `<input type="number" data-weight-action="${action.id}" value="${currentWeight}" min="0" max="10" step="0.1">`;
          html += `<span class="original-weight">${action.weight}</span>`;
          html += `</span>`;
          html += `</div>`;
        }

        html += `</div></details>`;
      }

      html += `</div></details>`;
    }
    html += `</div>`;

    // Data management
    html += `<div class="config-section">`;
    html += `<h3>Data Management</h3>`;
    html += `<div class="config-actions">`;
    html += `<button class="config-btn-action" id="config-export">Export JSON</button>`;
    html += `<button class="config-btn-action" id="config-import">Import JSON</button>`;
    html += `<button class="config-btn-action" id="config-save-html">Save As Read-Only HTML</button>`;
    html += `<button class="config-btn-action danger" id="config-reset">Reset All</button>`;
    html += `</div>`;
    html += `</div>`;

    // Maturity Thresholds
    const thresholds = (state.config.thresholds && state.config.thresholds.length === 4)
      ? state.config.thresholds : Scoring.DEFAULT_THRESHOLDS;
    const thresholdLabels = ['Run', 'Walk', 'Crawl', 'Pre-crawl'];
    html += `<div class="config-section">`;
    html += `<h3>Maturity Thresholds</h3>`;
    html += `<div class="config-thresholds">`;
    thresholds.forEach((t, i) => {
      html += `<div class="config-threshold-row">`;
      html += `<span class="threshold-label">${thresholdLabels[i]}</span>`;
      html += `<span class="threshold-inputs">`;
      html += `<label>&ge;</label>`;
      html += `<input type="number" class="threshold-min" data-threshold-idx="${i}" value="${t.min}" min="0" max="10" step="0.5">`;
      html += `<input type="color" class="threshold-color" data-threshold-idx="${i}" value="${t.color}">`;
      html += `</span>`;
      html += `</div>`;
    });
    html += `</div></div>`;

    // Diagnostics
    const diagOn = state.config.diagnostics || false;
    html += `<div class="config-section">`;
    html += `<h3>Diagnostics</h3>`;
    html += `<div class="config-cap-item">`;
    html += `<input type="checkbox" id="config-diagnostics"${diagOn ? ' checked' : ''}>`;
    html += `<label for="config-diagnostics">Show action metadata (ID, Score Type, Formula, Scoring)</label>`;
    html += `</div>`;
    html += `</div>`;

    container.innerHTML = html;
    bindEvents(specData, state);
  }

  function bindEvents(specData, state) {
    // Title
    document.getElementById('config-title').addEventListener('input', (e) => {
      App.setConfig('title', e.target.value);
    });

    // Subtitle
    document.getElementById('config-subtitle').addEventListener('input', (e) => {
      App.setConfig('subtitle', e.target.value);
    });

    // Show Beta Actions toggle
    document.getElementById('config-show-beta').addEventListener('change', (e) => {
      App.setConfig('showBetaActions', e.target.checked);
      // Re-render config to show/hide beta actions
      Config.render(App.getSpecData(), App.getState());
    });

    // Capability visibility
    document.querySelectorAll('[data-cap-vis]').forEach(cb => {
      cb.addEventListener('change', () => {
        const capId = parseInt(cb.dataset.capVis);
        const currentState = App.getState();
        const hidden = currentState.config.hiddenCapabilities || [];
        if (cb.checked) {
          App.setConfig('hiddenCapabilities', hidden.filter(id => id !== capId));
        } else {
          App.setConfig('hiddenCapabilities', [...hidden, capId]);
        }
        Assess.render(App.getSpecData(), App.getState());
        App.recalculate();
      });
    });

    // Weight overrides
    document.querySelectorAll('[data-weight-action]').forEach(input => {
      input.addEventListener('change', () => {
        const actionId = parseInt(input.dataset.weightAction);
        const weight = parseFloat(input.value) || 0;
        const currentState = App.getState();
        const weights = currentState.config.weights || {};
        weights[actionId] = weight;
        App.setConfig('weights', weights);
        Assess.render(App.getSpecData(), App.getState());
        App.recalculate();
      });
    });

    // Export
    document.getElementById('config-export').addEventListener('click', () => {
      Storage.exportJSON();
    });

    // Import
    document.getElementById('config-import').addEventListener('click', () => {
      Storage.importJSON();
    });

    // Reset
    document.getElementById('config-reset').addEventListener('click', () => {
      if (confirm('Reset all responses, configuration, and priorities? This cannot be undone.')) {
        App.setState({ responses: {}, config: {}, priorities: {}, frameworkOverview: '', finalComments: '' });
      }
    });

    // Threshold inputs
    document.querySelectorAll('.threshold-min, .threshold-color').forEach(input => {
      input.addEventListener('change', () => {
        const thresholds = [];
        for (let i = 0; i < 4; i++) {
          const minEl = document.querySelector(`.threshold-min[data-threshold-idx="${i}"]`);
          const colorEl = document.querySelector(`.threshold-color[data-threshold-idx="${i}"]`);
          thresholds.push({
            min: parseFloat(minEl.value) || 0,
            color: colorEl.value
          });
        }
        // Sort descending by min
        thresholds.sort((a, b) => b.min - a.min);
        App.setConfig('thresholds', thresholds);
      });
    });

    // Save As HTML
    document.getElementById('config-save-html').addEventListener('click', () => {
      Storage.saveAsHTML();
    });

    // Diagnostics toggle
    document.getElementById('config-diagnostics').addEventListener('change', (e) => {
      App.setConfig('diagnostics', e.target.checked);
      document.querySelectorAll('.assess-diagnostics').forEach(el => {
        el.classList.toggle('hidden', !e.target.checked);
      });
    });
  }

  const esc = Utils.esc;

  return { render };
})();
