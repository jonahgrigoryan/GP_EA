import { describe, it, expect } from "vitest";
import { chapters, checklistData } from "../lib/chapters";

describe("chapters data", () => {
  it("should have 10 chapters", () => {
    expect(chapters).toHaveLength(10);
  });

  it("each chapter should have required fields", () => {
    for (const chapter of chapters) {
      expect(chapter.id).toBeGreaterThan(0);
      expect(chapter.title).toBeTruthy();
      expect(chapter.description).toBeTruthy();
      expect(chapter.readTime).toBeTruthy();
      expect(chapter.icon).toBeTruthy();
      expect(chapter.sections.length).toBeGreaterThan(0);
    }
  });

  it("chapter IDs should be sequential from 1 to 10", () => {
    const ids = chapters.map((c) => c.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("each section should have heading and body", () => {
    for (const chapter of chapters) {
      for (const section of chapter.sections) {
        expect(section.heading).toBeTruthy();
        expect(section.body).toBeTruthy();
      }
    }
  });

  it("section types should be valid", () => {
    const validTypes = ["tip", "warning", "steps", undefined];
    for (const chapter of chapters) {
      for (const section of chapter.sections) {
        expect(validTypes).toContain(section.type);
      }
    }
  });
});

describe("checklistData", () => {
  it("should have 5 categories", () => {
    expect(checklistData).toHaveLength(5);
  });

  it("each category should have items with id and label", () => {
    for (const cat of checklistData) {
      expect(cat.category).toBeTruthy();
      expect(cat.items.length).toBeGreaterThan(0);
      for (const item of cat.items) {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
      }
    }
  });

  it("all item IDs should be unique", () => {
    const ids = checklistData.flatMap((cat) => cat.items.map((i) => i.id));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("total items should be 20 (4 per category)", () => {
    const total = checklistData.reduce(
      (sum, cat) => sum + cat.items.length,
      0
    );
    expect(total).toBe(20);
  });
});
