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

  // Maturity SVG icons (from finops.org) — 20px inline versions
  const MATURITY_SVGS = {
    precrawl: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="32" fill="#192630" opacity="0.3"></circle><path d="M29 56L10 45.5293V24L29 34.4707V56Z" fill="#EEF0F1"></path><path d="M35 56L54 45.5293V24L35 34.4707V56Z" fill="#EEF0F1"></path><path d="M32.0003 8L14 18.8155L32.0003 29L50 18.8155L32.0003 8Z" fill="#EEF0F1"></path></svg>',
    crawl: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="32" fill="#192630"></circle><path d="M29 56L10 45.5293V24L29 34.4707V56Z" fill="#00C693"></path><path d="M35 56L54 45.5293V24L35 34.4707V56Z" fill="#EEF0F1"></path><path d="M32.0003 8L14 18.8155L32.0003 29L50 18.8155L32.0003 8Z" fill="#EEF0F1"></path></svg>',
    walk: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="32" fill="#192630"></circle><path d="M29 56L10 45.5293V24L29 34.4707V56Z" fill="#00C693"></path><path d="M35 56L54 45.5293V24L35 34.4707V56Z" fill="#00C693"></path><path d="M32.0003 8L14 18.8155L32.0003 29L50 18.8155L32.0003 8Z" fill="#EEF0F1"></path></svg>',
    run: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="32" fill="#192630"></circle><path d="M29 56L10 45.5293V24L29 34.4707V56Z" fill="#00C693"></path><path d="M35 56L54 45.5293V24L35 34.4707V56Z" fill="#00C693"></path><path d="M32.0003 8L14 18.8155L32.0003 29L50 18.8155L32.0003 8Z" fill="#00C693"></path></svg>'
  };

  function getMaturityLevel(score) {
    if (score === null || score === undefined) return null;
    const rounded = Math.round(score * 10) / 10;
    const thresholds = Scoring.getThresholds();
    if (rounded >= thresholds[0].min) return 'run';
    if (rounded >= thresholds[1].min) return 'walk';
    if (rounded >= thresholds[2].min) return 'crawl';
    return 'precrawl';
  }

  function getMaturityLabel(score) {
    const level = getMaturityLevel(score);
    if (!level) return null;
    const labels = { run: 'Run', walk: 'Walk', crawl: 'Crawl', precrawl: 'Pre-crawl' };
    return labels[level] || null;
  }

  function getMaturitySvg(score) {
    const level = getMaturityLevel(score);
    return level ? MATURITY_SVGS[level] : '';
  }

  // Domain ordering: Understand, Quantify, Optimize, then Manage (foundation)
  const PILLAR_ORDER = ['understand', 'quantify', 'optimize'];
  const FOUNDATION_KW = ['manage'];

  function sortDomains(domains) {
    const pillars = domains
      .filter(d => !FOUNDATION_KW.some(kw => d.title.toLowerCase().includes(kw)))
      .sort((a, b) => {
        const ai = PILLAR_ORDER.findIndex(kw => a.title.toLowerCase().includes(kw));
        const bi = PILLAR_ORDER.findIndex(kw => b.title.toLowerCase().includes(kw));
        return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99);
      });
    const foundation = domains.filter(d => FOUNDATION_KW.some(kw => d.title.toLowerCase().includes(kw)));
    return [...pillars, ...foundation];
  }

  return { SCORE_TYPES, ALL_SCORE_TYPES, esc, MATURITY_SVGS, getMaturityLevel, getMaturityLabel, getMaturitySvg, sortDomains };
})();
