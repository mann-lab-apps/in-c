from pathlib import Path
import subprocess
base=Path('docs/brand/ddirori-design-system/returns/studio-continuous-2026-10-28');cp=base/'354-octave-label-clearance'
args=['python3',str(base/'216-partial-tie-import/coordinator.py'),'--checkpoint',str(cp),'--base',str(cp/'native-neighbor-ink-lock-after.json'),'--prefix','native-final','--output-prefix','continuous-354-final','--jobs',str(cp/'jobs-final.json')]
files=sorted(Path('out/ddirori/continuous-354-spacing-source').iterdir())
for p in files+[Path(__file__),cp/'make-spacing-fixtures.ts']:args+=['--extra',str(p)]
subprocess.run(args,check=True)
