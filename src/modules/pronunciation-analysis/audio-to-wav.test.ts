import { describe, expect, it } from "vitest";
import { transcodeToAzureWav } from "./audio-to-wav";

describe("transcodeToAzureWav", () => {
  it("produces a mono 16 kHz PCM WAV buffer", async () => {
    const source = pcmWav(8_000, 2, 100);
    const output = await transcodeToAzureWav(new Blob([source], { type: "audio/wav" }));

    expect(output.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(output.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(output.readUInt16LE(22)).toBe(1);
    expect(output.readUInt32LE(24)).toBe(16_000);
    expect(output.readUInt16LE(34)).toBe(16);
  });
});

function pcmWav(sampleRate: number, channels: number, durationMs: number) {
  const samples = Math.floor(sampleRate * durationMs / 1_000);
  const dataLength = samples * channels * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVEfmt ", 8, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataLength, 40);
  return buffer;
}
