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
          priorities: saved.priorities || {}
        };
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    return { responses: {}, config: {}, priorities: {} };
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
            priorities: data.priorities || {}
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

  return { save, load, exportJSON, importJSON, downloadBlob, generateFilename };
})();
