from pathlib import Path
import ast,json,hashlib,subprocess,os,re
r=Path.cwd();base=r/'docs/brand/ddirori-design-system/returns/studio-continuous-2026-10-28';cp=base/'384-beam-tie-ink';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();reader=base/'369-key-boundary-chord-ties/check-outputs.py';fn=next(n for n in ast.parse(reader.read_text()).body if isinstance(n,ast.FunctionDef)and n.name=='sustained_notes');scope={};exec(compile(ast.fix_missing_locations(ast.Module(body=[fn],type_ignores=[])),str(reader),'exec'),scope);notes=scope['sustained_notes'];xmls=[];cases=[];pdfRefs={};positive={'stem':0,'beam':0}
for kind,folder,prior,pitches in [('beams','continuous-384-source',r/'out/ddirori/continuous-384-observe',None),('stems','continuous-382-source',r/'out/ddirori/continuous-382-fixed',{'crossing-c5':72,'near-d5':74,'far-c3':48}),('glyphs','continuous-379-source',r/'out/ddirori/continuous-379-fixed-ink',{'near-e':64,'near-f':65,'far-c':48})]:
 out=r/('out/ddirori/continuous-384-owned-'+kind);source=r/'out/ddirori'/folder;xmls+=list(source.glob('*.musicxml'));rows=json.loads((out/'results.json').read_text());assert len(rows)==6
 for row in rows:
  name,width=row['name'],row['width'];scene=out/f'{width}-{name}';old=prior/f'{width}-{name}';score=json.loads((source/(name+'.chromatics')).read_text())['score']
  for n in ['initial','after-output','reopened','current']:assert json.loads((scene/(n+'.chromatics')).read_text())['score']==score
  expected=[(0,0,67,75,3840),(0,0,71,75,3840)]
  if kind=='beams':
   meta=json.loads((source/(name+'-meta.json')).read_text());pitchClass={'C':0,'D':2,'E':4}
   expected += [(0,round(n['start']*480),12*(n['octave']+1)+pitchClass[n['step']],75,round(n['duration']*480))for n in meta['notes']]
  else:expected.append((0,960,pitches[name],75,960))
  for suffix,file in [('.mid','converted.mid'),('.musicxml','fresh.musicxml')]:assert (scene/file).read_bytes()==(source/(name+suffix)).read_bytes()
  assert notes((scene/'converted.mid').read_bytes())==sorted(expected);xmls.append(scene/'fresh.musicxml')
  for label in ['live-ink.json','print-ink.json']:
   data=json.loads((scene/label).read_text());before=json.loads((old/label).read_text());assert data['withinSvg']and not data['overflow'];assert len(data['ties'])==2;assert all(g['positivePixels']>0 and not g['overlaps']for g in data['modifierInk'])
   assert [(g.get('eventId'),g['rect'])for g in data['modifierInk']]==[(g.get('eventId'),g['rect'])for g in before['modifierInk']]
   for g in data.get('stemInk',[]):
    assert g['positivePixels']>0 and g['positiveProbe']>0 and g['transparentProbe']==0 and all(v['pixels']==0 for v in g['overlaps']);positive[g['kind']]+=g['positivePixels']
   if kind=='beams':assert [(g['kind'],g['path'],g['rect'])for g in data['stemInk']]==[(g['kind'],g['path'],g['rect'])for g in before['stemInk']]
  def raster(pdf,prefix):
   assert int(re.search(r'Pages:\s+(\d+)',subprocess.check_output(['pdfinfo',str(pdf)],text=True)).group(1))==1
   subprocess.run(['pdftoppm','-scale-to','1300','-png',str(pdf),str(pdf.parent/prefix)],check=True,capture_output=True);return sha(pdf.parent/(prefix+'-1.png'))
  image=raster(scene/'converted.pdf','review384');oldImage=raster(old/'converted.pdf','review384-control');changed=kind=='beams'and name!='beam-far';assert (image!=oldImage)==changed;key=kind+'/'+name;pdfRefs.setdefault(key,image);assert pdfRefs[key]==image
  cases.append({'case':f'{kind}/{width}-{name}','nativeExact':True,'independentMIDI':sorted(expected),'actualXMLExact':True,'PDFPages':1,'pdfPixelChangedAsExpected':changed,'imageSha256':image})
assert len(xmls)==27;xsd=r/'src/musicxml/schema/musicxml-4.0/musicxml.xsd';catalog=xsd.with_name('catalog.xml');env=os.environ.copy();env['XML_CATALOG_FILES']=str(catalog)
for p in xmls:
 v=subprocess.run(['xmllint','--nonet','--noout','--schema',str(xsd),str(p)],env=env,capture_output=True,text=True);assert v.returncode==0,(str(p),v.stderr)
assert json.loads((cp/'native-lock-after.json').read_text())['sourcesStable'];(cp/'output-checks.json').write_text(json.dumps({'cases':cases,'actualNative':18,'actualXML':18,'actualMIDI':18,'actualPDF':18,'sourceXML':9,'offlineXSD':27,'positiveShapePixels':positive,'xsdSha256':sha(xsd),'catalogSha256':sha(catalog),'baselineChanged':False,'limits':['Same-system complete ties;partial pieces remain separate','Ownership unit controls are DOM classification coverage,not added native fixtures','No physicalIME/OSdialog/SR/listening/external app certification']},indent=2)+'\n');print('PASS18native/XML/MIDI/PDF;27offlineXSD;4intentionalPDFchanges/14unchangedcontrols;actualpositive stem/body ink')
