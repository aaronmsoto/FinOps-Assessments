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
    html += `<input type="text" id="config-title" value="${esc(state.config.title || 'FinOps Maturity Assessment')}" placeholder="Assessment title">`;
    html += `</div>`;
    html += `<div class="config-field">`;
    html += `<label for="config-subtitle">Subtitle</label>`;
    html += `<input type="text" id="config-subtitle" value="${esc(state.config.subtitle !== undefined ? state.config.subtitle : 'Measure progress over time against accepted standards')}" placeholder="Optional subtitle">`;
    html += `</div>`;
    html += `</div>`;

    // Capability visibility
    html += `<div class="config-section">`;
    html += `<h3>Capability Visibility</h3>`;
    const hiddenCaps = (state.config.hiddenCapabilities || []);

    for (const domain of specData.domains) {
      html += `<div class="config-cap-group">`;
      html += `<div class="config-cap-group-title">${esc(domain.title)}</div>`;

      for (const cap of domain.capabilities) {
        const checked = !hiddenCaps.includes(cap.id) ? ' checked' : '';
        html += `<div class="config-cap-item">`;
        html += `<input type="checkbox" id="cap-vis-${cap.id}" data-cap-vis="${cap.id}"${checked}>`;
        html += `<label for="cap-vis-${cap.id}">${esc(cap.title)}</label>`;
        html += `</div>`;
      }

      html += `</div>`;
    }
    html += `</div>`;

    // Weight overrides
    html += `<div class="config-section">`;
    html += `<h3>Action Weights</h3>`;
    html += `<table class="config-weights-table">`;
    html += `<thead><tr><th>Action</th><th>Weight</th><th>Spec</th></tr></thead>`;
    html += `<tbody>`;

    for (const domain of specData.domains) {
      for (const cap of domain.capabilities) {
        for (const action of cap.actions) {
          const currentWeight = Scoring.getEffectiveWeight(action, state.config);
          html += `<tr>`;
          html += `<td title="${esc(cap.title)}">${esc(action.title)}</td>`;
          html += `<td><input type="number" data-weight-action="${action.id}" value="${currentWeight}" min="0" max="10" step="0.1"></td>`;
          html += `<td class="original-weight">${action.weight}</td>`;
          html += `</tr>`;
        }
      }
    }

    html += `</tbody></table>`;
    html += `</div>`;

    // Data management
    html += `<div class="config-section">`;
    html += `<h3>Data Management</h3>`;
    html += `<div class="config-actions">`;
    html += `<button class="config-btn-action" id="config-export">Export JSON</button>`;
    html += `<button class="config-btn-action" id="config-import">Import JSON</button>`;
    html += `<button class="config-btn-action danger" id="config-reset">Reset All</button>`;
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
        // Re-render assess tab to hide/show capabilities
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
        // Re-render assess to hide zero-weight actions
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
        App.setState({ responses: {}, config: {}, priorities: {} });
      }
    });
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  return { render };
})();
