import { describe, it, expect } from "vitest";
import { parseVoterToken, VOTER_COOKIE } from "@/lib/voter";

describe("parseVoterToken", () => {
  it("reads token from cookie header", () => {
    expect(parseVoterToken(`${VOTER_COOKIE}=abc123; other=1`)).toBe("abc123");
  });

  it("returns null when missing", () => {
    expect(parseVoterToken("other=1")).toBeNull();
  });
});
