import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { reflectionFor } from "../data/reflectionCopy";
import {
  normalizeShareName,
  parseSharedResult,
  publicShareUrl,
  resultShareUrl,
  sharePayload,
} from "../domain/sharing";
import ReflectionScreen from "../screens/ReflectionScreen";
import ShareControls from "../components/ShareControls";
describe("reflection and sharing", () => {
  it("selects all personalized messages and unanswered defaults", () => {
    expect(reflectionFor({})).toEqual(reflectionFor({ 11: 3, 12: 3 }));
    expect(
      new Set(
        [0, 1, 2, 3].map(
          (i) => reflectionFor({ 12: i as 0 | 1 | 2 | 3 }).primary,
        ),
      ).size,
    ).toBe(4);
    expect(
      new Set(
        [0, 1, 2, 3].map(
          (i) => reflectionFor({ 11: i as 0 | 1 | 2 | 3 }).secondary,
        ),
      ).size,
    ).toBe(4);
  });
  it("shares only a score and optional encoded name, discarding other URL data", () => {
    const url = new URL(
      resultShareUrl("https://faith.example/?answers=secret#/reflection", {
        score: 730,
        name: "아무개 & 친구",
      }),
    );
    expect([...url.searchParams.keys()]).toEqual(["score", "name"]);
    expect(url.hash).toBe("");
    expect(parseSharedResult(url.search)).toEqual({
      score: 730,
      name: "아무개 친구",
    });
    expect(publicShareUrl(url.href)).toBe("https://faith.example/");
    expect(
      sharePayload(url.href, { score: 730, name: "아무개" }).title,
    ).toContain("아무개님의 신앙활동 점수는 730점");
  });
  it.each([
    "?score=0",
    "?score=1001",
    "?score=-5",
    "?score=730.5",
    "?score=0730",
    "?score=1e3",
    "?score=NaN",
    "?score=",
    "?score=730&score=1",
    "?name=친구",
    "?score=730&name=a&name=b",
  ])("rejects invalid or ambiguous shared data %s", (query) =>
    expect(parseSharedResult(query)).toBeNull(),
  );
  it("allows both score endpoints and normalizes control/markup/oversized names", () => {
    expect(parseSharedResult("?score=1")).toEqual({ score: 1, name: "" });
    expect(parseSharedResult("?score=1000")).toEqual({ score: 1000, name: "" });
    expect(normalizeShareName("<b>친구</b>\n\u202E")).toBe("b친구b");
    expect(Array.from(normalizeShareName("가".repeat(100)))).toHaveLength(20);
    expect(() =>
      resultShareUrl("https://faith.example/", { score: 1001, name: "" }),
    ).toThrow(RangeError);
  });
  it("renders personalized reflection without reintroducing score or grade displays", () => {
    const { container } = render(() => (
      <ReflectionScreen
        answers={{ 11: 0, 12: 0 }}
        score={730}
        onRestart={() => {}}
      />
    ));
    expect(screen.getByRole("heading", { name: "측정 불가" })).toBeTruthy();
    expect(screen.getByText(reflectionFor({ 12: 0 }).primary)).toBeTruthy();
    expect(container.querySelector('.score,.grade,[role="meter"]')).toBeNull();
    expect(screen.getByRole("button", { name: "공유하기" })).toBeTruthy();
  });
  it("copies score/name but no answers, with a manual fallback if denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    history.replaceState(null, "", "/?answers=secret#/reflection");
    render(() => <ShareControls score={730} />);
    fireEvent.input(screen.getByRole("textbox", { name: /공유 이름/ }), {
      target: { value: "아무개" },
    });
    await fireEvent.click(screen.getByRole("button", { name: "주소 복사" }));
    const input = (await screen.findByRole("textbox", {
      name: "공유 주소",
    })) as HTMLInputElement;
    const url = new URL(input.value);
    expect(url.searchParams.get("score")).toBe("730");
    expect(url.searchParams.get("name")).toBe("아무개");
    expect(input.value).not.toContain("secret");
  });
  it("shares native score links and handles user cancellation without copying", async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException("cancelled", "AbortError"));
    const writeText = vi.fn();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(() => <ShareControls score={730} />);
    await fireEvent.click(screen.getByRole("button", { name: "공유하기" }));
    expect(share).toHaveBeenCalledWith(
      sharePayload(location.href, { score: 730, name: "" }),
    );
    expect(writeText).not.toHaveBeenCalled();
    delete (navigator as Partial<Navigator>).share;
  });
  it("shares the generic site if opened without a report", () => {
    expect(
      sharePayload("https://faith.example/?answers=secret#/reflection").url,
    ).toBe("https://faith.example/");
    render(() => <ReflectionScreen answers={{}} onRestart={() => {}} />);
    expect(
      screen.getByRole("button", { name: "테스트 공유하기" }),
    ).toBeTruthy();
  });
});

it("includes the chosen name, score and invitation in the share message", () => {
  const named = sharePayload("https://faith.example/", {
    score: 730,
    name: "명하준",
  });
  expect(named.text).toBe(
    "명하준님의 신앙 점수는 730점! 나는 몇 점일까? 내 신앙활동 점수도 확인해 보세요. 숨겨진 의미도 있으니 꼭 확인해 보세요!",
  );
  expect(
    sharePayload("https://faith.example/", { score: 730, name: "" }).text,
  ).toMatch(/^나의 신앙 점수는 730점!/);
  expect(
    sharePayload("https://faith.example/", { score: 730, name: "<하준>" }).text,
  ).toMatch(/^하준님의/);
});
it("copies the personalized invitation and link when native sharing is unavailable", async () => {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  history.replaceState(null, "", "/?answers=secret#/reflection");
  render(() => <ShareControls score={730} />);
  fireEvent.input(screen.getByRole("textbox", { name: /공유 이름/ }), {
    target: { value: "하준" },
  });
  await fireEvent.click(screen.getByRole("button", { name: "공유하기" }));
  const copied = writeText.mock.calls[0][0] as string;
  expect(copied).toContain("하준님의 신앙 점수는 730점!");
  expect(copied).toContain("숨겨진 의미도 있으니 꼭 확인해 보세요!");
  expect(copied).toContain(`${location.origin}/?score=730&name=`);
  expect(copied).not.toContain("secret");
  expect(screen.getByRole("status").textContent).toContain(
    "메시지와 주소를 복사",
  );
  delete (navigator as Partial<Navigator>).share;
});
it("offers a selectable personalized message if both sharing and clipboard access fail", async () => {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: vi.fn().mockRejectedValue(new Error("unavailable")),
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  render(() => <ShareControls score={730} />);
  await fireEvent.click(screen.getByRole("button", { name: "공유하기" }));
  const message = (await screen.findByRole("textbox", {
    name: "공유 메시지",
  })) as HTMLTextAreaElement;
  expect(message.value).toContain("나의 신앙 점수는 730점!");
  expect(message.value).toContain(`${location.origin}/?score=730`);
  expect(message.readOnly).toBe(true);
  delete (navigator as Partial<Navigator>).share;
});
