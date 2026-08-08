import {describe,expect,it} from "vitest";
import {createGuestCredentials,tokenMatches} from "./auth";
describe("guest session token",()=>{it("stores a verifiable hash, not the token",()=>{const c=createGuestCredentials();expect(c.hash).not.toBe(c.token);expect(tokenMatches(c.token,c.hash)).toBe(true);expect(tokenMatches(`${c.token}x`,c.hash)).toBe(false);});});
