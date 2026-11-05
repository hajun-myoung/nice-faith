import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import App from "../app/App";
import { parseRoute } from "../app/navigation";
import { textLength, validateEntry } from "../domain/guestbook";
const ok = (data: unknown) =>
  ({ ok: true, json: async () => data }) as Response;
const empty = { entries: [], nextCursor: null };
const id = "entry_12345678901234567890",
  token = "x".repeat(43);
function mockFetch() {
  return vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok(empty)));
}
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
const input = (name: string | RegExp, value: string) =>
  fireEvent.input(screen.getByRole("textbox", { name }), { target: { value } });
const navigate = (hash: string) => {
  history.pushState(null, "", hash);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
afterEach(() => vi.unstubAllGlobals());
describe("guestbook screen", () => {
  it("uses shared Unicode character counting and never submits hidden community names", () => {
    expect(textLength("  🙏 ")).toBe(1);
    expect(
      validateEntry({
        visitType: "personal",
        nickname: "",
        community: "숨긴 모임",
        message: "🙏".repeat(300),
        consent: true,
        website: "",
      }).input?.community,
    ).toBe("");
  });
  it("opens from landing, reads no preview there, and distinguishes an outage from empty", async () => {
    mockFetch();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    render(() => <App />);
    expect(fetch).not.toHaveBeenCalled();
    await click("함께 돌아본 발자취");
    await screen.findByRole("alert");
    expect(screen.queryByText("아직 첫 발자취를 기다리고 있어요.")).toBeNull();
    await click("목록 다시 시도");
    expect(
      await screen.findByText("아직 첫 발자취를 기다리고 있어요."),
    ).toBeTruthy();
  });
  it("validates inline, preserves failed input, retries the exact request, and gives a private deletion link", async () => {
    mockFetch();
    history.replaceState(null, "", "#/guestbook");
    render(() => <App />);
    await screen.findByText("아직 첫 발자취를 기다리고 있어요.");
    await click("발자취 남기기");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(
      false,
    );
    await click("공개 동의하고 등록하기");
    expect(screen.getByText("공개와 저장 안내에 동의해 주세요.")).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
    await input(/한마디/, "<script>alert(1)</script>");
    await fireEvent.change(screen.getByLabelText("방문 유형"), {
      target: { value: "community" },
    });
    await input(/교회·모임명/, "숨긴 모임");
    await fireEvent.change(screen.getByLabelText("방문 유형"), {
      target: { value: "visitor" },
    });
    await fireEvent.click(screen.getByRole("checkbox"));
    vi.mocked(fetch).mockRejectedValueOnce(new Error("response lost"));
    await click("공개 동의하고 등록하기");
    await screen.findByRole("alert");
    expect(
      (screen.getByRole("textbox", { name: /한마디/ }) as HTMLTextAreaElement)
        .value,
    ).toContain("<script>");
    vi.mocked(fetch).mockResolvedValueOnce(ok({ id, token }));
    await click("공개 동의하고 등록하기");
    expect(await screen.findByText("발자취를 남겼습니다.")).toBeTruthy();
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[1][1]?.body).toEqual(calls[2][1]?.body);
    const sent = JSON.parse(calls[2][1]!.body as string);
    expect(sent.input).toEqual({
      visitType: "visitor",
      nickname: "",
      community: "",
      message: "<script>alert(1)</script>",
      consent: true,
      website: "",
    });
    expect(sent).not.toHaveProperty("score");
    const link = screen.getByRole("textbox", {
      name: "삭제용 비공개 링크",
    }) as HTMLInputElement;
    expect(link.value).toBe(
      `${location.origin}/#/guestbook/delete/${id}/${token}`,
    );
    expect(location.hash).toBe("#/guestbook");
  });
  it("blocks duplicate clicks while submitting and warns on dirty navigation and refresh", async () => {
    mockFetch();
    history.replaceState(null, "", "#/guestbook");
    render(() => <App />);
    await click("발자취 남기기");
    await input(/한마디/, "마음에 남아요");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await click("← 돌아가기");
    expect(location.hash).toBe("#/guestbook");
    navigate("#/");
    expect(location.hash).toBe("#/guestbook");
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    await fireEvent.click(screen.getByRole("checkbox"));
    let resolve!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise<Response>((done) => {
        resolve = done;
      }),
    );
    await click("공개 동의하고 등록하기");
    expect(
      (screen.getByRole("button", { name: "등록 중…" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await fireEvent.submit(
      screen.getByRole("button", { name: "등록 중…" }).closest("form")!,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    resolve(ok({ id, token }));
    await screen.findByText("발자취를 남겼습니다.");
    confirm.mockReturnValue(true);
    await click("← 돌아가기");
    expect(location.hash).toBe("#/");
  });
  it("renders plain text, requests cursor pages, and reports a reason without hiding the entry", async () => {
    mockFetch();
    history.replaceState(null, "", "#/guestbook");
    const entry = {
      id,
      visitType: "community",
      community: "",
      nickname: "봄날",
      message: "<img src=x onerror=alert(1)> https://example.com",
      date: "2026-11-05",
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      ok({ entries: [entry], nextCursor: "cursor_next" }),
    );
    const view = render(() => <App />);
    await screen.findByText(entry.message);
    expect(
      view.container.querySelector(".guestbook-entry img, .guestbook-entry a"),
    ).toBeNull();
    expect(screen.getByText(/교회·모임과 함께 ·/)).toBeTruthy();
    await click("봄날님의 글 신고");
    await fireEvent.change(screen.getByLabelText("신고 사유"), {
      target: { value: "spam" },
    });
    vi.mocked(fetch).mockResolvedValueOnce(ok({ ok: true }));
    await click("신고 접수하기");
    await screen.findByText("신고를 접수했습니다. 운영자가 검토합니다.");
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string),
    ).toEqual({ action: "report", id, reason: "spam" });
    expect(screen.getByText(entry.message)).toBeTruthy();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "목록 위치가 만료되었습니다." }),
    } as Response);
    await click("더 보기");
    await screen.findByRole("alert");
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/guestbook?cursor=cursor_next",
        expect.any(Object),
      ),
    );
    await click("처음부터 다시 보기");
    await screen.findByText("아직 첫 발자취를 기다리고 있어요.");
    expect(screen.queryByText(entry.message)).toBeNull();
  });
  it("preserves questionnaire answers across a guestbook detour and starts from reflection before sharing", async () => {
    mockFetch();
    render(() => <App />);
    await click("내 신앙점수 조회하기");
    await fireEvent.click(screen.getByRole("radio", { name: "4회" }));
    navigate("#/reflection");
    const write = screen.getByRole("button", {
      name: "마음에 남은 한 문장 남기기",
    });
    const shareHeading = screen.getByRole("heading", {
      name: "나의 결과를 친구와 함께",
    });
    expect(
      write.compareDocumentPosition(shareHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await fireEvent.click(write);
    await click("← 돌아가기");
    expect(screen.getByRole("heading", { name: "측정 불가" })).toBeTruthy();
    navigate("#/questions/1");
    expect(
      (screen.getByRole("radio", { name: "4회" }) as HTMLInputElement).checked,
    ).toBe(true);
  });
  it("gives deletion routes priority over incoming shared-result query parameters, and deletes only on confirmation", async () => {
    mockFetch();
    history.replaceState(
      null,
      "",
      `/?score=730#/guestbook/delete/${id}/${token}`,
    );
    expect(parseRoute(location.hash, location.search).view).toBe(
      "guestbook-delete",
    );
    render(() => <App />);
    expect(fetch).not.toHaveBeenCalled();
    vi.mocked(fetch).mockResolvedValueOnce(ok({ ok: true }));
    await click("확인하고 영구 삭제하기");
    await screen.findByText("발자취가 삭제되었습니다.");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/guestbook");
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string),
    ).toEqual({ action: "delete", id, token });
    expect(location.href).not.toContain(token);
  });
});
