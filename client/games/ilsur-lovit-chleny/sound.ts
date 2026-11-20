export type Reaction = "catch" | "miss" | "defeat";

const preference = "ilsur-arcade-sound";
const notes: Record<Reaction, readonly number[]> = {
  catch: [587, 880],
  miss: [277, 196],
  defeat: [330, 262, 175],
};

export class GameSound {
  private enabled = true;
  private output: { context: AudioContext; volume: GainNode } | undefined;

  constructor(private readonly button: HTMLButtonElement) {
    try {
      this.enabled = localStorage.getItem(preference) !== "off";
    } catch {
      // Play remains available when storage is blocked.
    }
    this.render();
    button.addEventListener("click", () => {
      this.enabled = !this.enabled;
      this.render();
      try {
        localStorage.setItem(preference, this.enabled ? "on" : "off");
      } catch {
        // Keep the selection for the current page.
      }
      this.activate();
    });
  }

  activate() {
    if (!this.enabled) return;
    try {
      if (!this.output) {
        const context = new AudioContext();
        const volume = context.createGain();
        volume.connect(context.destination);
        this.output = { context, volume };
      }
      void this.output.context.resume().catch(() => {});
    } catch {
      // Audio is optional when the browser cannot open an audio output.
    }
  }

  play(reaction: Reaction) {
    if (
      !this.enabled ||
      !this.output ||
      this.output.context.state !== "running"
    )
      return;
    const { context, volume } = this.output;
    const firstBeat = context.currentTime;

    for (const [index, frequency] of notes[reaction].entries()) {
      const start = firstBeat + index * 0.09;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.frequency.value = frequency;
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(0.09, start + 0.012);
      envelope.gain.linearRampToValueAtTime(0, start + 0.11);
      oscillator.connect(envelope).connect(volume);
      oscillator.start(start);
      oscillator.stop(start + 0.11);
    }
  }

  private render() {
    this.button.setAttribute("aria-pressed", String(this.enabled));
    if (this.output) this.output.volume.gain.value = this.enabled ? 1 : 0;
  }
}
