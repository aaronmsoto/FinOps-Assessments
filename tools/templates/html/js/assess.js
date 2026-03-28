/* Assess Tab — render questionnaire, handle input by score type */

const Assess = (() => {
  function render(specData, state) {
    const container = document.getElementById('assess-container');
    if (!container) return;

    let html = '';

    // Step 1: Domain Priority Ranking
    html += `<div class="assess-priority-step">`;
    html += `<div class="assess-priority-header">`;
    html += `<h2>Step 1: Prioritize Domains</h2>`;
    html += `<p>Rank each domain by organizational priority (1 = highest). This provides strategic context but does not affect scoring.</p>`;
    html += `</div>`;
    html += `<div class="assess-priority-grid">`;
    for (const domain of specData.domains) {
      const priority = (state.priorities && state.priorities[domain.id]) || '';
      html += `<div class="assess-priority-item">`;
      html += `<span class="assess-priority-domain">${esc(domain.title)}</span>`;
      html += `<select class="assess-priority-select" data-priority-domain="${domain.id}" aria-label="Priority for ${esc(domain.title)}">`;
      html += `<option value="">\u2014</option>`;
      for (let i = 1; i <= 4; i++) {
        const sel = (priority == i) ? ' selected' : '';
        html += `<option value="${i}"${sel}>${i}</option>`;
      }
      html += `</select>`;
      html += `</div>`;
    }
    html += `</div></div>`;

    // Step 2: Assessment Questionnaire
    html += `<h2 class="assess-step-header">Step 2: Assess Capabilities</h2>`;

    for (const domain of specData.domains) {
      html += `<div class="assess-domain" data-assess-domain="${domain.id}">`;
      html += `<h2 class="assess-domain-header">${esc(domain.title)}`;
      html += `<span class="assess-domain-progress" data-domain-progress="${domain.id}"></span>`;
      html += `</h2>`;

      for (const cap of domain.capabilities) {
        const hidden = Scoring.isCapabilityHidden(cap, state.config);
        if (hidden) continue;

        html += `<div class="assess-capability" data-assess-cap="${cap.id}">`;
        html += `<div class="assess-cap-header">`;
        html += `<h3 class="assess-cap-title">${esc(cap.title)}</h3>`;
        html += `<span class="assess-cap-progress" data-cap-progress="${cap.id}"></span>`;
        html += `</div>`;

        for (const action of cap.actions) {
          const weight = Scoring.getEffectiveWeight(action, state.config);
          if (weight <= 0) continue;

          const response = state.responses[action.id];
          const answered = response !== null && response !== undefined;

          html += `<div class="assess-action${answered ? ' answered' : ''}" data-assess-action="${action.id}">`;
          html += `<div class="assess-action-title">${esc(action.title)}</div>`;
          if (action.description) {
            html += `<div class="assess-action-desc">${esc(action.description)}</div>`;
          }
          html += `<div class="assess-action-score" data-action-score="${action.id}">—</div>`;
          html += renderInput(action, response);
          html += `</div>`;
        }

        html += `</div>`;
      }

      html += `</div>`;
    }

    container.innerHTML = html;
    bindInputs(specData);

    // Apply diagnostics state
    if (state.config.diagnostics) {
      document.querySelectorAll('.assess-diagnostics').forEach(el => el.classList.remove('hidden'));
    }
  }

  function renderInput(action, response) {
    let html = '';

    // Diagnostics panel (hidden by default, toggled from Config)
    html += `<div class="assess-diagnostics hidden" data-diag-action="${action.id}">`;
    html += `<table class="diag-table">`;
    html += `<tr><td>ID</td><td>${action.id}</td></tr>`;
    html += `<tr><td>Serial #</td><td>${action.serialNumber || '—'}</td></tr>`;
    html += `<tr><td>Score Type</td><td><code>${esc(action.scoreType)}</code></td></tr>`;
    html += `<tr><td>Weight</td><td>${action.weight}</td></tr>`;
    html += `<tr><td>Formula</td><td><pre>${esc(action.formula || 'null')}</pre></td></tr>`;
    html += `<tr><td>Scoring</td><td>`;
    for (const s of action.scoring) {
      html += `${s.score}: ${esc(s.condition)}<br>`;
    }
    html += `</td></tr>`;
    html += `</table></div>`;

    // Render input control based on score type
    switch (action.scoreType) {
      case 'binary':
        html += renderBinary(action, response);
        break;
      case 'bucket':
        html += renderBucket(action, response);
        break;
      case 'sequential':
        html += renderSequential(action, response);
        break;
      case 'multi_bucket':
      case 'threshold':
      case 'percent':
      case 'calculation':
        // All scored via selecting a condition from the scoring list
        html += renderScoringSelect(action, response);
        break;
      default:
        html += renderScoringSelect(action, response);
        break;
    }
    return html;
  }

  function renderBinary(action, response) {
    let html = `<div class="assess-binary" data-input-action="${action.id}" data-score-type="binary">`;
    for (const opt of action.scoring) {
      const checked = response === opt.score ? ' checked' : '';
      html += `<label>`;
      html += `<input type="radio" name="action-${action.id}" value="${opt.score}"${checked}>`;
      html += `${esc(opt.condition)}`;
      html += `</label>`;
    }
    html += `</div>`;
    return html;
  }

  function renderBucket(action, response) {
    const items = Scoring.parseBucketItems(action.formula);
    const checked = Array.isArray(response) ? response : [];

    let html = `<div class="assess-bucket" data-input-action="${action.id}" data-score-type="bucket">`;
    items.forEach((item, i) => {
      const isChecked = checked[i] ? ' checked' : '';
      html += `<label>`;
      html += `<input type="checkbox" data-index="${i}"${isChecked}>`;
      html += `${esc(item)}`;
      html += `</label>`;
    });
    html += `</div>`;
    return html;
  }

  function renderSequential(action, response) {
    // Parse steps from formula, or fall back to scoring conditions (skip entry 0 which is "None/No items")
    let items = Scoring.parseSequentialItems(action.formula);
    if (items.length === 0 && action.scoring.length > 1) {
      items = action.scoring.slice(1).map(s => s.condition || '');
    }

    if (items.length === 0) {
      return renderScoringSelect(action, response);
    }

    const checked = Array.isArray(response) ? response : [];

    let html = `<div class="assess-sequential" data-input-action="${action.id}" data-score-type="sequential">`;
    items.forEach((item, i) => {
      const isChecked = checked[i] ? ' checked' : '';
      const isDisabled = (i > 0 && !checked[i - 1]) ? ' disabled' : '';
      html += `<label class="sequential-step${isDisabled ? ' locked' : ''}">`;
      html += `<span class="sequential-number">${i + 1}</span>`;
      html += `<input type="checkbox" data-index="${i}"${isChecked}${isDisabled}>`;
      html += `<span class="sequential-text">${esc(item)}</span>`;
      html += `</label>`;
    });
    html += `</div>`;
    return html;
  }

  function renderScoringSelect(action, response) {
    // Used for: sequential, multi_bucket, threshold, percent, calculation
    // Renders radio buttons for each scoring entry so user picks their level
    const scoreType = action.scoreType;
    let html = `<div class="assess-scoring-select" data-input-action="${action.id}" data-score-type="${scoreType}">`;
    for (const opt of action.scoring) {
      const checked = response === opt.score ? ' checked' : '';
      html += `<label>`;
      html += `<input type="radio" name="action-${action.id}" value="${opt.score}"${checked}>`;
      html += `<span class="scoring-condition">${esc(opt.condition || 'None')}</span>`;
      html += `<span class="scoring-value">(${opt.score})</span>`;
      html += `</label>`;
    }
    html += `</div>`;
    return html;
  }

  function bindInputs(specData) {
    // Domain priority selects
    document.querySelectorAll('[data-priority-domain]').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const domainId = parseInt(e.target.dataset.priorityDomain);
        const rank = e.target.value ? parseInt(e.target.value) : null;
        App.setPriority(domainId, rank);
      });
    });

    // All input controls
    document.querySelectorAll('[data-input-action]').forEach(div => {
      const scoreType = div.dataset.scoreType;
      const actionId = parseInt(div.dataset.inputAction);

      if (scoreType === 'bucket') {
        // Bucket: unordered checkboxes
        div.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.addEventListener('change', () => {
            const checks = [];
            div.querySelectorAll('input[type="checkbox"]').forEach(c => {
              checks[parseInt(c.dataset.index)] = c.checked;
            });
            App.setResponse(actionId, checks);
            div.closest('.assess-action').classList.toggle('answered', checks.some(Boolean));
          });
        });
      } else if (scoreType === 'sequential' && div.querySelectorAll('input[type="checkbox"]').length > 0) {
        // Sequential with formula: ordered checkboxes — enforce order
        const checkboxes = Array.from(div.querySelectorAll('input[type="checkbox"]'));
        checkboxes.forEach((cb, idx) => {
          cb.addEventListener('change', () => {
            if (cb.checked) {
              // Ensure all previous are checked
              for (let i = 0; i < idx; i++) {
                checkboxes[i].checked = true;
              }
            } else {
              // Uncheck all subsequent
              for (let i = idx + 1; i < checkboxes.length; i++) {
                checkboxes[i].checked = false;
              }
            }
            // Update enabled/disabled state and visual classes
            checkboxes.forEach((c, i) => {
              const canCheck = (i === 0) || checkboxes[i - 1].checked;
              c.disabled = !canCheck;
              c.closest('label').classList.toggle('locked', !canCheck);
            });
            // Build response array
            const checks = checkboxes.map(c => c.checked);
            App.setResponse(actionId, checks);
            div.closest('.assess-action').classList.toggle('answered', checks.some(Boolean));
          });
        });
      } else {
        // All other types use radio buttons
        div.querySelectorAll('input[type="radio"]').forEach(radio => {
          radio.addEventListener('change', () => {
            App.setResponse(actionId, parseInt(radio.value));
            div.closest('.assess-action').classList.add('answered');
          });
        });
      }
    });
  }

  function updateScores(scores) {
    for (const domain of scores.domains) {
      // Domain progress
      const domainProg = document.querySelector(`[data-domain-progress="${domain.id}"]`);
      if (domainProg) {
        let answered = 0, total = 0;
        for (const cap of domain.capabilities) {
          if (cap.hidden) continue;
          for (const action of cap.actions) {
            if (action.weight > 0) {
              total++;
              if (action.responded) answered++;
            }
          }
        }
        domainProg.textContent = total > 0 ? `${answered} / ${total}` : '';
      }

      for (const cap of domain.capabilities) {
        // Capability progress
        const capProg = document.querySelector(`[data-cap-progress="${cap.id}"]`);
        if (capProg) {
          let answered = 0, total = 0;
          for (const action of cap.actions) {
            if (action.weight > 0) {
              total++;
              if (action.responded) answered++;
            }
          }
          capProg.textContent = total > 0 ? `${answered} of ${total}` : '';
        }

        // Action scores
        for (const action of cap.actions) {
          const el = document.querySelector(`[data-action-score="${action.id}"]`);
          if (el) {
            el.textContent = Scoring.formatScore(action.score);
            if (action.score !== null) {
              el.classList.add('scored');
            }
          }
        }
      }
    }
  }

  const esc = Utils.esc;

  return { render, updateScores };
})();
