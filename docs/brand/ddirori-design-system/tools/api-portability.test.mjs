import test from 'node:test';
import assert from 'node:assert/strict';
import {portableApiText} from './api-portability.mjs';
test('API snapshots match across macOS and Linux checkout paths without losing type information', () => {
  const mac = '/Users/dev/work/in-c/';
  const linux = '/home/runner/work/in-c/in-c/';
  const signature = root => `(import("${root}node_modules/@types/react/index").ReactEventHandler<HTMLButtonElement> & ((e: unknown) => void)) | undefined`;
  assert.equal(portableApiText(signature(mac), mac), portableApiText(signature(linux), linux));
  assert.match(portableApiText(signature(mac), mac), /ReactEventHandler<HTMLButtonElement>/);
});
