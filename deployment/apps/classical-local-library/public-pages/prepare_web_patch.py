"""Prepare a reviewable patch/preview; never mutate or publish the web repository."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--web-root', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--effective-date', help='Use only after explicit publication approval')
args = p.parse_args()
web, output = args.web_root.resolve(), args.output.resolve()
assert not output.exists(), 'Use a new output directory'
assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=web), 'Review dirty web source separately'
assert web != output and web not in output.parents, 'Preview must be outside web checkout'
output.mkdir(parents=True)
preview = output / 'preview'
preview.mkdir()
for folder in ['src', 'scripts']:
    shutil.copytree(web / folder, preview / folder)
privacy = (Path(__file__).parent / 'privacy.html').read_text()
body = re.search(r'<main[^>]*>([\s\S]*?)</main>', privacy).group(1)
body = body.replace('href="index.html"', 'href="./play.html"').replace('href="support.html"', 'href="./support.html"')
body = '<main class="wrap" id="main"><div class="notice-copy">' + body + '</div></main>'
template = (web / 'src/privacy.html').read_text()
html = re.sub(r'<main\b[^>]*>[\s\S]*?</main>', lambda _: body, template, count=1)
assert html != template and html.count('<h1') == 1
html = re.sub(r'<title>.*?</title>', '<title>띠로리 플레이 개인정보 처리방침 | 띠로리</title>', html)
html = re.sub(r'<body([^>]*)>', r'<body\1 class="play-policy">', html, count=1)
assert 'class="play-policy"' in html
html = html.replace('</head>', '<style>.play-policy h1{font-size:32px;line-height:1.3;overflow-wrap:anywhere}.play-policy .notice-copy,.play-policy .footer-top,.play-policy .footer-links{min-width:0;max-width:100%;overflow-wrap:anywhere}</style></head>', 1)
html = re.sub(r'(<meta name="description" content=")[^"]*(")', r'\g<1>만랩이 운영하는 띠로리 플레이의 기기 내 데이터, 외부 연결, 백업과 삭제 안내입니다.\2', html)
(preview / 'src/play-privacy.html').write_text(html)
build = (web / 'scripts/build.mjs').read_text()
assert "const routes=['index','score','play','studio','support','privacy'];" in build
build = build.replace("const routes=['index','score','play','studio','support','privacy'];", "const routes=['index','score','play','studio','support','privacy','play-privacy'];\nconst routePath=name=>name==='play-privacy'?'play/privacy':name;")
build = build.replace('${base}/${name}/', '${base}/${routePath(name)}/').replace("'/'+name+'/'", "'/'+routePath(name)+'/'")
build = build.replace('path.join(dist,name);', 'path.join(dist,routePath(name));')
(preview / 'scripts/build.mjs').write_text(build)
play = (web / 'src/play.html').read_text()
assert '</main>' in play
play = play.replace('</main>', '<p class="wrap notice-copy"><a href="./play-privacy.html">플레이 개인정보 처리방침</a> · <a href="./support.html">문의와 지원</a></p></main>', 1)
(preview / 'src/play.html').write_text(play)
changes = ['scripts/build.mjs', 'src/play.html', 'src/play-privacy.html']
patches = []
for name in changes:
    before, after = web / name, preview / name
    result = subprocess.run(['git', 'diff', '--no-index', '--', str(before) if before.exists() else '/dev/null', str(after)], text=True, capture_output=True)
    assert result.returncode in (0, 1), result.stderr
    patch = result.stdout
    for prefix, source, target in [('a/', before, name), ('b/', after, name), ('a/', after, name)]:
        patch = patch.replace(prefix + str(source).lstrip('/'), prefix + target)
    patches.append(patch)
(output / 'ddirori-play-privacy.patch').write_text(''.join(patches))
subprocess.run(['git', 'apply', '--check', str(output / 'ddirori-play-privacy.patch')], cwd=web, check=True)
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
manifest = {
    'webBaseCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=web, text=True).strip(),
    'sourceChanges': {name: {'before': sha(web / name) if (web / name).exists() else None, 'after': sha(preview / name)} for name in changes},
    'patchSha256': sha(output / 'ddirori-play-privacy.patch'),
    'plannedPrivacyUrl': 'https://ddirori.com/play/privacy/', 'existingSupportUrl': 'https://ddirori.com/support/',
    'published': False, 'effectiveDateApproved': bool(args.effective_date),
    'approvedEffectiveDate': args.effective_date,
    'note': 'Review-only draft. No web repository changes or publication.',
}
(output / 'web-review-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'output': str(output), 'patchSha256': manifest['patchSha256'], 'published': False}))
