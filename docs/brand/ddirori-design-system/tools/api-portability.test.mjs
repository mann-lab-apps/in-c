import test from 'node:test';
import assert from 'node:assert/strict';
import {portableApiJson, portableApiText} from './api-portability.mjs';
test('API snapshots match across macOS and Linux checkout paths without losing type information', () => {
  const mac = '/Users/dev/work/in-c/';
  const linux = '/home/runner/work/in-c/in-c/';
  const signature = root => `(import("${root}node_modules/@types/react/index").ReactEventHandler<HTMLButtonElement> & ((e: unknown) => void)) | undefined`;
  assert.equal(portableApiText(signature(mac), mac), portableApiText(signature(linux), linux));
  assert.match(portableApiText(signature(mac), mac), /ReactEventHandler<HTMLButtonElement>/);
});

test('JSON snapshots normalize type values before quotes are escaped', () => {
  const snapshot = modules => ({
    react: [{props: [{
      type: `import("${modules}/@types/react/index").JSXElementConstructor<{ "aria-label"?: string }>`
    }]}],
    dart: [{line: 3}]
  });
  const mac = portableApiJson(snapshot('/worktrees/shared/node_modules'), '/worktrees/candidate/');
  const linux = portableApiJson(snapshot('/home/runner/work/in-c/in-c/node_modules'), '/home/runner/work/in-c/in-c/');
  assert.equal(mac, linux);
  assert.equal(JSON.parse(mac).react[0].props[0].type,
    'import("react").JSXElementConstructor<{ "aria-label"?: string }>');
});
