# Claude Code Configuration for FinOps++ Framework Assessment

## Commit Rules
- Do NOT add `Co-Authored-By` lines or any AI attribution to commit messages
- Do NOT commit Claude-related files (CLAUDE.md, .claude/) — they are in .gitignore
- All PRs must resolve a milestone issue per CONTRIBUTING.md

## Project Overview
This is the FinOps++ Framework Assessment — a NIST CSF-inspired assessment for FinOps maturity. It uses an As-Code approach where YAML specifications are the source of truth.

## Architecture
- `specifications/` — YAML specs (actions, capabilities, domains, profiles) — the source of truth
- `components/` — Auto-generated markdown from specs (via Jinja2 templates)
- `assessments/` — Auto-generated framework markdown and Excel worksheets
- `tools/` — The `finopspp` Python CLI tool that validates, generates, and manages specs
- `guidelines/` — Development, style, scoring, and design guidance

## Key Commands
- Validate specs: `python -m tools specifications validate --specification-type=<type> <id-or-all>`
- Generate components: `python -m tools generate components --specification-type=<type>`
- Generate assessment: `python -m tools generate assessment --profile="<name>"`
- Run linters: `pylint tools/`, `yamllint specifications/`, `pymarkdownlnt scan components/`

## Development
- Python 3.13+ required
- Virtual env: `.venv/`
- Install: `pip install -e ".[dev]"`
- Style: PEP 8, 120-char line limit, see `guidelines/style.md`
- YAML: 2-space indentation per spec v1.2.2

## Contribution Workflow
1. Spec changes: Edit YAML in `specifications/` -> validate -> optionally generate outputs
2. Tools changes: Follow `guidelines/development.md` and `guidelines/style.md` -> test locally
3. See CONTRIBUTING.md for full details
