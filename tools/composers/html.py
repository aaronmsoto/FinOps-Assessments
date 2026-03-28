"""HTML assessment composer — assembles template files with generated data into a single HTML file."""

import json
import os

import click


def assessment_generate(profile: str, base_path: str, domains: list[dict]) -> None:
    """Assemble HTML assessment from templates + generated data."""
    click.echo("Generating HTML assessment...")

    template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates', 'html')
    template_dir = os.path.normpath(template_dir)

    # 1. Build JSON data block from domains
    data_block = _build_data_block(profile, domains)

    # 2. Read the HTML shell
    shell_path = os.path.join(template_dir, 'assessment.html')
    with open(shell_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 3. Inline all CSS files
    css_dir = os.path.join(template_dir, 'css')
    css_content = _read_and_concat(css_dir, '.css')

    # 4. Inline all JS files (order matters)
    js_dir = os.path.join(template_dir, 'js')
    js_order = [
        'utils.js',
        'scoring.js',
        'storage.js',
        'poster.js',
        'assess.js',
        'config.js',
        'charts.js',
        'app.js',
    ]
    js_content = _read_ordered(js_dir, js_order)

    # 5. Strip dev-mode blocks (between markers)
    import re
    html = re.sub(
        r'<!-- Development mode:.*?<!-- INLINE_CSS_PLACEHOLDER -->',
        '<!-- INLINE_CSS_PLACEHOLDER -->',
        html, flags=re.DOTALL
    )
    html = re.sub(
        r'<!-- Development mode:.*?<!-- INLINE_JS_PLACEHOLDER -->',
        '<!-- INLINE_JS_PLACEHOLDER -->',
        html, flags=re.DOTALL
    )

    # 6. Inject CSS
    css_block = f'<style>\n{css_content}\n</style>'
    html = html.replace('<!-- INLINE_CSS_PLACEHOLDER -->', css_block)

    # 7. Inject data
    html = html.replace('/* SPEC_DATA_PLACEHOLDER */', json.dumps(data_block, indent=2))

    # 8. Inject JS
    js_block = f'<script>\n{js_content}\n</script>'
    html = html.replace('<!-- INLINE_JS_PLACEHOLDER -->', js_block)

    # 8. Write output
    os.makedirs(base_path, exist_ok=True)
    output_path = os.path.join(base_path, f'{profile} Assessment.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    click.secho(f'  HTML assessment: {output_path}', fg='green')


def _build_data_block(profile: str, domains: list[dict]) -> dict:
    """Convert the resolved domains structure into the JSON data model for the HTML UI."""
    from datetime import datetime, timezone

    data = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'generator': 'finopspp',
        'profile': {
            'title': profile,
        },
        'domains': [],
    }

    for domain in domains:
        domain_obj = {
            'id': int(domain.get('serial_number', 0)),
            'title': domain.get('domain', ''),
            'serialNumber': domain.get('serial_number', ''),
            'capabilities': [],
        }

        for cap in domain.get('capabilities', []):
            cap_obj = {
                'id': int(cap.get('serial_number', 0)),
                'title': cap.get('capability', ''),
                'serialNumber': cap.get('serial_number', ''),
                'actions': [],
            }

            for action in cap.get('actions', []):
                scoring = []
                for s in (action.get('scoring') or []):
                    scoring.append({
                        'score': s.get('Score', 0),
                        'condition': s.get('Condition', ''),
                    })

                action_obj = {
                    'id': int(action.get('serial_number', 0)),
                    'title': action.get('action', ''),
                    'description': action.get('description', ''),
                    'serialNumber': action.get('serial_number', ''),
                    'weight': float(action['weights']) if action.get('weights') is not None else 1.0,
                    'scoreType': action.get('score_type', 'calculation'),
                    'scoring': scoring,
                    'formula': action.get('formula'),
                    'references': [],
                    'supplementalGuidance': [],
                }

                cap_obj['actions'].append(action_obj)

            domain_obj['capabilities'].append(cap_obj)

        data['domains'].append(domain_obj)

    return data



def _read_and_concat(directory: str, extension: str) -> str:
    """Read all files with the given extension from a directory and concatenate."""
    if not os.path.isdir(directory):
        return ''
    parts = []
    for filename in sorted(os.listdir(directory)):
        if filename.endswith(extension):
            filepath = os.path.join(directory, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                parts.append(f'/* === {filename} === */\n{f.read()}')
    return '\n\n'.join(parts)


def _read_ordered(directory: str, order: list[str]) -> str:
    """Read JS files in the specified order."""
    parts = []
    for filename in order:
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                parts.append(f'/* === {filename} === */\n{f.read()}')
    return '\n\n'.join(parts)
