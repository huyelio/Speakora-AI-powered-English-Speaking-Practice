import {describe,expect,it} from "vitest";
import {validateAudio} from "./validation";
describe("validateAudio",()=>{it("accepts supported recordings",()=>expect(validateAudio(new File(["audio"],"a.webm",{type:"audio/webm"}))).toBe("webm"));it("rejects unsupported formats",()=>expect(()=>validateAudio(new File(["audio"],"a.wav",{type:"audio/wav"}))).toThrow("Unsupported"));});
