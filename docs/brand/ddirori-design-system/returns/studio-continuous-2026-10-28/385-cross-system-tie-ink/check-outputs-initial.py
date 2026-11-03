from pathlib import Path
import ast,json,hashlib,subprocess,os,re,math
r=Path.cwd();base=r/'docs/brand/ddirori-design-system/returns/studio-continuous-2026-10-28';cp=base/'385-cross-system-tie-ink';out=r/'out/ddirori/continuous-385-final';source=r/'out/ddirori/continuous-385-source-v2';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();reader=base/'369-key-boundary-chord-ties/check-outputs.py';fn=next(n for n in ast.parse(reader.read_text()).body if isinstance(n,ast.FunctionDef)and n.name=='sustained_notes');scope={};exec(compile(ast.fix_missing_locations(ast.Module(body=[fn],type_ignores=[])),str(reader),'exec'),scope);notes=scope['sustained_notes'];rows=json.loads((out/'results.json').read_text());assert len(rows)==16;xmls=list(source.glob('*.musicxml'));assert len(xmls)==8;checks=[];refs={};history=0;gaps=[]
for row in rows:
 name,width=row['name'],row['width'];scene=out/f'{width}-{name}';project=json.loads((source/(name+'.chromatics')).read_text());meta=json.loads((source/(name+'-meta.json')).read_text())
 for n in ['initial','after-output','reopened','current']:assert json.loads((scene/(n+'.chromatics')).read_text())==project
 if name in ['cross-eight','cross-single']:
  untied=json.loads(json.dumps(project))
  for m in untied['score']['parts'][0]['staves'][0]['measures']:
   for n in m['voices'][0]['events']:n.pop('ties',None)
  for label,expected in [('untied',untied),('undo',project),('undo-noop',project),('redo',untied),('redo-noop',untied),('history-restored',project)]:assert json.loads((scene/(label+'.chromatics')).read_text())==expected
  history+=1
 expected=[(0,0,p,75,meta['heldMidiTicks'])for p in meta['tiedPitches']];pitch={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11};expected +=[(0,round(n['start']*480),12*(n['octave']+1)+pitch[n['step']],75,round(n['duration']*480))for n in meta['notes']];expected +=[tuple(n)for n in meta.get('extraMidi',[])]
 assert notes((scene/'converted.mid').read_bytes())==sorted(expected);assert (scene/'converted.mid').read_bytes()==(source/(name+'.mid')).read_bytes();xml=scene/'fresh.musicxml';assert xml.read_bytes()==(source/(name+'.musicxml')).read_bytes();xmls.append(xml)
 priorName='continuous-385-observe-v2'if name in ['cross-eight','cross-mixed','cross-far','cross-single','cross-symbols']else'continuous-385-shared-depth-red';prior=r/'out/ddirori'/priorName/f'{width}-{name}';incoming=[];dy={}
 for label in ['live-ink.json','print-ink.json']:
  d=json.loads((scene/label).read_text());before=json.loads((prior/label).read_text());assert d['withinSvg']and not d['overflow']and len(d['ties'])==meta['tiePaths'];assert sorted(set(t['system']for t in d['ties']))==list(range(meta['systems']))
  assert all(g['positivePixels']>0 and not g['overlaps']for g in d['modifierInk']);assert all(g['positivePixels']>0 and g['positiveProbe']>0 and g['transparentProbe']==0 and all(v['pixels']==0 for v in g['overlaps'])for g in d['stemInk'])
  if meta['changedStartSymbols']:assert any(g['kind']=='accidental'and g.get('eventId')=='incoming-natural'for g in d['stemInk'])
  assert len(d['modifierInk'])==len(before['modifierInk'])
  for g,old in zip(d['modifierInk'],before['modifierInk']):
   assert (g.get('eventId'),g['text'])==(old.get('eventId'),old['text'])
   for key in ['x','width','height']:assert math.isclose(g['rect'][key],old['rect'][key],abs_tol=.01),(name,label,key,g['rect'],old['rect'])
   dy.setdefault(str(g.get('measureId')),set()).add(round(g['rect']['y']-old['rect']['y'],2))
  if meta['systems']==2:
   assert d['systemGap']['staffLines']>=5 and d['systemGap']['gap']>=8;gaps.append(d['systemGap']['gap'])
   for i,(tie,old)in enumerate(zip(d['ties'],before['ties'])):
    a=[float(v)for v in re.findall(r'-?\d+(?:\.\d+)?',tie['d'])];b=[float(v)for v in re.findall(r'-?\d+(?:\.\d+)?',old['d'])];assert len(a)==len(b)==10
    assert math.isclose(a[0],b[0],abs_tol=.01)and math.isclose(a[4],b[4],abs_tol=.01);assert math.copysign(1,a[3]-(a[1]+a[5])/2)==math.copysign(1,b[3]-(b[1]+b[5])/2)
    if tie['system']==1:
     assert math.isclose(tie['right']-tie['x'],old['right']-old['x'],abs_tol=.01);assert math.isclose(tie['bottom']-tie['y'],old['bottom']-old['y'],abs_tol=.01);incoming.append(round(tie['right']-tie['x'],2))
    event='tied-1'if tie['system']==0 else'tied-2';members=[g for g in d['modifierInk']if g.get('eventId')==event];oldMembers=[g for g in before['modifierInk']if g.get('eventId')==event];memberIndex=i%len(members);g,og=members[memberIndex],oldMembers[memberIndex];ay=a[1]if tie['system']==0 else a[5];by=b[1]if tie['system']==0 else b[5]
    assert math.isclose(ay-(g['rect']['y']+g['rect']['height']/2),by-(og['rect']['y']+og['rect']['height']/2),abs_tol=.02),'Attached endpoint relative to its unchanged note must be preserved'
 def raster(pdf,prefix):
  assert int(re.search(r'Pages:\s+(\d+)',subprocess.check_output(['pdfinfo',str(pdf)],text=True)).group(1))==1
  subprocess.run(['pdftoppm','-scale-to','1300','-png',str(pdf),str(pdf.parent/prefix)],check=True,capture_output=True);return sha(pdf.parent/(prefix+'-1.png'))
 image=raster(scene/'converted.pdf','review385');oldImage=raster(prior/'converted.pdf','review385-control');refs.setdefault(name,image);assert refs[name]==image
 if name=='cross-far':assert image==oldImage
 checks.append({'case':f'{width}-{name}','wholeNativeExact':True,'historyExact':name in ['cross-eight','cross-single'],'independentMIDI':sorted(expected),'XMLExact':True,'systems':meta['systems'],'incomingWidths':sorted(set(incoming)),'glyphRowYTranslations':{k:sorted(v)for k,v in dy.items()},'pdfPixelChanged':image!=oldImage,'imageSha256':image,'prior':str(prior)})
assert history==4 and len(xmls)==24;xsd=r/'src/musicxml/schema/musicxml-4.0/musicxml.xsd';catalog=xsd.with_name('catalog.xml');env=os.environ.copy();env['XML_CATALOG_FILES']=str(catalog)
for p in xmls:
 result=subprocess.run(['xmllint','--nonet','--noout','--schema',str(xsd),str(p)],env=env,capture_output=True,text=True);assert result.returncode==0,(str(p),result.stderr)
pairs=[json.loads((source/(v+'.chromatics')).read_text())for v in ['view-score','view-part']];assert pairs[0]['score']==pairs[1]['score']and pairs[0]['partLayouts']==pairs[1]['partLayouts']and pairs[0]['view']!=pairs[1]['view']
(cp/'output-checks.json').write_text(json.dumps({'cases':checks,'actualNative':16,'actualXML':16,'actualMIDI':16,'actualPDF':16,'sourceXML':8,'offlineXSD':24,'actualHistoryPaths':history,'minimumOutgoingToNextStaffGap':min(gaps),'score2Part1SameProject':True,'xsdSha256':sha(xsd),'catalogSha256':sha(catalog),'baselineChanged':False,'limits':['12/24.72-unit clear incoming pieces retained;no arbitrary lengthening','Low-note native case passed before shared-depth algorithm correction;that correction is coordinate-level evidence','DOM-only tests are not physicalIME/OSdialog/SR/listening/externalapp verification']},indent=2)+'\n');print('PASS16whole-native/XML/MIDI/PDF,4actualhistorypaths,24offlineXSD;anchors/sides/incoming widths preserved;nextstaff gap',min(gaps))
