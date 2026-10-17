import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

export async function transcodeToAzureWav(audio: Blob, signal?: AbortSignal): Promise<Buffer> {
  if (!ffmpegPath) throw new Error("FFmpeg binary is unavailable.");
  const executablePath: string = ffmpegPath;
  const input = Buffer.from(await audio.arrayBuffer());
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(executablePath, [
      "-hide_banner", "-loglevel", "error", "-i", "pipe:0",
      "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-f", "wav", "pipe:1",
    ], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"], ...(signal ? { signal } : {}) });
    const output: Buffer[] = [];
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 2_000) stderr += chunk.toString("utf8");
    });
    child.once("error", () => reject(new Error("Audio conversion failed.")));
    child.once("close", (code: number | null) => {
      if (code !== 0) return reject(new Error(`Audio conversion failed${stderr.trim() ? ": invalid audio input" : ""}.`));
      resolve(Buffer.concat(output));
    });
    child.stdin.end(input);
  });
}
