import { describe, expect, it } from "vitest";
import { parseTextList } from "./hostLists";

describe("parseTextList", () => {
  it("returns undefined when nothing valid is stored so defaults apply", () => {
    expect(parseTextList(null, 10, 20)).toBeUndefined();
    expect(parseTextList("", 10, 20)).toBeUndefined();
    expect(parseTextList("not json", 10, 20)).toBeUndefined();
    expect(parseTextList('{"a":1}', 10, 20)).toBeUndefined();
  });

  it("keeps a deliberately empty list", () => {
    expect(parseTextList("[]", 10, 20)).toEqual([]);
  });

  it("drops invalid entries and enforces the limits", () => {
    const raw = JSON.stringify(["가", "", "  ", 5, "나나나나나", "다", "라"]);
    expect(parseTextList(raw, 2, 3)).toEqual(["가", "다"]);
  });
});
