from collections import Counter
import gzip
import json
from pathlib import Path
import sys

proof = Path(sys.argv[1]).resolve()
record = json.loads((proof / 'runner/comparison.json').read_text())
run = json.loads((proof / 'run.json').read_text())
assert run['conclusion'] == 'success'
assert record['sha256'] == '6c415659fec6c352eae675977a49559ecd1d5d4a52750ecd0326fc3fe51facdc'
expected = {'rosetta-app-first', 'rosetta-app-repeat', 'rosetta-app-repeat-2', 'native-app'}
assert set(record['probes']) == expected


def coverage(events):
    intervals = sorted((event['clippedStartUs'], event['clippedEndUs']) for event in events)
    total = 0
    end = 0
    for start, stop in intervals:
        total += max(0, stop - max(start, end))
        end = max(end, stop)
    return round(total / 1000, 3)


def analyze_trace(trace_path, reload):
    with gzip.open(trace_path, 'rt') as stream:
        events = json.load(stream)['traceEvents']
    navigations = [
        event for event in events
        if event['name'] == 'navigationStart'
        and event['args'].get('data', {}).get('isOutermostMainFrame')
        and 'app.asar' in event['args']['data'].get('documentLoaderURL', '')
    ]
    navigation, = navigations
    begin = navigation['ts']
    nav_id = navigation['args']['data']['navigationId']
    fcp, = (event for event in events if event['name'] == 'firstContentfulPaint'
            and event.get('args', {}).get('data', {}).get('navigationId') == nav_id)
    assert fcp['pid'] == navigation['pid'] and fcp['tid'] == navigation['tid']
    end = max(fcp['ts'], begin + round(reload['actionVisibleMs'] * 1000))
    main = [{**event, 'clippedStartUs': max(begin, event['ts']),
             'clippedEndUs': min(end, event['ts'] + event['dur'])}
            for event in events if (event['pid'], event['tid']) == (navigation['pid'], navigation['tid'])
            and event.get('dur', 0) > 0 and event['ts'] < end and event['ts'] + event['dur'] > begin]
    names = Counter(event['name'] for event in main)
    scripts = [event for event in main if event['name'] in
               {'EvaluateScript', 'FunctionCall', 'RunMicrotasks', 'v8.evaluateModule', 'v8.run', 'RunScript'}]
    layout = [event for event in main if event['name'] in {'Layout', 'RecalculateStyles', 'UpdateLayoutTree'}]
    tasks = [event for event in main if event['name'] in {'ThreadControllerImpl::RunTask', 'RunTask'}]
    ranked = {}
    for name in names:
        ranked[name] = coverage(event for event in main if event['name'] == name)
    return {
        'fcpMs': round((fcp['ts'] - begin) / 1000, 3), 'windowMs': round((end - begin) / 1000, 3),
        'events': len(main), 'taskMs': coverage(tasks), 'scriptMs': coverage(scripts), 'layoutMs': coverage(layout),
        'largestEvents': sorted(ranked.items(), key=lambda item: -item[1])[:12],
    }


trials = {}
for name, timing in record['probes'].items():
    assert timing['stage'] == 'offline image decode and visibility'
    normal = timing['documentTiming']
    reload = timing['reloadTiming']
    assert timing['browserListeningMs'] <= normal['navigationStartMs'] <= timing['startScreenMs']
    assert timing['debuggerAttachedMs'] <= timing['firstUiProbeStartedMs'] <= timing['firstUiProbeReturnedMs'] <= timing['startScreenMs']
    startup = json.loads((proof / 'runner' / name / 'startup.json').read_text())
    assert startup['offlineStartScreen']['width'] == 150 and startup['exit']['code'] == 0
    trace = analyze_trace(proof / 'runner' / name / 'startup-reload-trace.json.gz', reload)
    trials[name] = {
        'devtoolsMs': timing['browserListeningMs'],
        'devtoolsToNavigationMs': normal['navigationStartMs'] - timing['browserListeningMs'],
        'normalNavigationToFcpMs': normal['paints']['first-contentful-paint'],
        'devtoolsToScreenMs': timing['startScreenMs'] - timing['browserListeningMs'],
        'screenMs': timing['startScreenMs'],
        'estimatedFcpToVisibleProbeMs': round(timing['startScreenMs'] - normal['navigationStartMs'] - normal['paints']['first-contentful-paint'], 3),
        'firstProbeRoundTripMs': timing['firstUiProbeReturnedMs'] - timing['firstUiProbeStartedMs'],
        'visibleAtFirstProbe': timing['visibleAtFirstProbe'],
        'reloadActionsInsertedMs': reload['actionInsertedMs'],
        'reloadActionsVisibleMs': reload['actionVisibleMs'],
        'reloadLongTasks': reload['longTasks'],
        'reloadResources': reload['resources'],
        'trace': trace,
    }

output = json.dumps({'run': run['url'], 'qaSha': run['headSha'], 'trials': trials}, indent=2) + '\n'
(proof / 'verification.json').write_text(output)
for name, v in trials.items():
    print(name, json.dumps({key: v[key] for key in (
        'devtoolsToNavigationMs', 'normalNavigationToFcpMs', 'devtoolsToScreenMs',
        'firstProbeRoundTripMs', 'estimatedFcpToVisibleProbeMs', 'reloadActionsVisibleMs', 'trace'
    )}))
