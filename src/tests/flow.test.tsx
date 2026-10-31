import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import App from "../app/App";
import RevealScreen, { revealTiming } from "../screens/RevealScreen";
import EvaluationScreen from "../screens/EvaluationScreen";
import { buildFaithReport } from "../domain/scoring";
import { parseRoute } from "../app/navigation";
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const route = (hash: string) => {
  history.replaceState(null, "", hash);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
describe("complete user flow", () => {
  it("answers, revises, preserves browser navigation, shows report, reveals and restarts", async () => {
    vi.useFakeTimers();
    render(() => <App />);
    await click("내 신앙점수 조회하기");
    await fireEvent.click(screen.getByRole("radio", { name: "4회" }));
    vi.advanceTimersByTime(300);
    await click("이전으로 가기");
    expect(
      (screen.getByRole("radio", { name: "4회" }) as HTMLInputElement).checked,
    ).toBe(true);
    await fireEvent.click(screen.getByRole("radio", { name: "3회" }));
    vi.advanceTimersByTime(300);
    route("#/");
    expect(screen.getByText("당신의 믿음,")).toBeTruthy();
    route("#/questions/1");
    expect(
      (screen.getByRole("radio", { name: "3회" }) as HTMLInputElement).checked,
    ).toBe(true);
    await click("다음 질문");
    for (let question = 2; question <= 12; question++)
      await click("이 질문 건너뛰기");
    expect(
      screen.getByRole("heading", { name: "리포트를 준비하고 있어요" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /건너뛰/ })).toBeNull();
    vi.advanceTimersByTime(2800);
    expect(screen.getByRole("heading", { name: /525\s*점/ })).toBeTruthy();
    expect(
      screen.getByText("활동 분석 · 상세 리포트 펼치기").closest("details")
        ?.open,
    ).toBe(false);
    await fireEvent.click(screen.getByText("활동 분석 · 상세 리포트 펼치기"));
    expect(screen.getAllByRole("meter")).toHaveLength(6);
    await click("이 점수의 의미 확인하기");
    expect(screen.queryByRole("button", { name: /건너뛰/ })).toBeNull();
    vi.advanceTimersByTime(revealTiming.reflection);
    expect(screen.getByRole("heading", { name: "측정 불가" })).toBeTruthy();
    expect(screen.queryByText("525")).toBeNull();
    // Returning through browser history preserves the report and allows revisions.
    route("#/report");
    expect(screen.getByRole("heading", { name: /525\s*점/ })).toBeTruthy();
    route("#/reflection");
    // Flush jsdom focus/selection events; application timers must already be cancelled.
    vi.advanceTimersByTime(0);
    expect(vi.getTimerCount()).toBe(0);
    await click("처음부터 다시 돌아보기");
    await click("내 신앙점수 조회하기");
    expect(
      (screen.getByRole("radio", { name: "4회" }) as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByRole("radio", { name: "3회" }) as HTMLInputElement).checked,
    ).toBe(false);
  });
  it("blocks entirely skipped scoring answers and permits recovery", async () => {
    render(() => <App />);
    await click("내 신앙점수 조회하기");
    for (let question = 1; question <= 12; question++)
      await click("이 질문 건너뛰기");
    expect(screen.getByRole("alert").textContent).toContain("채점 가능한 답변");
    expect(screen.queryByRole("meter")).toBeNull();
    await click("첫 채점 질문으로 돌아가기");
    expect(screen.getByRole("radio", { name: "4회" })).toBeTruthy();
  });
  it("supports direct reflection load and guards report refresh without answers", () => {
    route("#/reflection");
    const view = render(() => <App />);
    expect(screen.getByRole("heading", { name: "측정 불가" })).toBeTruthy();
    view.unmount();
    route("#/report");
    render(() => <App />);
    expect(screen.getByRole("radio", { name: "4회" })).toBeTruthy();
  });
  it("moves keyboard focus to the question on navigation", async () => {
    render(() => <App />);
    await click("내 신앙점수 조회하기");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: /최근 4주/ }),
      ),
    );
  });
  it("cancels evaluation and cleans timers", async () => {
    vi.useFakeTimers();
    const cancelled = vi.fn();
    const view = render(() => (
      <EvaluationScreen onDone={vi.fn()} onCancel={cancelled} />
    ));
    await click("분석 취소 · 답변 수정");
    expect(cancelled).toHaveBeenCalledOnce();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
describe("reveal animation", () => {
  const report = buildFaithReport({ 1: 0 })!;
  it("dissolves the unchanged score, then removes it and completes", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const { container, unmount } = render(() => (
      <RevealScreen report={report} onDone={done} />
    ));
    expect(container.querySelector(".score")?.textContent).toBe("550점");
    vi.advanceTimersByTime(revealTiming.dissolve);
    expect(container.querySelector(".dissolving")).toBeTruthy();
    expect(container.querySelector(".score")?.textContent).toBe("550점");
    vi.advanceTimersByTime(revealTiming.reveal - revealTiming.dissolve);
    expect(screen.getByRole("heading", { name: "측정 불가" })).toBeTruthy();
    expect(container.querySelector(".score,.grade")).toBeNull();
    vi.advanceTimersByTime(revealTiming.reflection - revealTiming.reveal);
    expect(done).toHaveBeenCalledOnce();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("immediately completes with reduced motion and allocates no timers", () => {
    vi.useFakeTimers();
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    const done = vi.fn();
    render(() => <RevealScreen report={report} onDone={done} />);
    expect(done).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
it("normalizes malformed routes and clamps question indices", () => {
  expect(parseRoute("#/questions/999")).toEqual({
    view: "questionnaire",
    question: 12,
  });
  expect(parseRoute("#/questions/0").question).toBe(1);
  expect(parseRoute("#/unknown").view).toBe("landing");
});

it("keeps Q12 manual and clears pending auto-advance when going back", async () => {
  vi.useFakeTimers();
  render(() => <App />);
  await click("내 신앙점수 조회하기");
  await fireEvent.click(screen.getByRole("radio", { name: "4회" }));
  await click("이전으로 가기");
  vi.advanceTimersByTime(1000);
  expect(
    screen.getByRole("button", { name: "내 신앙점수 조회하기" }),
  ).toBeTruthy();
  route("#/questions/12");
  await fireEvent.click(screen.getByRole("radio", { name: "매우 그렇다" }));
  vi.advanceTimersByTime(1000);
  expect(screen.getByRole("button", { name: "결과 확인하기" })).toBeTruthy();
  expect(
    screen.queryByRole("heading", { name: "리포트를 준비하고 있어요" }),
  ).toBeNull();
});
it("shows the shared result first and removes incoming score when starting our own survey", async () => {
  history.replaceState(
    null,
    "",
    "/?score=730&name=%EC%95%84%EB%AC%B4%EA%B0%9C",
  );
  render(() => <App />);
  expect(
    screen.getByRole("heading", { name: "아무개님의 신앙활동 점수" }),
  ).toBeTruthy();
  expect(screen.getByText("730")).toBeTruthy();
  expect(screen.queryByText("영역별 평가 현황")).toBeNull();
  await click("나도 측정해보기");
  expect(location.search).toBe("");
  expect(document.title).toBe("NICE FAITH — 당신의 믿음, 몇 점입니까?");
  expect(screen.getByRole("radio", { name: "4회" })).toBeTruthy();
});
