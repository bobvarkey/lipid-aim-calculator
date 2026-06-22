import { describe, it, expect } from "vitest";
import { classifyLai2023, LAI_TEST_SCENARIOS } from "./laiRiskClassifier";

describe("classifyLai2023 — LAI 2023 risk-tier assignment", () => {
  for (const s of LAI_TEST_SCENARIOS) {
    it(`${s.id}: ${s.title} → ${s.expected}`, () => {
      expect(classifyLai2023(s.input).tier).toBe(s.expected);
    });
  }
});
