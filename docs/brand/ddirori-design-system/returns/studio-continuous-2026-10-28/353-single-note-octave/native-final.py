from pathlib import Path
import subprocess
base=Path('docs/brand/ddirori-design-system/returns/studio-continuous-2026-10-28');cp=base/'353-single-note-octave';args=['python3',str(base/'216-partial-tie-import/coordinator.py'),'--checkpoint',str(cp),'--base',str(cp/'native-before-lock-after.json'),'--prefix','native-final','--output-prefix','continuous-353-final','--jobs',str(cp/'jobs-final.json')]
files=[p for p in sorted(Path('out/ddirori/continuous-353-source').iterdir())if p.suffix in ['.chromatics','.musicxml','.mid','.json']]
for p in files+[Path(__file__)]:args+=['--extra',str(p)]
print('Locking owned fixture files:',len(files),flush=True);subprocess.run(args,check=True)
