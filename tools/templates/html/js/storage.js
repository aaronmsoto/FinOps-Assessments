/* Persistence — localStorage auto-save, JSON export/import, Save As HTML */

const Storage = (() => {
  const STORAGE_KEY = 'finops-assessment-state';

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  function load(specData) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return {
          responses: saved.responses || {},
          config: saved.config || {},
          priorities: saved.priorities || {},
          frameworkOverview: saved.frameworkOverview || '',
          finalComments: saved.finalComments || ''
        };
      }
    } catch (e) {
      console.warn('Failed to load saved state from localStorage — starting fresh:', e);
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
    }
    return { responses: {}, config: {}, priorities: {}, frameworkOverview: '', finalComments: '' };
  }

  function exportJSON() {
    const state = App.getState();
    const specData = App.getSpecData();
    const scores = Scoring.computeAllScores(specData, state.responses, state.config);
    const sorted = Utils.sortDomains(scores.domains);
    const thresholds = Scoring.getThresholds();
    const maturityLabels = ['Run', 'Walk', 'Crawl', 'Pre-crawl'];

    // Compute completion
    let totalActions = 0, answeredActions = 0;
    for (const d of sorted) {
      for (const c of d.capabilities) {
        if (c.hidden) continue;
        for (const a of c.actions) {
          if (a.weight > 0) { totalActions++; if (a.responded) answeredActions++; }
        }
      }
    }

    // Find original action data from specData for descriptions
    const actionMap = {};
    for (const d of specData.domains) {
      for (const c of d.capabilities) {
        for (const a of c.actions) { actionMap[a.id] = a; }
      }
    }

    const rnd = v => v !== null && v !== undefined ? Math.round(v * 10) / 10 : null;

    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      assessment: {
        title: state.config.title || 'FinOps Maturity Assessment',
        subtitle: state.config.subtitle || '',
        profile: specData.profile ? specData.profile.title : '',
        overallScore: rnd(scores.overall),
        overallMaturity: Utils.getMaturityLabel(scores.overall),
        completionPercent: totalActions > 0 ? Math.round((answeredActions / totalActions) * 100) : 0,
        domains: sorted.map(d => ({
          id: d.id,
          title: d.title,
          score: rnd(d.score),
          maturity: Utils.getMaturityLabel(d.score),
          priority: (state.priorities && state.priorities[d.id]) || null,
          capabilities: d.capabilities.map(c => ({
            id: c.id,
            title: c.title,
            score: rnd(c.score),
            maturity: Utils.getMaturityLabel(c.score),
            hidden: c.hidden,
            actions: c.actions.map(a => {
              const spec = actionMap[a.id] || {};
              return {
                id: a.id,
                title: a.title,
                description: spec.description || '',
                scoreType: spec.scoreType || '',
                weight: spec.weight,
                effectiveWeight: a.weight,
                score: a.score,
                maxScore: 10,
                responded: a.responded,
                response: state.responses[a.id] !== undefined ? state.responses[a.id] : null
              };
            })
          }))
        })),
        thresholds: thresholds.map((t, i) => ({
          level: maturityLabels[i] || '',
          min: t.min,
          color: t.color
        })),
        frameworkOverview: state.frameworkOverview || '',
        finalComments: state.finalComments || ''
      },
      state: {
        responses: state.responses,
        config: state.config,
        priorities: state.priorities,
        frameworkOverview: state.frameworkOverview || '',
        finalComments: state.finalComments || ''
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, generateFilename('json'));
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result);
          const src = data.state || data;
          const newState = {
            responses: src.responses || {},
            config: src.config || {},
            priorities: src.priorities || {},
            frameworkOverview: src.frameworkOverview || '',
            finalComments: src.finalComments || ''
          };
          App.setState(newState);
        } catch (err) {
          alert('Failed to import: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateFilename(ext) {
    const state = App.getState();
    const title = (state.config.title || 'FinOps Maturity Assessment').replace(/[^a-zA-Z0-9 ]/g, '');
    const date = new Date().toISOString().split('T')[0];
    return `${title} - ${date}.${ext}`;
  }

  function saveAsHTML() {
    const templateEl = document.getElementById('readonly-template');
    if (!templateEl) {
      alert('Read-only template not available in this build.');
      return;
    }

    const state = App.getState();
    const specData = App.getSpecData();
    const scores = Scoring.computeAllScores(specData, state.responses, state.config);

    const stateData = {
      savedAt: new Date().toISOString(),
      config: state.config,
      responses: state.responses,
      priorities: state.priorities,
      frameworkOverview: state.frameworkOverview || '',
      finalComments: state.finalComments || '',
      scores: scores,
      specData: specData
    };

    var endTag = '<' + '/script>';
    let html = templateEl.textContent.split('<\\/script>').join(endTag);
    html = html.replace('/* STATE_PLACEHOLDER */', JSON.stringify(stateData, null, 2));
    const blob = new Blob([html], { type: 'text/html' });
    downloadBlob(blob, generateFilename('html'));
  }

  return { save, load, exportJSON, importJSON, saveAsHTML, downloadBlob, generateFilename };
})();
