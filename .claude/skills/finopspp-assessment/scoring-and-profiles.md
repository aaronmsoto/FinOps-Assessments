# Scoring System & Profiles

> Source: `guidelines/scoring.md`, `specifications/profiles/`

All scores are integers 0–10. The `Formula` field describes how to compute; `Scoring` entries map results to scores.

---

## Score Types (6)

| Type | Slug | Use When |
|---|---|---|
| Binary | `binary` | Yes/no question (good first issue for contributors) |
| Bucket of Accomplishments | `bucket` | Unordered checklist of independent tasks |
| Percentage Calculation | `percent` | Clear path to 100% completion |
| Other Mathematical Formulae | `calculation` | Custom numeric formula |
| Multiple Weighted Buckets | `multi_bucket` | Multiple weighted task groups |
| Sequential Process | `sequential` | Ordered steps that must be done in sequence |

### Binary

```yaml
Formula: null
Scoring:
- Score: 0
  Condition: None
- Score: 10
  Condition: Policy in place and published
```

### Bucket of Accomplishments

```yaml
Formula: |-
  * Define and follow process for gathering deployment plans from teams
  * Determine timeline for each new project to adjust the forecast during that time
  * Determine how optimizations and lower run rate will impact the forecast on a rolling basis

  10*Ceil(x/3)
Scoring:
- Score: 0
  Condition: No items completed
- Score: 4
  Condition: 1 item completed
- Score: 7
  Condition: 2 items completed
- Score: 10
  Condition: 3 items completed
```

Pattern: `10*Ceil(x/N)` where N = number of bucket items. Items are independent and unordered.

### Percentage Calculation

```yaml
Formula: Unallocated Shared CSP Effective Cloud Cost / Total CSP Effective Cloud Cost
Scoring:
- Score: 0
  Condition: 0%
- Score: 1
  Condition: 10%
# ... one entry per 10% increment ...
- Score: 10
  Condition: Near 100%
```

11 entries (Score 0 through 10), each mapping to a 10% band.

### Sequential Process

```yaml
Formula: |-
  1. item 1
  2. item 2
  3. item 3
Scoring:
- Score: 0
  Condition: No items completed
- Score: 4
  Condition: item 1 completed
- Score: 7
  Condition: items 1 and 2 completed
- Score: 10
  Condition: items 1, 2, and 3 completed
```

Same `Ceil` pattern as bucket, but items **must** be completed in order.

### Multiple Weighted Buckets

```yaml
Formula: |-
  1. Must do first
  2. Either or
      * choice 1
      * choice 2
  3. Bucket
      * item 1
      * item 2
Scoring:
- Score: 0
  Condition: no items completed
- Score: 4
  Condition: item 1 completed
- Score: 6
  Condition: item 1 and 2 completed
- Score: 8
  Condition: item 1, 2, and 1/2 of item 3 completed
- Score: 10
  Condition: item 1, 2, and 2/2 of item 3 completed
```

Earlier buckets are weighted more heavily than later ones.

---

## Weights

- `Weight` field on ActionSpec: `float >= 0`
- **1.0** = top priority
- **0.5** = nice-to-have / stretch goal
- **0.0** = effectively excluded from assessment
- Profiles can override weights via `ActionOverride.WeightUpdate`

---

## Targets

Target = desired maturity score after improvements (not current state). Set per action, per assessment cycle.

---

## Profiles

### 000: Template
ID 0 — not a real profile. Template for creating new profiles.

### 001: FinOps Foundation
Baseline profile aligned to the FinOps Foundation framework. References existing domains (1–5) by ID, which reference capabilities by ID, which reference actions by ID. Uses the standard hierarchy without customization.

### 002: FinOps++
Extended profile that reorganizes and augments the Foundation profile:
- References domains 1, 2, 3 by ID (shared with Foundation)
- Defines **new inline domains**: Governance (6 capabilities) and Incident Response (12 capabilities)
- Uses `DropIDs` on domain specs to remove capabilities for this profile
- Demonstrates the full override and inline-definition system

See `specifications/profiles/002.yaml` for the complete example.

---

## Profile Hierarchy Resolution (during generation)

1. Load referenced domain IDs → read domain spec files
2. Apply domain overrides (`AddIDs`/`DropIDs` for capabilities)
3. For each capability, load by ID and apply capability overrides
4. For each action, load by ID and apply action overrides (`WeightUpdate`)
5. Inline domains/capabilities/actions in the profile spec are used as-is
