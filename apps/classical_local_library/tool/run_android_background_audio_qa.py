#!/usr/bin/env python3
"""Disposable Play emulator only: OS app switch and real media key dispatch."""
import argparse
import hashlib
import json
from pathlib import Path
import queue
import re
import subprocess
import threading
import time
from android_media_evidence import wait_for_panel

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--device',required=True)
parser.add_argument('--output',required=True,type=Path)
args=parser.parse_args()
def adb(*values):
    return subprocess.check_output(['adb','-s',args.device,*values],stderr=subprocess.STDOUT,timeout=15)
assert args.device.startswith('emulator-'), 'Physical devices are not accepted'
assert adb('emu','avd','name').decode().splitlines()[0].startswith('DDIRORI_QA_Play_'), 'Use a dedicated Play AVD'
sdk=int(adb('shell','getprop','ro.build.version.sdk').decode().strip())
for setting in ['window_animation_scale','transition_animation_scale','animator_duration_scale']:
    adb('shell','settings','put','global',setting,'0')
args.output.mkdir(parents=True,exist_ok=True)
app=Path(__file__).resolve().parent.parent
process=subprocess.Popen(['flutter','test','--no-pub','integration_test/android_background_audio_integration_test.dart','-d',args.device,'--reporter','expanded'],cwd=app,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1)
lines=queue.Queue()
def read():
    for line in process.stdout: lines.put(line)
    lines.put(None)
threading.Thread(target=read,daemon=True).start()
deadline=time.monotonic()+900
return_at=None
result=None
stages=[]
inspection={'dedicatedEmulatorAnimationsDisabled': True}
try:
    with (args.output/'native-android.log').open('w') as log:
        while True:
            if time.monotonic()>deadline: raise TimeoutError('Android QA exceeded 15 minutes')
            if return_at and time.monotonic()>=return_at:
                adb('shell','input','keyevent','KEYCODE_WAKEUP')
                adb('shell','wm','dismiss-keyguard')
                adb('shell','am','start','-n','app.inc.classical_local_library/.MainActivity')
                return_at=None
            try: line=lines.get(timeout=.2)
            except queue.Empty: continue
            if line is None: break
            clean=re.sub(r'/Users/[^\s"\x27<>]+','<private-path>',line)
            log.write(clean);log.flush();print(clean,end='',flush=True)
            if 'DDIRORI_ANDROID_READY' in line:
                stages.append('background')
                service=adb('shell','dumpsys','activity','services','app.inc.classical_local_library').decode()
                inspection['foregroundServiceBeforeHome']='isForeground=true' in service
                adb('shell','input','keyevent','KEYCODE_HOME')
                adb('shell','input','keyevent','KEYCODE_SLEEP')
                return_at=time.monotonic()+6
            for marker,key in [('PAUSE','pause'),('NEXT','next'),('PLAY','play'),('STOP','stop')]:
                if f'DDIRORI_ANDROID_{marker}' in line:
                    if marker=='PAUSE':
                        session=adb('shell','dumpsys','media_session').decode()
                        inspection['activeMediaSession']='app.inc.classical_local_library' in session and '합성 음원' in session
                    if marker=='NEXT':
                        # The native test emits NEXT only after OS pause reached
                        # the real engine. Capture that stable paused panel;
                        # Android's animated playing waveform prevents UI idle.
                        adb('shell','cmd','statusbar','expand-notifications')
                        def read_panel():
                            # Never reuse a stale tree when UIAutomator cannot
                            # acquire an idle window during a SystemUI transition.
                            adb('shell','rm','-f','/data/local/tmp/ddirori-media-window.xml')
                            try:
                                adb('shell','uiautomator','dump','--compressed','/data/local/tmp/ddirori-media-window.xml')
                                xml=adb('shell','cat','/data/local/tmp/ddirori-media-window.xml').decode()
                            except (subprocess.CalledProcessError,subprocess.TimeoutExpired):
                                xml=''
                            session=adb('shell','dumpsys','media_session').decode()
                            return xml,session
                        readiness,xml=wait_for_panel(read_panel)
                        inspection['notificationContent']=readiness
                        xml_bytes=xml.encode()
                        (args.output/'android-media-notification.xml').write_bytes(xml_bytes)
                        inspection['notificationHierarchySha256']=hashlib.sha256(xml_bytes).hexdigest()
                        image=adb('exec-out','screencap','-p')
                        (args.output/'android-media-notification.png').write_bytes(image)
                        inspection['notificationPngSha256']=hashlib.sha256(image).hexdigest()
                        adb('shell','cmd','statusbar','collapse')
                    stages.append(key);adb('shell','cmd','media_session','dispatch',key)
            if 'DDIRORI_ANDROID_RESULT ' in line: result=json.loads(line.split('DDIRORI_ANDROID_RESULT ',1)[1])
    code=process.wait(timeout=30)
    passed=code==0 and result is not None and stages==['background','pause','next','play','stop'] and inspection.get('foregroundServiceBeforeHome') and inspection.get('activeMediaSession') and inspection.get('notificationContent',{}).get('ready')
    (args.output/'result.json').write_text(json.dumps({'environment':f'Android emulator API{sdk}','flutterExitCode':code,'stages':stages,'inspection':inspection,'nativeResult':result,'passed':bool(passed),'physicalAudibilityVerified':False},ensure_ascii=False,indent=2)+'\n')
    raise SystemExit(0 if passed else 1)
except Exception as error:
    (args.output/'result.json').write_text(json.dumps({'passed':False,'failureType':type(error).__name__,'stages':stages,'inspection':inspection,'physicalAudibilityVerified':False},ensure_ascii=False,indent=2)+'\n')
    raise
finally:
    adb('shell','cmd','statusbar','collapse')
    if process.poll() is None: process.terminate();process.wait(timeout=30)
