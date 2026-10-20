// DM-5 / NFR-U2: the diner's and the owner's dictionaries. Thai and Burmese must have every label English has, no blanks, and the right script.
import { describe, it, expect } from "vitest";
import { DICT as DINER, tr, priceLabel, chatLineHeight } from "@/modules/diner/i18n";
import { DICT as OWNER, tr as ownerTr } from "@/modules/owner/i18n";

const THAI = /[฀-๿]/, BURMESE = /[က-႟]/;

// The hero card on top of the diner screen (heroEyebrow, heroPlaceholder, three chips) used to have English text only, so a Thai or Burmese diner saw
// English there (tr() falls back to English). They are translated now. If a label is ever added to English first, list it here; the "known gap" test
// below fails when a listed key gets translated and tells you to remove it, so a gap can never be forgotten or re-opened.
const KNOWN_UNTRANSLATED: string[] = [];

describe("the diner's dictionary", () => {
  const keys = Object.keys(DINER.en);
  const translated = keys.filter((k) => !KNOWN_UNTRANSLATED.includes(k));
  it("Thai and Burmese have every key English has, except the known gap", () => {
    for (const l of ["th", "my"] as const) expect(keys.filter((k) => !(k in DINER[l])), l).toEqual(KNOWN_UNTRANSLATED);
  });
  it("known gap: the list above is exactly the keys that are still missing (remove a key from it when you translate it)", () => {
    for (const k of KNOWN_UNTRANSLATED) { expect(k in DINER.th, `th.${k} is translated now: remove it from KNOWN_UNTRANSLATED`).toBe(false); expect(k in DINER.my, `my.${k} is translated now: remove it from KNOWN_UNTRANSLATED`).toBe(false); }
  });
  it("neither Thai nor Burmese has a key English lacks (a typo would never show)", () => {
    for (const l of ["th", "my"] as const) expect(Object.keys(DINER[l]).filter((k) => !(k in DINER.en)), l).toEqual([]);
  });
  it("no label is empty", () => {
    for (const l of ["en", "th", "my"] as const) for (const k of translated) expect(DINER[l][k].trim().length, `${l}.${k}`).toBeGreaterThan(0);
  });
  it("Thai labels contain Thai letters and Burmese labels Burmese letters", () => {
    expect(translated.filter((k) => !THAI.test(DINER.th[k]))).toEqual([]);
    expect(translated.filter((k) => k !== "allergens" && !BURMESE.test(DINER.my[k]))).toEqual([]);      // the Burmese label "Allergens" is kept in English on purpose (the owner's rule)
  });
  it("Burmese never uses the formal written endings (သည် / ပါသည်) or the female ကျွန်မ / ရှင် in the default voice", () => {
    for (const k of translated) expect(DINER.my[k], k).not.toMatch(/ပါသည်|သည်။|ကျွန်မ|ရှင်(?!း)/);          // ငွေရှင်း (settle the bill) is a word, not the particle
  });
  it("the same punctuation placeholders survive translation (braces, percent signs)", () => {
    for (const k of translated) for (const l of ["th", "my"] as const) expect((DINER[l][k].match(/[{}%]/g) || []).length, `${l}.${k}`).toBe((DINER.en[k].match(/[{}%]/g) || []).length);
  });
  it("tr() falls back to English for a missing label (that is what the gap above shows), and to the key itself when nothing has it", () => {
    expect(tr("th", "soldOut")).toBe(DINER.th.soldOut);
    expect(tr("my", "__no_such_key__")).toBe("__no_such_key__");
  });
});

describe("prices and line height", () => {
  it("English and Thai show ฿ before the number, Burmese shows Burmese digits and ဘတ်", () => {
    expect(priceLabel("en", 180)).toBe("฿ 180");
    expect(priceLabel("th", 50)).toBe("฿ 50");
    expect(priceLabel("my", 180)).toBe("၁၈၀ ဘတ်");
  });
  it("Burmese gets the most line height, then Thai, then English", () => {
    expect(chatLineHeight("my")).toBeGreaterThan(chatLineHeight("th"));
    expect(chatLineHeight("th")).toBeGreaterThan(chatLineHeight("en"));
  });
});

describe("the owner's dictionary", () => {
  it("every key has a non-empty English label", () => {
    for (const [k, v] of Object.entries(OWNER.en)) expect(v.trim().length, k).toBeGreaterThan(0);
  });
  it("Thai and Burmese are not translated yet, so every label falls back to English instead of showing a blank or a key", () => {
    for (const k of Object.keys(OWNER.en)) {
      expect(ownerTr("th", k)).toBe(OWNER.en[k]);
      expect(ownerTr("my", k)).toBe(OWNER.en[k]);
    }
    expect(ownerTr("en", "__nope__")).toBe("__nope__");
  });
  it("every navigation label the dashboard uses exists", () => {
    for (const k of ["navMenu", "navImport", "navHours", "navFaq", "navAi", "navQr", "navInsights", "navStaff", "signOut", "testAssistant", "brand"]) expect(OWNER.en[k], k).toBeTruthy();
  });
});
