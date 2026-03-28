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
          notes: saved.notes || ''
        };
      }
    } catch (e) {
      console.warn('Failed to load saved state from localStorage — starting fresh:', e);
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
    }
    return { responses: {}, config: {}, priorities: {}, notes: '' };
  }

  function exportJSON() {
    const state = App.getState();
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      ...state
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
          const newState = {
            responses: data.responses || {},
            config: data.config || {},
            priorities: data.priorities || {},
            notes: data.notes || ''
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
      notes: state.notes || '',
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
