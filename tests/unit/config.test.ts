import { expect, test } from "vitest";
import { readConfig } from "../../server/config.js";

test("defaults bind only to loopback", () => {
  expect(readConfig({})).toEqual({ host: "127.0.0.1", port: 3000 });
});
test.each(["1", "65535", "3001"])("accepts valid port %s", (port) => {
  expect(readConfig({ HOST: "0.0.0.0", PORT: port })).toEqual({
    host: "0.0.0.0",
    port: Number(port),
  });
});
test.each(["", "0", "65536", "-1", "1.5", "abc", "Infinity"])(
  "rejects invalid port %s",
  (port) => {
    expect(() => readConfig({ PORT: port })).toThrow("PORT must be an integer");
  },
);
test.each(["", "   "])("rejects blank host", (host) => {
  expect(() => readConfig({ HOST: host })).toThrow("HOST must not be empty");
});
