"use strict";
// Isolated renderer/main regression. Menu activation checks visibility and hit geometry.
const { app, BrowserWindow, dialog, nativeTheme, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const root = process.cwd(), base = path.join(root, "out", "post-alpha41-png"), outName = process.argv.find((x) => x.startsWith("--out="))?.slice(6), build = process.argv.find((x) => x.startsWith("--build="))?.slice(8), expectFixed = process.argv.includes("--expect-fixed");
assert(outName && build && build.startsWith("out/post-alpha41-png/"));
assert(/^[a-z0-9-]+$/.test(outName));
const out = path.join(base, outName);
assert(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"), digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "studio-owned-png-integrity-"));
if (process.platform === "darwin") app.setActivationPolicy("accessory");
process.argv.push("--piano-audit");
process.env.DDIRORI_PIANO_QA_DATA = profile;
delete process.env.ELECTRON_RENDERER_URL;
nativeTheme.themeSource = "light";
let win, stage = "startup", targetOpen, targetSave;
const rows = [], completions = [], payloads = [], network = [];
BrowserWindow.prototype.show = () => {
};
BrowserWindow.prototype.showInactive = () => {
};
BrowserWindow.prototype.focus = () => {
};
app.focus = () => {
};
app.on("browser-window-created", (_e, w) => {
  w.webContents.setAudioMuted(true);
  w.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  w.webContents.session.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*"] }, (r, cb) => {
    network.push(r.url);
    cb({ cancel: true });
  });
});
dialog.showOpenDialog = async () => {
  assert(targetOpen?.startsWith(out + path.sep));
  return { canceled: false, filePaths: [targetOpen] };
};
dialog.showSaveDialog = async () => {
  assert(targetSave?.startsWith(out + path.sep));
  if (holdCancelledPicker) {
    holdCancelledPicker = false;
    await new Promise((resolve) => {
      releasePicker = resolve;
    });
    return { canceled: true };
  }
  return { canceled: false, filePath: targetSave };
};
dialog.showMessageBox = async () => {
  throw Error("Unexpected native confirmation");
};
const deadline = setTimeout(() => {
  fs.writeFileSync(path.join(out, "deadline.json"), JSON.stringify({ stage, rows }, null, 2));
  app.exit(124);
}, 3e5);
async function bounded(label, fn) {
  stage = label;
  let timer;
  try {
    return await Promise.race([fn(), new Promise((_, reject) => timer = setTimeout(() => reject(Error("Deadline " + label)), 1e4))]);
  } finally {
    clearTimeout(timer);
  }
}
async function run(fn, arg) {
  const result = await bounded(stage, () => win.webContents.executeJavaScript(`(async()=>{try{return {value:await (${fn.toString()})(${JSON.stringify(arg) ?? ""})}}catch(error){return {qaThrown:String(error.stack||error)}}})()`));
  if (result?.qaThrown) throw Error(stage + " renderer: " + result.qaThrown);
  return result?.value;
}
async function wait(fn, label) {
  const end = Date.now() + 1e4;
  while (!await fn()) {
    assert(Date.now() < end, label);
    await new Promise((r) => setTimeout(r, 30));
  }
}
const settle = () => run(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
async function click(selector, label) {
  const locator = { selector, label };
  await run(({ selector: selector2, label: label2 }) => {
    const n = [...document.querySelectorAll(selector2)].find((n2) => n2.checkVisibility() && (n2.getAttribute("aria-label") || (n2.labels?.length ? [...n2.labels].map((l) => l.textContent.trim()).join(" ") : n2.textContent.trim())) === label2);
    if (!n || n.disabled) throw Error("Unavailable DOM action " + label2);
    n.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }, locator);
  await settle();
  return run(({ selector: selector2, label: label2 }) => {
    const n = [...document.querySelectorAll(selector2)].find((n2) => n2.checkVisibility() && (n2.getAttribute("aria-label") || (n2.labels?.length ? [...n2.labels].map((l) => l.textContent.trim()).join(" ") : n2.textContent.trim())) === label2);
    if (!n || n.disabled) throw Error("Unavailable DOM action after reveal " + label2);
    const r = n.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) throw Error("No visible box " + label2);
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (r.left < 0 || r.right > innerWidth + 1 || r.top < 0 || r.bottom > innerHeight + 1 || !hit || !n.contains(hit)) throw Error("Outside/occluded actual viewport " + label2 + " " + JSON.stringify(r.toJSON()));
    n.click();
    return { method: "QA DOM activation", label: label2, rect: r.toJSON() };
  }, locator).then(async (result) => {
    await settle();
    return result;
  });
}
async function menu(name, label) {
  await run((name2) => {
    const n = [...document.querySelectorAll(".studio-application-menu button")].find((n2) => n2.checkVisibility() && n2.textContent.trim() === name2);
    if (!n || n.disabled) throw Error("Unavailable menu focus destination " + name2);
    n.focus({ preventScroll: true });
    if (document.activeElement !== n) throw Error("Current menu focus was not applied");
  }, name);
  await click(".studio-application-menu button", name);
  await wait(() => run((label2) => [...document.querySelectorAll('[role="menuitem"],[role="menuitemcheckbox"]')].some((n) => n.checkVisibility() && n.textContent.trim() === label2), label), "public menu item " + label);
  await click('[role="menuitem"],[role="menuitemcheckbox"]', label);
}
async function state() {
  return run(() => {
    const counts = [...document.querySelector(".editor-status").children].filter((n) => /^\d+회 수정$/.test(n.textContent));
    if (counts.length !== 1) throw Error("Unique exact edit-count element missing");
    const history = counts[0].textContent;
    const t = document.querySelector(".studio-playback");
    if (!t) throw Error("Actual transport missing");
    const play = t.querySelector('[aria-label="재생"]'), pause = t.querySelector('[aria-label="일시정지"]'), stop = t.querySelector('[aria-label="정지"]'), position = t.querySelector('[aria-label="재생 위치"]');
    if (!play || !pause || !stop || !position) throw Error("Actual transport controls missing");
    return { selection: [...document.querySelectorAll(".notation-event.is-selected")].map((n) => n.dataset.eventId), dirty: document.querySelector(".studio-document__state")?.textContent, history, transport: { playDisabled: play.disabled, pauseDisabled: pause.disabled, stopDisabled: stop.disabled, position: position.textContent } };
  });
}
async function capture(name) {
  assert(!win.isVisible());
  const file = path.join(out, name + ".png");
  fs.writeFileSync(file, (await bounded("capture " + name, () => win.webContents.capturePage())).toPNG());
  return { file: path.basename(file), sha256: hash(file) };
}
const fixture = path.join(__dirname, "reader-source.chromatics"), fixtureHash = hash(fixture);
const mode = process.argv.find((x) => x.startsWith("--mode="))?.slice(7);
const outsideControl = process.argv.includes("--outside-control");
const onlyWidth = Number(process.argv.find((x) => x.startsWith("--width="))?.slice(8));
const companionOnly = process.argv.find((x) => x.startsWith("--companion="))?.slice(12);
assert(["scroll", "range", "help", "replace"].includes(mode));
let holdCancelledPicker = false, releasePicker;
let holdChannel, held, releaseHeld;
const handle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel, handler) => handle(channel, ["png:save", "pdf:save", "midi:save", "musicxml:export"].includes(channel) ? async (...args) => {
  const shouldHold = holdChannel === channel;
  if (shouldHold) holdChannel = void 0;
  if (channel === "png:save") payloads.push(Buffer.from(args[1].pages[0].bytes));
  let outcome, error;
  try {
    outcome = await handler(...args);
  } catch (caught) {
    error = caught;
  }
  const record = error ? { channel, ok: false, code: error.code, message: error.message } : { channel, ok: true, result: outcome };
  if (shouldHold) {
    held = record;
    await new Promise((resolve) => {
      releaseHeld = resolve;
    });
  }
  completions.push(record);
  if (error) throw error;
  return outcome;
} : handler);
require(path.join(root, build, "main/index.js"));
assert.equal(app.getPath("userData"), profile);
async function acknowledge(file) {
  await wait(() => run((name) => document.querySelector(".studio-status__result")?.textContent.includes(name), path.basename(file)), "accepted file " + path.basename(file));
  await settle();
}
async function submitPng(target) {
  targetSave = target;
  const count = completions.length;
  await click("button", "PNG 내보내기");
  await wait(() => completions.length === count + 1, "PNG actual main completion");
  await settle();
  return completions[count];
}
async function settings() {
  await menu("파일", "내보내기 설정");
  await click('[role="combobox"]', "PNG 페이지");
  await click('[role="option"]', "페이지 선택");
  await click('[role="combobox"]', "PNG 해상도");
  await click('[role="option"]', "150 dpi");
}
async function scaleText(factor) {
  const result = await run((factor2) => {
    window.__qaTextObserver?.disconnect();
    const originals = window.__qaOriginalFonts ??= /* @__PURE__ */ new Map();
    function apply() {
      for (const [n, size] of originals) if (n.isConnected) n.style.fontSize = size;
      originals.clear();
      if (factor2 === 1) return 0;
      const nodes = [...document.querySelectorAll(
        ".ddirori :is(button,input,select,summary,label,span,output,h1,h2,h3,p,dt,dd,code)"
      )].filter((n) => !n.closest(".score-canvas,.studio-pdf-snapshot"));
      const sizes = nodes.map((n) => parseFloat(getComputedStyle(n).fontSize));
      nodes.forEach((n, i) => {
        originals.set(n, n.style.fontSize);
        n.style.fontSize = `${sizes[i] * factor2}px`;
      });
      return nodes.length;
    }
    const count = apply();
    if (factor2 > 1) {
      window.__qaTextObserver ??= new MutationObserver(() => window.__qaApplyText());
      window.__qaApplyText = apply;
      window.__qaTextObserver.observe(document.body, { subtree: true, childList: true });
    }
    const sample = document.querySelector(".studio-status__result");
    return { factor: factor2, count, sample: sample ? getComputedStyle(sample).fontSize : null };
  }, factor);
  await settle();
  return result;
}
async function key(name, shift = false) {
  const code = { Enter: 13, Tab: 9, Escape: 27, PageUp: 33, PageDown: 34, ArrowDown: 40, ArrowUp: 38, Space: 32 }[name];
  const modifiers = shift ? 8 : 0;
  for (const type of ["Enter", "Space"].includes(name) ? ["rawKeyDown", "char", "keyUp"] : ["rawKeyDown", "keyUp"]) {
    await win.webContents.debugger.sendCommand("Input.dispatchKeyEvent", {
      type,
      key: name === "Space" ? " " : name,
      code: name,
      windowsVirtualKeyCode: code,
      modifiers,
      ...type === "char" ? { text: name === "Space" ? " " : "\r", unmodifiedText: name === "Space" ? " " : "\r" } : {}
    });
  }
  await settle();
}
async function focusVisible(selector) {
  await run((sel) => {
    const n = document.querySelector(sel);
    if (!n?.checkVisibility() || n.disabled) throw Error("Unavailable control " + sel);
    n.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    n.focus({ preventScroll: true });
  }, selector);
  await settle();
  assert.equal((await focus()).hit, true, selector);
}
async function focus() {
  return run(() => {
    const n = document.activeElement, f = document.querySelector(".studio-status"), r = n.getBoundingClientRect(), p = f.getBoundingClientRect(), s = getComputedStyle(n);
    const inside = f.contains(n), lab = n.getAttribute("aria-label") || [...n.labels ?? []].map((l) => l.textContent.trim()).join(" ") || n.textContent.trim();
    const minY = inside ? Math.max(0, p.top + f.clientTop) : 0, maxY = inside ? Math.min(innerHeight, p.top + f.clientTop + f.clientHeight) : Math.min(innerHeight, p.top);
    const minX = inside ? Math.max(0, p.left + f.clientLeft) : 0, maxX = inside ? Math.min(innerWidth, p.left + f.clientLeft + f.clientWidth) : innerWidth;
    const extent = s.outlineStyle === "none" ? 0 : Math.max(0, parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset));
    const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const visible = r.top >= minY - 0.5 && r.bottom <= maxY + 0.5 && r.left >= minX - 0.5 && r.right <= maxX + 0.5;
    const ring = r.top - extent >= minY - 0.5 && r.bottom + extent <= maxY + 0.5 && r.left - extent >= minX - 0.5 && r.right + extent <= maxX + 0.5;
    return { lab, inside, visible, hit: n.checkVisibility() && !n.disabled && visible && !!h && n.contains(h), ring, extent, focusVisible: n.matches(":focus-visible"), rect: r.toJSON(), footer: p.toJSON(), root: document.scrollingElement.scrollTop };
  });
}
const diagnostics = () => run(() => {
  const n = document.querySelector('[aria-label="PNG 출력 기술 정보"]');
  return {
    status: document.querySelector(".studio-status__result")?.textContent,
    technical: !!n?.querySelector("button")?.checkVisibility(),
    count: document.querySelectorAll('[aria-label="PNG 출력 기술 정보"]').length,
    local: !!n?.closest(".studio-export-tools"),
    expanded: n?.querySelector("button")?.getAttribute("aria-expanded"),
    inline: [...document.querySelectorAll(".studio-export-tools span")].some((n2) => n2.textContent.startsWith("PNG 출력을 완료하지 못했습니다."))
  };
});
const group = '[aria-label="PNG 출력 기술 정보"]';
const toggle = group + " button";
const field = '.studio-export-tools input[aria-label="PDF 목표 장수"]';
function pngMetadata(file) {
  const bytes = fs.readFileSync(file);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const size = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  for (let at = 8; at + 12 <= bytes.length; at += 12 + bytes.readUInt32BE(at)) {
    if (bytes.toString("ascii", at + 4, at + 8) === "pHYs") {
      assert.equal(bytes[at + 16], 1);
      return { ...size, xPixelsPerMetre: bytes.readUInt32BE(at + 8), yPixelsPerMetre: bytes.readUInt32BE(at + 12) };
    }
  }
  throw Error("No actual pHYs chunk in output");
}
function badDestination(folder) {
  let filename = folder;
  for (let depth = 0; depth < 7; depth++)
    filename = path.join(filename, "diagnostic-" + depth + "-visible-line-alpha41-".repeat(3));
  filename = path.join(filename, "error-at-a-directory.png");
  fs.mkdirSync(filename, { recursive: true });
  return filename;
}
async function readingPosition(findOffset) {
  return run(({ group: group2, findOffset: findOffset2 }) => {
    const node = document.querySelector(group2 + " .studio-warning-technical__message"), text = node.firstChild;
    const range = document.createRange();
    range.selectNodeContents(node);
    const point = (rect) => ({ x: Math.max(0, rect.left) + (Math.min(innerWidth, rect.right) - Math.max(0, rect.left)) / 2, y: (rect.top + rect.bottom) / 2 });
    const hit = ({ x, y }) => document.elementFromPoint(x, y) === node;
    const lines = [...range.getClientRects()].map(point).filter(hit);
    const caret = lines.length && (document.caretPositionFromPoint?.(lines[0].x, lines[0].y) ?? document.caretRangeFromPoint?.(lines[0].x, lines[0].y));
    const active = document.activeElement;
    const baseline = {
      textLength: text.length,
      scroll: document.scrollingElement.scrollTop,
      footerScroll: document.querySelector(".studio-status").scrollTop,
      toggleFocused: !!active.closest(group2),
      visibleLines: lines.length,
      line: lines[0],
      offset: caret && (caret.offsetNode ?? caret.startContainer) === text ? caret.offset ?? caret.startOffset : null,
      selected: document.getSelection().toString()
    };
    if (typeof findOffset2 === "number") {
      range.setStart(text, findOffset2);
      range.setEnd(text, findOffset2 + 1);
      baseline.marker = [...range.getClientRects()].map(point).some(hit);
    }
    return baseline;
  }, { group, findOffset });
}
async function scrollRead(useWheel) {
  await run((group2) => document.querySelector(group2 + " .studio-warning-technical__message").scrollIntoView({ block: "start", behavior: "instant" }), group);
  await settle();
  const before = await readingPosition();
  assert(before.visibleLines > 0);
  for (let step = 0; step < (useWheel ? 1 : 4); step++) {
    let previous = await readingPosition()
    let stablePolls = 0
    let moved = false
    if (useWheel) {
      await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", {
        type: "mouseWheel", x: before.line.x, y: before.line.y, deltaX: 0, deltaY: 205
      })
    } else {
      await key("PageDown")
    }
    // A PageDown continues moving after keyUp. Compare the same settled
    // character before delivering the late response.
    await wait(async () => {
      const next = await readingPosition()
      if (next.scroll !== previous.scroll || next.footerScroll !== previous.footerScroll) {
        moved = true
        stablePolls = 0
      } else if (moved) {
        stablePolls += 1
      }
      previous = next
      return stablePolls >= 4
    }, "native reading scroll to settle")
    if (previous.offset > before.offset) break
  }
  const position = await readingPosition();
  assert.equal(position.selected, "");
  assert(position.toggleFocused && position.offset > before.offset, JSON.stringify({ before, position }));
  return position;
}
const rangeFocusVisible = () => run((group2) => {
  const n = document.querySelector(group2), s = document.getSelection(), focus2 = s.focusNode?.parentElement;
  if (!focus2 || !n.contains(focus2) || s.isCollapsed) return false;
  const r = document.createRange();
  r.setStart(s.focusNode, s.focusOffset);
  r.collapse(true);
  const box = r.getBoundingClientRect();
  return document.elementFromPoint(box.left, (box.top + box.bottom) / 2) === focus2;
}, group);
const rangeState = () => run((group2) => {
  const diagnostic = document.querySelector(group2), s = document.getSelection();
  const point = (node, offset) => ({ part: node?.parentElement?.classList.contains("studio-warning-technical__meta") ? "meta" : node?.parentElement?.classList.contains("studio-warning-technical__message") ? "body" : "outside", offset });
  return {
    text: s.toString(),
    anchor: point(s.anchorNode, s.anchorOffset),
    focus: point(s.focusNode, s.focusOffset),
    own: diagnostic.contains(s.anchorNode) && diagnostic.contains(s.focusNode)
  };
}, group);
async function selectRange(direction) {
  await run(({ group: group2, direction: direction2 }) => {
    const diagnostic = document.querySelector(group2);
    const meta = diagnostic.querySelector(".studio-warning-technical__meta");
    const body = diagnostic.querySelector(".studio-warning-technical__message");
    meta.scrollIntoView({ block: "nearest" });
    document.activeElement.blur();
    if (direction2 === "forward") document.getSelection().setBaseAndExtent(meta.firstChild, 3, body.firstChild, 14);
    else document.getSelection().setBaseAndExtent(body.firstChild, 14, meta.firstChild, 3);
  }, { group, direction });
  const before = await rangeState();
  assert(before.own && before.text.includes("Error invoking"));
  return before;
}
app.whenReady().then(async () => {
  try {
    await wait(() => BrowserWindow.getAllWindows().length === 1, "own app");
    win = BrowserWindow.getAllWindows()[0];
    await wait(() => !win.webContents.isLoading(), "own renderer load");
    await wait(() => run(() => !!document.querySelector(".start-screen button")), "welcome");
    win.webContents.debugger.attach("1.3");
    await win.webContents.debugger.sendCommand("Emulation.setFocusEmulationEnabled", { enabled: true });
    for (const width of onlyWidth ? [onlyWidth] : [960, 1400]) for (const type of mode === "help" ? ["help-retry"] : mode === "replace" ? ["document-replacement"] : ["pdf-error", "midi-success", "xml-cancel"]) for (const reader of mode === "scroll" ? ["reading", "new-field"] : mode === "range" ? ["forward", "backward", "foreign", "new-field"] : ["help"]) {
      if (companionOnly && type !== companionOnly) continue;
      if (outsideControl && (type !== "pdf-error" || reader !== "reading" || width !== 960)) continue;
      const id = [width, type, reader].join("-");
      stage = "setup " + id;
      console.log("STAGE", stage);
      await scaleText(1);
      await win.webContents.debugger.sendCommand("Emulation.setTouchEmulationEnabled", { enabled: width === 960, maxTouchPoints: 1 });
      const folder = path.join(out, id);
      fs.mkdirSync(folder);
      win.setContentSize(width, 750);
      nativeTheme.themeSource = width === 960 ? "dark" : "light";
      await settle();
      targetOpen = path.join(folder, "origin.chromatics");
      fs.copyFileSync(fixture, targetOpen);
      if (!rows.length) await click("button", "프로젝트 열기");
      else await menu("파일", "프로젝트 열기");
      await acknowledge(targetOpen);
      if (mode === "help") {
        await menu("보기", "악보로 이동");
        await key("ArrowUp");
        const edited = await state();
        assert.equal(edited.history, "1회 수정");
        assert(edited.selection.length > 0);
        assert.notEqual(edited.dirty, "변경 없음");
      }
      await settings();
      let before = await state();
      const companion = path.join(folder, type === "pdf-error" ? "older.pdf" : type === "midi-success" ? "older.mid" : "cancel.musicxml");
      if (type === "pdf-error" || type === "midi-success") {
        if (type === "pdf-error") fs.mkdirSync(companion);
        targetSave = companion;
        holdChannel = type === "pdf-error" ? "pdf:save" : "midi:save";
        held = void 0;
        releaseHeld = void 0;
        stage = "start companion " + id;
        await click("button", type === "pdf-error" ? "PDF 변환" : "MIDI 내보내기");
        await wait(() => !!releaseHeld, "hold actual companion response");
        if (type === "midi-success") assert.equal(fs.readFileSync(companion).subarray(0, 4).toString(), "MThd");
        else assert.equal(held.code, "EISDIR");
      }
      stage = "PNG failure " + id;
      const bad = badDestination(folder);
      const failed = await submitPng(bad);
      assert.equal(failed.code, "EISDIR");
      await wait(async () => (await diagnostics()).count === 1, "current PNG error");
      const density = await scaleText(2);
      const media = await run(() => ({
        coarse: matchMedia("(pointer: coarse)").matches,
        fine: matchMedia("(pointer: fine)").matches,
        dark: matchMedia("(prefers-color-scheme: dark)").matches
      }));
      await focusVisible(toggle);
      await key("Enter");
      const initialToggleFocus = await focus();
      assert(initialToggleFocus.hit && initialToggleFocus.ring);
      assert.equal((await diagnostics()).expanded, "true");
      if (type === "xml-cancel") {
        releasePicker = void 0;
        holdCancelledPicker = true;
        targetSave = companion;
        await click("button", "MusicXML 내보내기");
        await wait(() => !!releasePicker, "hold XML picker");
        await wait(async () => (await diagnostics()).local, "local diagnostic while XML in progress");
        await scaleText(2);
        await focusVisible(toggle);
      }
      await scaleText(2);
      let initial, final, expected;
      if (mode === "scroll") initial = await scrollRead(width === 960 || type === "xml-cancel");
      if (mode === "range" && reader === "foreign") {
        initial = await selectRange("forward");
        await run((group2) => {
          const own = document.querySelector(group2 + " .studio-warning-technical__message").firstChild;
          const foreign = document.querySelector(".studio-status__result");
          document.getSelection().setBaseAndExtent(own, 14, foreign.firstChild, 2);
        }, group);
        initial = await rangeState();
        assert(!initial.own);
      } else if (mode === "range") initial = await selectRange(reader === "new-field" ? "backward" : reader);
      if (reader === "new-field") await focusVisible(field);
      let manualCapture;
      let outsideTop;
      const scoreTitleTop = () => run(() => [...document.querySelectorAll(".score-canvas *")].find(
        (n) => n.textContent === "줄기 숨김 검증 whole main" && n.children.length === 0 && n.checkVisibility()
      )?.getBoundingClientRect().top);
      if (outsideControl) {
        const point = await run((group2) => {
          const footer = document.querySelector(".studio-status").getBoundingClientRect();
          const x = 280, y = Math.min(150, footer.top - 15);
          if (!document.elementFromPoint(x, y) || document.elementFromPoint(x, y).closest(group2)) throw Error("Outside wheel must hit a different surface");
          return { x, y };
        }, group);
        await win.webContents.debugger.sendCommand("Input.dispatchMouseEvent", { type: "mouseWheel", ...point, deltaX: 0, deltaY: -135 });
        await wait(async () => (await readingPosition()).scroll < initial.scroll - 40, "newer manual scroll outside the diagnostic");
        assert((await readingPosition()).toggleFocused);
        outsideTop = await scoreTitleTop();
        assert(typeof outsideTop === "number" && outsideTop >= 0 && outsideTop < 450);
      }
      const beforeCapture = await capture(id + "-before");
      if (type === "help-retry") {
        await menu("도움말", "사용설명서");
        await wait(() => run(() => !!document.querySelector(".studio-manual dialog[open]")), "offline manual");
        await click("button", "문제 해결");
        await run(() => {
          const paragraph = [...document.querySelectorAll(".studio-manual__article p")]
            .find(element => element.textContent.includes("PDF·MIDI·PNG는 같은 내보내기 설정"))
          if (!paragraph) throw Error("Missing PNG retry directions")
          paragraph.scrollIntoView({ block: "center", behavior: "instant" })
        })
        await settle()
        const helpGuidanceVisible = await run(() => {
          const paragraphs = [...document.querySelectorAll(".studio-manual__article p")]
          const paragraph = paragraphs.find(element =>
            element.textContent.includes("PDF·MIDI·PNG는 같은 내보내기 설정"))
          if (!paragraph) return false
          const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
          for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            const offset = text.textContent.indexOf("PNG")
            if (offset < 0) continue
            const range = document.createRange()
            range.setStart(text, offset)
            range.setEnd(text, offset + 3)
            const rect = range.getBoundingClientRect()
            return paragraph.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
          }
          return false
        })
        assert(helpGuidanceVisible)
        manualCapture = await capture(id + "-manual");
        await key("Escape");
        await wait(() => run(() => !document.querySelector(".studio-manual dialog[open]")), "close manual");
        assert(await run(() => document.activeElement?.textContent.trim() === "도움말"));
        final = { helpReturned: true, helpGuidanceVisible };
      } else if (type === "document-replacement") {
        initial = await selectRange("forward");
        const replacement = JSON.parse(fs.readFileSync(fixture, "utf8"));
        replacement.score.title = "새 문서: PNG 진단 소유권 확인";
        targetOpen = path.join(folder, "replacement.chromatics");
        fs.writeFileSync(targetOpen, JSON.stringify(replacement));
        await scaleText(1);
        await menu("파일", "프로젝트 열기");
        await acknowledge(targetOpen);
        assert.equal((await diagnostics()).count, 0);
        assert.equal(await run(() => document.getSelection().toString()), "");
        const title = await run(() => document.title);
        assert(title.includes(replacement.score.title), title);
        await settings();
        before = await state();
        assert.equal((await submitPng(bad)).code, "EISDIR");
        await wait(async () => (await diagnostics()).count === 1, "new document PNG error");
        const current = await diagnostics();
        assert.equal(current.expanded, "false");
        assert.equal(await run(() => document.getSelection().toString()), "");
        assert(!(await focus()).lab.includes("기술 정보"));
        final = { oldDiagnosticCleared: true, newDiagnosticCollapsed: true, title, sourceHash: hash(targetOpen) };
      } else {
        stage = "late response " + id;
        if (type === "xml-cancel") releasePicker();
        else releaseHeld();
        await wait(async () => (await diagnostics()).local === (type !== "xml-cancel"), "diagnostic relocated");
        if (type === "xml-cancel") assert(!fs.existsSync(companion));
        if (type === "pdf-error") assert((await diagnostics()).status.startsWith("PDF 출력을 완료하지"));
        if (type === "midi-success") await acknowledge(companion);
        await settle();
        const current = await diagnostics();
        assert.equal(current.count, 1);
        assert.equal(current.expanded, "true");
        if (mode === "scroll") {
          final = await readingPosition(initial.offset);
          expected = reader === "reading" ? final.marker && final.toggleFocused && !final.selected : (await focus()).lab === "PDF 목표 장수";
        } else {
          final = await rangeState();
          expected = reader === "new-field" ? (await focus()).lab === "PDF 목표 장수" && !final.own : reader === "foreign" ? !final.own : JSON.stringify(initial) === JSON.stringify(final) && await rangeFocusVisible();
          if (expected && ["forward", "backward"].includes(reader)) {
            const prior = await state();
            await key("Space");
            assert.deepEqual(await state(), prior);
            assert.deepEqual(await rangeState(), final);
          }
        }
        if (outsideControl) {
          final.outsideTitleTop = await scoreTitleTop();
          initial.outsideTitleTop = outsideTop;
          expected = !final.toggleFocused && Math.abs(final.outsideTitleTop - outsideTop) <= 2;
        }
        if (reader === "new-field") {
          const measured = await focus();
          assert(measured.hit && measured.ring, JSON.stringify(measured));
        }
      }
      console.log("RESULT", id, JSON.stringify({ initial, final, expected }));
      const afterCapture = await capture(id + "-after");
      if (expectFixed && expected === false) throw Error("Reader position or range lost in " + id);
      await scaleText(1);
      const dest = path.join(folder, "retry.png");
      if (type === "help-retry") {
        await click('[role="combobox"]', "PNG 해상도");
        await click('[role="option"]', "300 dpi");
      }
      await focusVisible('.studio-export-tools button[aria-label="PNG 내보내기"]');
      const retry = await submitPng(dest);
      assert(retry.ok && retry.result.filePath === dest);
      await acknowledge(dest);
      assert.equal((await diagnostics()).count, 0);
      if (reader !== "foreign") assert.equal(await run(() => document.getSelection().toString()), "");
      assert.equal(hash(dest), digest(payloads.at(-1)));
      assert.deepEqual(await state(), before);
      assert.deepEqual(fs.readdirSync(bad), []);
      assert.equal(hash(targetOpen), final?.sourceHash ?? fixtureHash);
      assert.equal(hash(path.join(folder, "origin.chromatics")), fixtureHash);
      const output = pngMetadata(dest);
      const ppm = Math.round((mode === "help" ? 300 : 150) / 0.0254);
      assert.equal(output.xPixelsPerMetre, ppm);
      assert.equal(output.yPixelsPerMetre, ppm);
      let scoreSpace;
      if (mode === "range" && type === "midi-success" && reader === "forward") {
        await menu("보기", "악보로 이동");
        assert(await run(() => document.activeElement.closest(".score-canvas") !== null));
        await key("Space");
        await wait(async () => !(await state()).transport.pauseDisabled, "Space starts score playback");
        await key("Space");
        await wait(async () => (await state()).transport.pauseDisabled, "Space pauses score playback");
        await focusVisible('.studio-playback button[aria-label="정지"]');
        await key("Enter");
        await wait(async () => (await state()).transport.stopDisabled, "explicit transport stop");
        scoreSpace = true;
      }
      rows.push({ id, initial, final, expected, initialToggleFocus, density, media, beforeCapture, afterCapture, manualCapture, output, scoreSpace, before, retrySha256: hash(dest) });
    }
    assert(rows.length > 0, "No production cases selected");
    assert.equal(network.length, 0);
    fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ rows }, null, 2));
    clearTimeout(deadline);
    win.destroy();
    app.quit();
  } catch (error) {
    console.error(stage, error.stack);
    fs.writeFileSync(path.join(out, "failure.json"), JSON.stringify({ stage, error: String(error.stack), rows }, null, 2));
    clearTimeout(deadline);
    if (win && !win.isDestroyed()) win.destroy();
    app.exit(1);
  }
});
