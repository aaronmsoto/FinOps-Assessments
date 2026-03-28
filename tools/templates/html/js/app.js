/* App Shell — initialization, tab switching, event bus, data validation */

const App = (() => {
  let specData = null;
  let state = { responses: {}, config: {}, priorities: {} };
  const listeners = {};

  function init() {
    specData = loadAndValidateData();
    if (!specData) return;

    state = Storage.load(specData);

    initTabs();
    initConfig();

    Poster.render(specData, state);
    Assess.render(specData, state);
    Config.render(specData, state);

    applyConfig();
    recalculate();
  }

  function loadAndValidateData() {
    const el = document.getElementById('spec-data');
    if (!el) {
      showError('No data block found. The assessment file may be corrupted.');
      return null;
    }

    let data;
    try {
      data = JSON.parse(el.textContent);
    } catch (e) {
      showError('Invalid JSON in data block: ' + e.message);
      return null;
    }

    const error = validateData(data);
    if (error) {
      showError(error);
      return null;
    }

    return data;
  }

  function validateData(data) {
    if (!data || typeof data !== 'object') return 'Data block is not a valid object.';
    if (!data.profile) return 'Missing "profile" in data.';
    if (!Array.isArray(data.domains)) return 'Missing or invalid "domains" array.';

    for (let i = 0; i < data.domains.length; i++) {
      const d = data.domains[i];
      if (!d.id || !d.title) return `Domain at index ${i} missing "id" or "title".`;
      if (!Array.isArray(d.capabilities)) return `Domain "${d.title}" missing "capabilities" array.`;

      for (let j = 0; j < d.capabilities.length; j++) {
        const c = d.capabilities[j];
        if (!c.id || !c.title) return `Capability at index ${j} in "${d.title}" missing "id" or "title".`;
        if (!Array.isArray(c.actions)) return `Capability "${c.title}" missing "actions" array.`;

        for (let k = 0; k < c.actions.length; k++) {
          const a = c.actions[k];
          if (!a.id || !a.title) return `Action at index ${k} in "${c.title}" missing "id" or "title".`;
          if (!a.scoreType) return `Action "${a.title}" missing "scoreType".`;
          const validTypes = ['binary', 'bucket', 'linear', 'value'];
          if (!validTypes.includes(a.scoreType)) {
            return `Action "${a.title}" has invalid scoreType "${a.scoreType}". Must be one of: ${validTypes.join(', ')}.`;
          }
          if (!Array.isArray(a.scoring)) return `Action "${a.title}" missing "scoring" array.`;
        }
      }
    }

    return null;
  }

  function showError(message) {
    const el = document.getElementById('validation-error');
    if (el) {
      el.textContent = message;
      el.classList.remove('hidden');
    }
    const main = document.getElementById('app-main');
    if (main) main.style.display = 'none';
  }

  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => {
          t.classList.add('hidden');
          t.classList.remove('active');
        });
        btn.classList.add('active');
        const tab = document.getElementById('tab-' + btn.dataset.tab);
        if (tab) {
          tab.classList.remove('hidden');
          tab.classList.add('active');
        }
      });
    });
  }

  function initConfig() {
    const openBtn = document.querySelector('.config-btn');
    const panel = document.getElementById('config-panel');
    const closeBtn = panel.querySelector('.config-close');
    const overlay = panel.querySelector('.config-overlay');

    openBtn.addEventListener('click', () => panel.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => panel.classList.add('hidden'));
    overlay.addEventListener('click', () => panel.classList.add('hidden'));
  }

  function applyConfig() {
    const title = (state.config.title || specData.profile.title || 'FinOps Maturity Assessment');
    const subtitle = (state.config.subtitle !== undefined ? state.config.subtitle : 'Measure progress over time against accepted standards');

    document.getElementById('assessment-title').textContent = title;
    document.getElementById('assessment-subtitle').textContent = subtitle;
    document.title = title;
  }

  function setResponse(actionId, value) {
    state.responses[actionId] = value;
    recalculate();
    Storage.save(state);
    emit('responseChanged', { actionId, value });
  }

  function setConfig(key, value) {
    state.config[key] = value;
    applyConfig();
    recalculate();
    Storage.save(state);
    emit('configChanged', { key, value });
  }

  function setPriority(domainId, rank) {
    state.priorities[domainId] = rank;
    Storage.save(state);
    emit('priorityChanged', { domainId, rank });
  }

  function recalculate() {
    const scores = Scoring.computeAllScores(specData, state.responses, state.config);
    Poster.update(scores, state);
    Assess.updateScores(scores);
  }

  function getState() { return state; }
  function getSpecData() { return specData; }

  function setState(newState) {
    state = newState;
    applyConfig();
    Poster.render(specData, state);
    Assess.render(specData, state);
    Config.render(specData, state);
    recalculate();
    Storage.save(state);
  }

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  function emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
  }

  document.addEventListener('DOMContentLoaded', init);

  return { setResponse, setConfig, setPriority, getState, getSpecData, setState, on, recalculate };
})();
