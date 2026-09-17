import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let counter = 0;
export function uid(prefix = "id"): string {
  counter = (counter + 1) % 10000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const LATIN_MAP: Record<string, string> = {
  "á": "a", "à": "a", "â": "a", "ä": "a", "ã": "a", "å": "a",
  "é": "e", "è": "e", "ê": "e", "ë": "e",
  "í": "i", "ì": "i", "î": "i", "ï": "i",
  "ó": "o", "ò": "o", "ô": "o", "ö": "o", "õ": "o",
  "ú": "u", "ù": "u", "û": "u", "ü": "u",
  "ç": "c", "ñ": "n", "ß": "ss",
};

export function slugifyLatin(input: string): string {
  let out = input
    .toLowerCase()
    .replace(/[^\u0000-\u007f]/g, " ")
    .replace(/[áàâäãå]/g, (c) => LATIN_MAP[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!out) out = "form";
  return out.slice(0, 60);
}

export function sanitizeIdentifier(input: string): string {
  const out = input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
  if (!out || /^[0-9]/.test(out)) return `t_${out || "form"}`;
  return out.slice(0, 58);
}

const FA_CHAR_MAP: Record<string, string> = {
  "ا": "a", "آ": "a", "أ": "a", "إ": "a", "ء": "",
  "ب": "b", "پ": "p", "ت": "t", "ث": "s",
  "ج": "j", "چ": "ch", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "z", "ر": "r", "ز": "z", "ژ": "zh",
  "س": "s", "ش": "sh", "ص": "s", "ض": "z",
  "ط": "t", "ظ": "z", "ع": "a", "غ": "gh",
  "ف": "f", "ق": "gh", "ک": "k", "ك": "k", "گ": "g",
  "ل": "l", "م": "m", "ن": "n",
  "و": "v", "ؤ": "o", "ه": "h", "ة": "h",
  "ی": "i", "ي": "i", "ئ": "i",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function translitFaToLatin(input: string): string {
  const transliterated = Array.from(input.trim())
    .map((ch) => {
      if (FA_CHAR_MAP[ch] !== undefined) return FA_CHAR_MAP[ch];
      if (/[a-z0-9]/i.test(ch)) return ch.toLowerCase();
      if (/\s/.test(ch)) return "_";
      return "";
    })
    .join("");
  return sanitizeIdentifier(transliterated);
}

export function formatPersianDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatPersianDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function toEnDigits(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

export const WIDTH_CLASS: Record<number, string> = {
  25: "w-1/4",
  33: "w-1/3",
  50: "w-1/2",
  66: "w-2/3",
  75: "w-3/4",
  100: "w-full",
};
