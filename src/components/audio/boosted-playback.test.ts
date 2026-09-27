import { describe, expect, it, vi } from "vitest";
import { boostMediaElement } from "./boosted-playback";

describe("boostMediaElement", () => {
  it("routes playback through a boosted gain and compressor", async () => {
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const gain = { connect: vi.fn(), disconnect: vi.fn(), gain: { value: 1 } };
    const compressor = { connect: vi.fn(), disconnect: vi.fn() };
    const destination = {};
    const context = {
      destination,
      createMediaElementSource: vi.fn(() => source),
      createGain: vi.fn(() => gain),
      createDynamicsCompressor: vi.fn(() => compressor),
      resume: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    };
    const audio = { volume: 0.4 } as HTMLAudioElement;

    const release = boostMediaElement(audio, () => context, 1.6);

    expect(audio.volume).toBe(1);
    expect(gain.gain.value).toBe(1.6);
    expect(source.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(compressor);
    expect(compressor.connect).toHaveBeenCalledWith(destination);
    expect(context.resume).toHaveBeenCalledOnce();

    release();
    await Promise.resolve();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(gain.disconnect).toHaveBeenCalledOnce();
    expect(compressor.disconnect).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
  });
});
