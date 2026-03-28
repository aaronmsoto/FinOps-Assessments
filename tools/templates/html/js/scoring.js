/* Scoring Engine — replicates finopspp Python scoring logic */

const Scoring = (() => {
  function getScoreColor(score) {
    if (score === null || score === undefined) return 'rgb(200, 200, 200)';
    if (score >= 7.5) return 'rgb(0, 198, 147)';
    if (score >= 5.0) return 'rgb(0, 150, 100)';
    if (score >= 2.5) return 'rgb(0, 100, 50)';
    return 'rgb(100, 100, 100)';
  }

  function computeActionScore(action, response) {
    if (response === null || response === undefined) return null;

    switch (action.scoreType) {
      case 'binary':
        return typeof response === 'number' ? response : null;

      case 'bucket': {
        if (!Array.isArray(response)) return null;
        const checkedCount = response.filter(Boolean).length;
        const items = parseBucketItems(action.formula);
        const totalItems = items.length;
        if (totalItems === 0) return null;
        return 10 * Math.ceil(checkedCount / totalItems);
      }

      case 'linear':
        return typeof response === 'number' ? response : null;

      case 'value':
        return typeof response === 'number' ? response : null;

      default:
        return null;
    }
  }

  function parseBucketItems(formula) {
    if (!formula) return [];
    return formula.split('\n')
      .filter(line => line.trim().startsWith('*'))
      .map(line => line.trim().replace(/^\*\s*/, ''));
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
    getScoreColor,
    computeActionScore,
    parseBucketItems,
    computeCapabilityScore,
    computeDomainScore,
    computeOverallScore,
    getEffectiveWeight,
    isCapabilityHidden,
    formatScore,
    computeAllScores
  };
})();
