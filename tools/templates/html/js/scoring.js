/* Scoring Engine — replicates finopspp Python scoring logic */

const Scoring = (() => {
  const DEFAULT_THRESHOLDS = [
    { min: 8.0, color: '#00C693' },
    { min: 5.0, color: '#009664' },
    { min: 2.0, color: '#006432' },
    { min: 0,   color: '#646464' }
  ];

  function getThresholds() {
    try {
      const state = App.getState();
      if (state && state.config && Array.isArray(state.config.thresholds) && state.config.thresholds.length === 4) {
        // Ensure descending sort so >= comparison works correctly
        return state.config.thresholds.slice().sort((a, b) => b.min - a.min);
      }
    } catch (e) { /* App not initialized yet */ }
    return DEFAULT_THRESHOLDS;
  }

  function getScoreColor(score) {
    if (score === null || score === undefined) return '#c8c8c8';
    const rounded = Math.round(score * 10) / 10;
    const thresholds = getThresholds();
    for (const t of thresholds) {
      if (rounded >= t.min) return t.color;
    }
    return thresholds[thresholds.length - 1].color;
  }

  // All 7 score types from the FinOps++ spec:
  // binary, bucket, multi_bucket, sequential, threshold, percent, calculation
  //
  // binary: yes/no → 0 or 10
  // bucket: unordered checklist of independent items → 10*Ceil(x/N)
  // multi_bucket: multiple weighted groups → select matching scoring entry
  // sequential: ordered steps done in order → select matching scoring entry
  // threshold: ordered levels, can skip earlier → select matching scoring entry
  // percent: percentage bands (0-100%) → select matching scoring entry
  // calculation: catch-all custom formula → select matching scoring entry

  function computeActionScore(action, response) {
    if (response === null || response === undefined) return null;

    switch (action.scoreType) {
      case 'binary':
        // response is the selected score (0 or 10)
        return typeof response === 'number' ? response : null;

      case 'bucket': {
        // response is array of booleans for each checklist item
        if (!Array.isArray(response)) return null;
        const checkedCount = response.filter(Boolean).length;
        // Look up score from scoring entries by checked count
        // Entry 0 = "No items", Entry 1 = "1 item", etc.
        if (checkedCount < action.scoring.length) {
          return action.scoring[checkedCount].score;
        }
        // If more checked than entries, use last entry
        return action.scoring[action.scoring.length - 1].score;
      }

      case 'sequential': {
        // response is array of booleans for each step (must be in order)
        if (!Array.isArray(response)) {
          // Fallback: if response is a number (from radio select), use directly
          return typeof response === 'number' ? response : null;
        }
        // Count consecutive completed steps from the start
        let completedSteps = 0;
        for (let i = 0; i < response.length; i++) {
          if (response[i]) completedSteps++;
          else break;
        }
        // Look up score from scoring entries (entry 0 = none, entry 1 = step 1, etc.)
        if (completedSteps < action.scoring.length) {
          return action.scoring[completedSteps].score;
        }
        return action.scoring[action.scoring.length - 1].score;
      }

      case 'multi_bucket':
      case 'threshold':
      case 'percent':
      case 'calculation':
        // All these use a single selected score from the scoring entries
        return typeof response === 'number' ? response : null;

      default:
        // Unknown type — treat as direct score selection
        return typeof response === 'number' ? response : null;
    }
  }

  function parseBucketItems(formula) {
    if (!formula) return [];
    return formula.split('\n')
      .filter(line => line.trim().startsWith('*'))
      .map(line => line.trim().replace(/^\*\s*/, ''));
  }

  function parseSequentialItems(formula) {
    if (!formula) return [];
    return formula.split('\n')
      .filter(line => /^\s*\d+[\.\)]\s/.test(line))
      .map(line => line.trim().replace(/^\d+[\.\)]\s*/, ''));
  }

  function computeCapabilityScore(capability, responses, config) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const action of capability.actions) {
      const weight = getEffectiveWeight(action, config);
      if (weight <= 0) continue;

      const response = responses[action.id];
      const score = computeActionScore(action, response);
      if (score === null) continue;

      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : null;
  }

  function computeDomainScore(domain, responses, config) {
    let sum = 0;
    let count = 0;

    for (const cap of domain.capabilities) {
      if (isCapabilityHidden(cap, config)) continue;

      const score = computeCapabilityScore(cap, responses, config);
      if (score === null) continue;

      sum += score;
      count++;
    }

    return count > 0 ? sum / count : null;
  }

  function computeOverallScore(domains, responses, config) {
    let sum = 0;
    let count = 0;

    for (const domain of domains) {
      const score = computeDomainScore(domain, responses, config);
      if (score === null) continue;

      sum += score;
      count++;
    }

    return count > 0 ? sum / count : null;
  }

  function getEffectiveWeight(action, config) {
    if (config && config.weights && config.weights[action.id] !== undefined) {
      return config.weights[action.id];
    }
    return action.weight;
  }

  function isCapabilityHidden(capability, config) {
    if (config && config.hiddenCapabilities) {
      return config.hiddenCapabilities.includes(capability.id);
    }
    return false;
  }

  function formatScore(score) {
    if (score === null || score === undefined) return '—';
    return score.toFixed(1);
  }

  function computeAllScores(specData, responses, config) {
    const result = { domains: [], overall: null };

    for (const domain of specData.domains) {
      const domainResult = {
        id: domain.id,
        title: domain.title,
        score: computeDomainScore(domain, responses, config),
        capabilities: []
      };

      for (const cap of domain.capabilities) {
        const hidden = isCapabilityHidden(cap, config);
        const capResult = {
          id: cap.id,
          title: cap.title,
          score: hidden ? null : computeCapabilityScore(cap, responses, config),
          hidden: hidden,
          actions: []
        };

        for (const action of cap.actions) {
          const weight = getEffectiveWeight(action, config);
          const response = responses[action.id];
          capResult.actions.push({
            id: action.id,
            title: action.title,
            score: weight > 0 ? computeActionScore(action, response) : null,
            weight: weight,
            responded: response !== null && response !== undefined
          });
        }

        domainResult.capabilities.push(capResult);
      }

      result.domains.push(domainResult);
    }

    result.overall = computeOverallScore(specData.domains, responses, config);
    return result;
  }

  return {
    DEFAULT_THRESHOLDS,
    getThresholds,
    getScoreColor,
    computeActionScore,
    parseBucketItems,
    parseSequentialItems,
    computeCapabilityScore,
    computeDomainScore,
    computeOverallScore,
    getEffectiveWeight,
    isCapabilityHidden,
    formatScore,
    computeAllScores
  };
})();
