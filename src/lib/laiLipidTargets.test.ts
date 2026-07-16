import { describe, it, expect } from "vitest";
import {
  LAI_LIPID_TARGETS,
  resolveLaiTargetKey,
  type LaiTargetKey,
} from "./laiLipidTargets";

describe("LAI 2023 South Asian lipid-target mapping", () => {
  describe("LDL-C (primary target)", () => {
    const cases: Array<[LaiTargetKey, string]> = [
      ["Low",         "<100"],
      ["Moderate",    "<100 (optional <70)"],
      ["High",        "<70"],
      ["Very High",   "<50"],
      ["Extreme-A",   "<50 (optional ≤30)"],
      ["Extreme-B",   "≤30"],
      ["Extreme-C",   "10–15"],
    ];
    it.each(cases)("%s → LDL-C %s", (key, expected) => {
      expect(LAI_LIPID_TARGETS[key].ldl).toBe(expected);
    });
  });

  describe("Non-HDL-C (co-primary target)", () => {
    const cases: Array<[LaiTargetKey, string]> = [
      ["Low",         "<130"],
      ["Moderate",    "<130 (optional <100)"],
      ["High",        "<100"],
      ["Very High",   "<80"],
      ["Extreme-A",   "<80 (optional ≤60)"],
      ["Extreme-B",   "≤60"],
      ["Extreme-C",   "40–45"],
    ];
    it.each(cases)("%s → Non-HDL-C %s", (key, expected) => {
      expect(LAI_LIPID_TARGETS[key].nonHdl).toBe(expected);
    });
  });

  describe("Apo-B (secondary target)", () => {
    const cases: Array<[LaiTargetKey, string]> = [
      ["Low",         "<90"],
      ["Moderate",    "<90"],
      ["High",        "<80"],
      ["Very High",   "<65"],
      ["Extreme-A",   "<65"],
      ["Extreme-B",   "<50"],
      ["Extreme-C",   "—"],
    ];
    it.each(cases)("%s → Apo-B %s", (key, expected) => {
      expect(LAI_LIPID_TARGETS[key].apoB).toBe(expected);
    });
  });

  describe("Formatting conventions", () => {
    it("uses '<' for threshold targets and '≤' for hard-cap targets", () => {
      // Threshold ('<') tiers
      expect(LAI_LIPID_TARGETS.Low.ldl.startsWith("<")).toBe(true);
      expect(LAI_LIPID_TARGETS.High.ldl.startsWith("<")).toBe(true);
      expect(LAI_LIPID_TARGETS["Very High"].ldl.startsWith("<")).toBe(true);
      // Hard-cap ('≤') tier
      expect(LAI_LIPID_TARGETS["Extreme-B"].ldl).toBe("≤30");
      expect(LAI_LIPID_TARGETS["Extreme-B"].nonHdl).toBe("≤60");
    });

    it("Extreme Group C expresses LDL-C and Non-HDL-C as en-dash ranges", () => {
      expect(LAI_LIPID_TARGETS["Extreme-C"].ldl).toMatch(/^\d+–\d+$/);
      expect(LAI_LIPID_TARGETS["Extreme-C"].nonHdl).toMatch(/^\d+–\d+$/);
      // en-dash (U+2013), not hyphen-minus
      expect(LAI_LIPID_TARGETS["Extreme-C"].ldl).toContain("–");
      expect(LAI_LIPID_TARGETS["Extreme-C"].ldl).not.toContain("-");
    });

    it("Moderate & Extreme-A expose optional stricter targets in parentheses", () => {
      expect(LAI_LIPID_TARGETS.Moderate.ldl).toMatch(/\(optional <70\)/);
      expect(LAI_LIPID_TARGETS.Moderate.nonHdl).toMatch(/\(optional <100\)/);
      expect(LAI_LIPID_TARGETS["Extreme-A"].ldl).toMatch(/\(optional ≤30\)/);
      expect(LAI_LIPID_TARGETS["Extreme-A"].nonHdl).toMatch(/\(optional ≤60\)/);
    });

    it("Extreme-C omits an Apo-B target (em-dash placeholder)", () => {
      expect(LAI_LIPID_TARGETS["Extreme-C"].apoB).toBe("—");
    });

    it("LDL-C targets tighten monotonically from Low → Extreme-C", () => {
      // Extract the primary numeric threshold from each label
      const primary = (s: string) => parseInt(s.replace(/[^\d]+/, ""), 10);
      const order: LaiTargetKey[] = [
        "Low", "Moderate", "High", "Very High", "Extreme-A", "Extreme-B", "Extreme-C",
      ];
      const values = order.map((k) => primary(LAI_LIPID_TARGETS[k].ldl));
      // Low=100, Mod=100, High=70, VH=50, EA=50, EB=30, EC=10
      expect(values).toEqual([100, 100, 70, 50, 50, 30, 10]);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
      }
    });
  });

  describe("resolveLaiTargetKey()", () => {
    it("returns null for a pending category", () => {
      expect(resolveLaiTargetKey("Pending")).toBeNull();
    });

    it("passes through non-Extreme categories", () => {
      expect(resolveLaiTargetKey("Low")).toBe("Low");
      expect(resolveLaiTargetKey("Moderate")).toBe("Moderate");
      expect(resolveLaiTargetKey("High")).toBe("High");
      expect(resolveLaiTargetKey("Very High")).toBe("Very High");
    });

    it("maps Extreme + sub-group to the correct Extreme-* key", () => {
      expect(resolveLaiTargetKey("Extreme", "A")).toBe("Extreme-A");
      expect(resolveLaiTargetKey("Extreme", "B")).toBe("Extreme-B");
      expect(resolveLaiTargetKey("Extreme", "C")).toBe("Extreme-C");
    });

    it("defaults to Extreme-A when no sub-group is provided", () => {
      expect(resolveLaiTargetKey("Extreme")).toBe("Extreme-A");
      expect(resolveLaiTargetKey("Extreme", null)).toBe("Extreme-A");
    });
  });
});
