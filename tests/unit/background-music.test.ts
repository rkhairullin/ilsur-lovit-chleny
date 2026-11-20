import { afterEach, expect, test, vi } from "vitest";
import { BackgroundMusic } from "../../client/shared/music/player.js";
import { orderMusicTracks } from "../../client/shared/music/playlist.js";

function setup(tracks: string[]) {
  const audio = Object.assign(new EventTarget(), {
    src: "",
    volume: 1,
    play: vi.fn(async () => {}),
    pause: vi.fn(),
  });
  const createAudio = vi.fn(function (src: string) {
    audio.src = src;
    return audio;
  });
  vi.stubGlobal("Audio", createAudio);
  return { audio, createAudio, music: new BackgroundMusic(tracks) };
}

afterEach(() => vi.unstubAllGlobals());

test("orders tracks by name, starts with the first, and wraps after the last", () => {
  const tracks = orderMusicTracks({ "02.mp3": "/second", "01.mp3": "/first" });
  const { music, audio, createAudio } = setup(tracks);
  expect(createAudio).not.toHaveBeenCalled();
  music.start();
  expect(audio.src).toBe("/first");
  expect(audio.play).toHaveBeenCalledTimes(1);
  audio.dispatchEvent(new Event("ended"));
  expect(audio.src).toBe("/second");
  music.pause();
  expect(audio.pause).toHaveBeenCalledTimes(1);
  audio.dispatchEvent(new Event("ended"));
  expect(audio.src).toBe("/first");
  expect(audio.play).toHaveBeenCalledTimes(2);
  music.start();
  expect(audio.src).toBe("/first");
  expect(audio.play).toHaveBeenCalledTimes(3);
  expect(createAudio).toHaveBeenCalledTimes(1);
  audio.dispatchEvent(new Event("ended"));
  expect(audio.src).toBe("/second");
  expect(audio.play).toHaveBeenCalledTimes(4);
});

test("an empty playlist is silent and a rejected play can be retried", async () => {
  const empty = setup([]);
  empty.music.pause();
  empty.music.start();
  expect(empty.createAudio).not.toHaveBeenCalled();

  const { music, audio } = setup(["/first"]);
  audio.play.mockRejectedValueOnce(new Error("Playback blocked"));
  music.start();
  await Promise.resolve();
  music.start();
  expect(audio.play).toHaveBeenCalledTimes(2);
  audio.dispatchEvent(new Event("ended"));
  expect(audio.src).toBe("/first");
});
