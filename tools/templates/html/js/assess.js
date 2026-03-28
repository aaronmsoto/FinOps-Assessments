/* Assess Tab — render questionnaire, handle input by score type */

const Assess = (() => {
  function render(specData, state) {
    const container = document.getElementById('assess-container');
    if (!container) return;

    let html = '';

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
  }

  function renderInput(action, response) {
    switch (action.scoreType) {
      case 'binary':
        return renderBinary(action, response);
      case 'bucket':
        return renderBucket(action, response);
      case 'linear':
        return renderLinear(action, response);
      case 'value':
        return renderValue(action, response);
      default:
        return '<div>Unknown score type</div>';
    }
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

  function renderLinear(action, response) {
    let html = `<div class="assess-linear" data-input-action="${action.id}" data-score-type="linear">`;
    for (const opt of action.scoring) {
      const checked = response === opt.score ? ' checked' : '';
      html += `<label>`;
      html += `<input type="radio" name="action-${action.id}" value="${opt.score}"${checked}>`;
      html += `${esc(opt.condition)} (${opt.score})`;
      html += `</label>`;
    }
    html += `</div>`;
    return html;
  }

  function renderValue(action, response) {
    let html = `<div class="assess-value" data-input-action="${action.id}" data-score-type="value">`;
    html += `<select>`;
    html += `<option value="">Select...</option>`;
    for (const opt of action.scoring) {
      const selected = response === opt.score ? ' selected' : '';
      html += `<option value="${opt.score}"${selected}>${esc(opt.condition)} (${opt.score})</option>`;
    }
    html += `</select>`;
    html += `</div>`;
    return html;
  }

  function bindInputs(specData) {
    // Binary and linear (radio)
    document.querySelectorAll('[data-score-type="binary"], [data-score-type="linear"]').forEach(div => {
      div.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
          const actionId = parseInt(div.dataset.inputAction);
          App.setResponse(actionId, parseInt(radio.value));
          div.closest('.assess-action').classList.add('answered');
        });
      });
    });

    // Bucket (checkboxes)
    document.querySelectorAll('[data-score-type="bucket"]').forEach(div => {
      const actionId = parseInt(div.dataset.inputAction);
      div.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const checks = [];
          div.querySelectorAll('input[type="checkbox"]').forEach(c => {
            checks[parseInt(c.dataset.index)] = c.checked;
          });
          App.setResponse(actionId, checks);
          const any = checks.some(Boolean);
          div.closest('.assess-action').classList.toggle('answered', any);
        });
      });
    });

    // Value (select)
    document.querySelectorAll('[data-score-type="value"]').forEach(div => {
      div.querySelector('select').addEventListener('change', (e) => {
        const actionId = parseInt(div.dataset.inputAction);
        const val = e.target.value ? parseInt(e.target.value) : null;
        App.setResponse(actionId, val);
        div.closest('.assess-action').classList.toggle('answered', val !== null);
      });
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

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  return { render, updateScores };
})();
