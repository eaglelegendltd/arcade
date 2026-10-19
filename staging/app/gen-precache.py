#!/usr/bin/env python3
"""Generate precache-manifest.js: every file of the 20 live games and the staging-only learning games + thumbnails, as paths relative to the arcade root.
Skips *.md and any .svg not referenced by that game's html/js (the games load the .png builds). Run from anywhere."""
import os, json, hashlib, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SLUGS = "tidepin threadcoil gravel-choir foldlight-gale doorkeep-hollow wickmoth-relay pendulum-bakery kiteknot echo-quarry cliffsprout broomstick-bounce glowgourd-dash treatdrop-bucket gourdburst spellsock-sorting eggshade-nursery batwing-bridges cauldron-stir gloomlinks moonlit-mazelings".split()
# learning games that so far exist only on staging: served from staging/<slug>/ (the app reads 'dir'), thumbnail from their own icon
STAGING_ONLY = "el-maths el-english el-coding".split()
games, h, total = {}, hashlib.sha1(), 0
for s in SLUGS + STAGING_ONLY:
    rel_dir = 'staging/' + s if s in STAGING_ONLY else s
    d = os.path.join(ROOT, rel_dir); code = ''
    for f in os.listdir(d):
        if f.endswith(('.js', '.html')): code += open(os.path.join(d, f), encoding='utf8', errors='ignore').read()
    files = []
    for dp, _, fs in os.walk(d):
        for f in sorted(fs):
            rel = os.path.relpath(os.path.join(dp, f), d).replace(os.sep, '/')
            if f.endswith('.md') or (f.endswith('.svg') and f not in code): continue
            p = os.path.join(dp, f); b = open(p, 'rb').read(); h.update(rel.encode()); h.update(b); total += len(b)
            files.append(rel)
    files.sort(key=lambda r: (r != 'index.html', r))
    m = re.search(r'<title>([^<]*)</title>', open(os.path.join(d, 'index.html'), encoding='utf8').read())
    title = (m.group(1) if m else s).split(' \u00b7 ')[0].split(' · ')[0].strip()
    thumb = rel_dir + '/assets/icon_512.png' if s in STAGING_ONLY else 'assets/thumbs/%s.png' % s
    games[s] = {'title': title, 'files': files, 'thumb': thumb}
    if s in STAGING_ONLY: games[s]['dir'] = rel_dir
    for t in (thumb,):
        h.update(open(os.path.join(ROOT, t), 'rb').read())
out = {'version': h.hexdigest()[:12], 'bytes': total, 'games': games}
open(os.path.join(os.path.dirname(__file__), 'precache-manifest.js'), 'w').write('self.PRECACHE = ' + json.dumps(out, indent=1) + ';\n')
print(out['version'], sum(len(g['files']) for g in games.values()), 'files', round(total / 1e6, 1), 'MB')
