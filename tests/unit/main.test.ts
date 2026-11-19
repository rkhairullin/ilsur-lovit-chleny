import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listen: vi.fn(),
  close: vi.fn(),
  error: vi.fn(),
  config: vi.fn(),
  loginConfig: vi.fn(),
}));
vi.mock("../../server/app.js", () => ({
  createApp: () => ({
    listen: mocks.listen,
    close: mocks.close,
    log: { error: mocks.error },
  }),
}));
vi.mock("../../server/config.js", () => ({
  readConfig: mocks.config,
  readLoginConfig: mocks.loginConfig,
}));
const exitCode = process.exitCode;
afterEach(() => {
  process.exitCode = exitCode;
  vi.resetAllMocks();
  vi.resetModules();
});

test("entry point starts server with validated settings", async () => {
  mocks.config.mockReturnValue({ host: "127.0.0.1", port: 3000 });
  await import("../../server/main.js");
  expect(mocks.config).toHaveBeenCalledWith(process.env);
  expect(mocks.loginConfig).toHaveBeenCalledWith(process.env);
  expect(mocks.listen).toHaveBeenCalledWith({ host: "127.0.0.1", port: 3000 });
  expect(mocks.close).not.toHaveBeenCalled();
});
test.each(["config", "listen"])(
  "reports %s failure and closes server",
  async (source) => {
    const error = new Error("Cannot start");
    if (source === "config")
      mocks.config.mockImplementation(() => {
        throw error;
      });
    else mocks.listen.mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    await import("../../server/main.js");
    expect(
      source === "config" ? consoleError : mocks.error,
    ).toHaveBeenCalledWith(error);
    consoleError.mockRestore();
    expect(process.exitCode).toBe(1);
    expect(mocks.close).toHaveBeenCalledTimes(source === "config" ? 0 : 1);
  },
);
