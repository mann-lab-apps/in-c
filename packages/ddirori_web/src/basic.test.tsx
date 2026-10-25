import React, { useState } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  Input,
  Item,
  SegmentedControl,
  Tabs,
  Checkbox,
  Switch,
  Select,
  Textarea,
  Accordion,
  Avatar,
  Table,
  Tooltip,
  Button,
  Toast,
  Slider,
  ToggleButton,
} from "./index";
Object.defineProperty(HTMLElement.prototype, "showPopover", {
  configurable: true,
  value(this: HTMLElement) {
    this.style.display = "block";
  },
});
Object.defineProperty(HTMLElement.prototype, "hidePopover", {
  configurable: true,
  value() {},
});
afterEach(cleanup);
const options = [
  { value: "a", label: "악보" },
  { value: "b", label: "준비 중", disabled: true },
  { value: "c", label: "녹음" },
];
describe("basic set behavior", () => {
  it("radio-style segments rove, skip disabled, and use Home/End", () => {
    function Demo() {
      const [value, setValue] = useState("a");
      return (
        <SegmentedControl
          label="보기"
          value={value}
          onChange={setValue}
          options={options}
        />
      );
    }
    render(<Demo />);
    const a = screen.getByRole("radio", { name: "악보" }),
      c = screen.getByRole("radio", { name: "녹음" });
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(document.activeElement).toBe(c);
    expect(c.getAttribute("aria-checked")).toBe("true");
    expect(a.tabIndex).toBe(-1);
    fireEvent.keyDown(c, { key: "Home" });
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(a, { key: "End" });
    expect(document.activeElement).toBe(c);
  });
  it("disabled segment group cannot select", () => {
    const fn = vi.fn();
    render(
      <SegmentedControl
        label="보기"
        value="a"
        options={options}
        onChange={fn}
        disabled
      />,
    );
    fireEvent.click(screen.getByText("녹음"));
    expect(fn).not.toHaveBeenCalled();
    expect(
      screen
        .getAllByRole("radio")
        .every((n) => (n as HTMLButtonElement).disabled),
    ).toBe(true);
  });
  it("tabs associate panels and remove inactive content from interaction", () => {
    function Demo() {
      const [value, setValue] = useState("a");
      return (
        <Tabs
          label="자료"
          value={value}
          onChange={setValue}
          options={options.map((o) => ({
            ...o,
            content: <button>{o.label} 열기</button>,
          }))}
        />
      );
    }
    render(<Demo />);
    const a = screen.getByRole("tab", { name: "악보" }),
      c = screen.getByRole("tab", { name: "녹음" });
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
      a.id,
    );
    fireEvent.keyDown(a, { key: "ArrowRight" });
    expect(document.activeElement).toBe(c);
    expect(screen.queryByRole("button", { name: "악보 열기" })).toBeNull();
    expect(screen.getByRole("button", { name: "녹음 열기" })).toBeTruthy();
  });
  it("manual tabs move focus without activating content", () => {
    const fn = vi.fn();
    render(
      <Tabs
        label="자료"
        value="a"
        onChange={fn}
        activation="manual"
        options={options.map((o) => ({ ...o, content: o.label + " 내용" }))}
      />,
    );
    fireEvent.keyDown(screen.getByRole("tab", { name: "악보" }), {
      key: "End",
    });
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "녹음" }),
    );
    expect(fn).not.toHaveBeenCalled();
    expect(screen.getByRole("tabpanel").textContent).toBe("악보 내용");
  });
  it("readonly input cannot be cleared", () => {
    const clear = vi.fn();
    render(
      <Input label="작품" value="BWV 846" readOnly clearable onClear={clear} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(clear).not.toHaveBeenCalled();
    expect((screen.getByRole("textbox") as HTMLInputElement).readOnly).toBe(
      true,
    );
  });
  it("textarea retains composition text and associates error", () => {
    const change = vi.fn();
    render(
      <Textarea
        label="메모"
        error="이름 필요"
        required
        value=""
        onChange={change}
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById(input.getAttribute("aria-describedby")!)
        ?.textContent,
    ).toBe("이름 필요");
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "한" } });
    expect(change).toHaveBeenCalledTimes(1);
  });
  it("mixed checkbox uses native indeterminate and switch is distinct", () => {
    render(
      <>
        <Checkbox label="일부 선택" indeterminate />
        <Switch label="알림" checked readOnly />
      </>,
    );
    expect(
      (screen.getByRole("checkbox") as HTMLInputElement).indeterminate,
    ).toBe(true);
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true);
  });
  it("select commits a pointer choice, keeps label/help, and returns focus", () => {
    const change = vi.fn();
    render(
      <Select
        label="정렬"
        value="a"
        options={options}
        onChange={change}
        help="보기 순서"
        required
      />,
    );
    const control = screen.getByRole("combobox", { name: /정렬/ });
    expect(control.getAttribute("aria-required")).toBe("true");
    expect(
      document.getElementById(control.getAttribute("aria-describedby")!)
        ?.textContent,
    ).toBe("보기 순서");
    fireEvent.click(control);
    expect(control.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("option", { name: "준비 중" }));
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("option", { name: "녹음" }));
    expect(change).toHaveBeenCalledExactlyOnceWith("c");
    expect(control.textContent).toBe("악보"); // host owns the committed value
    expect(control.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(control);
  });
  it("select explores enabled options without committing and Escape cancels", () => {
    const change = vi.fn();
    render(
      <Select label="정렬" value="a" options={options} onChange={change} />,
    );
    const control = screen.getByRole("combobox");
    control.focus();
    fireEvent.keyDown(control, { key: "ArrowDown" });
    fireEvent.keyDown(control, { key: "ArrowDown" });
    expect(
      document.getElementById(control.getAttribute("aria-activedescendant")!)
        ?.textContent,
    ).toBe("녹음");
    expect(change).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(control);
    fireEvent.keyDown(control, { key: "Escape" });
    expect(control.getAttribute("aria-expanded")).toBe("false");
    expect(change).not.toHaveBeenCalled();
  });
  it("select Home/End, Enter, Space and Tab commit a controlled value", () => {
    function Demo() {
      const [value, setValue] = useState("a");
      return (
        <Select
          label="정렬"
          value={value}
          options={options}
          onChange={setValue}
        />
      );
    }
    render(<Demo />);
    const control = screen.getByRole("combobox");
    fireEvent.keyDown(control, { key: "End" });
    fireEvent.keyDown(control, { key: "Enter" });
    expect(control.textContent).toBe("녹음");
    fireEvent.keyDown(control, { key: "Home" });
    fireEvent.keyDown(control, { key: " " });
    expect(control.textContent).toBe("악보");
    fireEvent.keyDown(control, { key: "End" });
    expect(fireEvent.keyDown(control, { key: "Tab" })).toBe(true);
    expect(control.textContent).toBe("녹음");
    expect(control.getAttribute("aria-expanded")).toBe("false");
  });
  it("select typeahead skips disabled and resets after close", () => {
    const change = vi.fn();
    render(
      <Select label="정렬" value="a" options={options} onChange={change} />,
    );
    const control = screen.getByRole("combobox");
    fireEvent.keyDown(control, { key: "녹" });
    expect(
      document.getElementById(control.getAttribute("aria-activedescendant")!)
        ?.textContent,
    ).toBe("녹음");
    fireEvent.keyDown(control, { key: "Escape" });
    fireEvent.keyDown(control, { key: "악" });
    expect(
      document.getElementById(control.getAttribute("aria-activedescendant")!)
        ?.textContent,
    ).toBe("악보");
    expect(change).not.toHaveBeenCalled();
  });
  it("select cannot open with no enabled options and closes when disabled", () => {
    const change = vi.fn();
    const { rerender } = render(
      <Select label="정렬" value="a" options={[]} onChange={change} />,
    );
    const control = screen.getByRole("combobox");
    fireEvent.click(control);
    expect(control.getAttribute("aria-expanded")).toBe("false");
    rerender(
      <Select
        label="정렬"
        value="a"
        options={options.map((o) => ({ ...o, disabled: true }))}
        onChange={change}
      />,
    );
    fireEvent.keyDown(control, { key: "End" });
    expect(control.getAttribute("aria-expanded")).toBe("false");
    rerender(
      <Select label="정렬" value="a" options={options} onChange={change} />,
    );
    fireEvent.click(control);
    rerender(
      <Select
        label="정렬"
        value="a"
        options={options}
        disabled
        onChange={change}
        error="선택 불가"
      />,
    );
    expect(control.getAttribute("aria-expanded")).toBe("false");
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(change).not.toHaveBeenCalled();
  });
  it("select preserves required form validation and focuses the visible control", () => {
    const { rerender } = render(
      <form>
        <Select
          label="필수 선택"
          value=""
          options={[{ value: "", label: "선택하세요" }, ...options]}
          required
          onChange={() => {}}
        />
      </form>,
    );
    const control = screen.getByRole("combobox");
    fireEvent.invalid(document.querySelector("select")!);
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(control);
    expect(document.querySelector("select")!.validity.valueMissing).toBe(true);
    rerender(
      <form>
        <Select
          label="필수 선택"
          value="a"
          options={options}
          required
          onChange={() => {}}
        />
      </form>,
    );
    expect(control.getAttribute("aria-invalid")).toBe("false");
    expect(document.querySelector("form")!.checkValidity()).toBe(true);
  });
  it("slider delegates real value and has meaningful value text", () => {
    const fn = vi.fn();
    render(<Slider label="음량" value={20} valueText="20%" onChange={fn} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "40" } });
    expect(fn).toHaveBeenCalledWith(40);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe(
      "20%",
    );
  });
  it("toggle requests the opposite value without internal selection", () => {
    const fn = vi.fn();
    render(
      <ToggleButton selected onSelected={fn}>
        고정
      </ToggleButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(fn).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
  it("disabled Item does not open or select and disables action subtree", () => {
    const fn = vi.fn();
    render(
      <Item
        title="자료"
        disabled
        selecting
        onOpen={fn}
        onSelected={fn}
        actions={<Button onClick={fn}>삭제</Button>}
      />,
    );
    fireEvent.click(screen.getByText("자료"));
    expect(fn).not.toHaveBeenCalled();
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(screen.getByText("삭제").parentElement?.hasAttribute("inert")).toBe(
      true,
    );
  });
  it("accordion collapse removes controls from keyboard and accessibility", () => {
    const fn = vi.fn();
    render(
      <Accordion title="정보" open={false} onOpenChange={fn}>
        <input aria-label="메모" />
      </Accordion>,
    );
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(fn).toHaveBeenCalledWith(true);
  });
  it("avatar falls back after image failure", () => {
    render(<Avatar name="김연주" src="broken" />);
    fireEvent.error(document.querySelector("img")!);
    expect(screen.getByRole("img", { name: "김연주" }).textContent).toBe(
      "김연",
    );
  });
  it("table communicates sort and preserves empty header", () => {
    const fn = vi.fn();
    render(
      <Table
        label="파일"
        columns={[{ key: "name", label: "이름", sortable: true }]}
        rows={[]}
        sort={{ key: "name", direction: "ascending" }}
        onSort={fn}
      />,
    );
    expect(screen.getByRole("columnheader").getAttribute("aria-sort")).toBe(
      "ascending",
    );
    expect(screen.getByText("표시할 항목이 없어요")).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(fn).toHaveBeenCalledWith("name");
  });
  it("tooltip is described from the actual control and Escape dismisses", () => {
    render(
      <Tooltip text="사본을 만듭니다">
        <Button onClick={() => {}}>사본</Button>
      </Tooltip>,
    );
    const button = screen.getByRole("button");
    fireEvent.focus(button);
    expect(
      document.getElementById(button.getAttribute("aria-describedby")!)
        ?.textContent,
    ).toBe("사본을 만듭니다");
    fireEvent.keyDown(button, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
  it("toast never takes focus and dismisses through callback", () => {
    const fn = vi.fn();
    render(
      <>
        <input aria-label="이름" />
        <Toast message="저장했어요" onClose={fn} />
      </>,
    );
    const input = screen.getByRole("textbox");
    input.focus();
    expect(screen.getByRole("status").textContent).toBe("저장했어요");
    expect(document.activeElement).toBe(input);
    fireEvent.click(screen.getByRole("button", { name: "알림 닫기" }));
    expect(fn).toHaveBeenCalledOnce();
  });
});
