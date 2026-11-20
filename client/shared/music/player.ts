export class BackgroundMusic {
  private audio: HTMLAudioElement | undefined;
  private index = 0;
  private paused = false;

  constructor(private readonly tracks: readonly string[]) {}

  start() {
    const track = this.tracks[0];
    if (!track) return;
    this.paused = false;
    if (this.audio) {
      this.resume();
      return;
    }

    const audio = new Audio(track);
    audio.volume = 0.5;
    audio.addEventListener("ended", () => {
      this.index = (this.index + 1) % this.tracks.length;
      audio.src = this.tracks[this.index]!;
      if (!this.paused) this.resume();
    });
    this.audio = audio;
    this.resume();
  }

  resume() {
    void this.audio?.play().catch(() => {
      // Browser playback restrictions must not interrupt the game.
    });
  }

  pause() {
    this.paused = true;
    this.audio?.pause();
  }
}
