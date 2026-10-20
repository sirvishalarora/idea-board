import { describe, it, expect } from "vitest";
import { blurb } from "@/lib/blurb";

describe("blurb", () => {
  it("returns short text unchanged", () => {
    expect(blurb("Hello")).toBe("Hello");
  });

  it("truncates long text to ~120 chars with ellipsis", () => {
    const long = "a".repeat(200);
    const result = blurb(long, 120);
    expect(result.length).toBeLessThanOrEqual(121);
    expect(result.endsWith("…")).toBe(true);
  });
});
