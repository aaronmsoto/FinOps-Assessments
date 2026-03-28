/* Shared utilities */

const Utils = (() => {
  const SCORE_TYPES = {
    BINARY: 'binary',
    BUCKET: 'bucket',
    MULTI_BUCKET: 'multi_bucket',
    SEQUENTIAL: 'sequential',
    THRESHOLD: 'threshold',
    PERCENT: 'percent',
    CALCULATION: 'calculation'
  };

  const ALL_SCORE_TYPES = Object.values(SCORE_TYPES);

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  return { SCORE_TYPES, ALL_SCORE_TYPES, esc };
})();
