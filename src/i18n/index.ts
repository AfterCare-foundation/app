// Translations. The English text is the key: `t("Cancel")` returns "Cancel" in
// English and the entry of src/i18n/de.ts in German. A missing German entry
// falls back to English, so nothing ever shows blank. Placeholders are written
// {name} and filled from the second argument.

import { createElement, Fragment, type ReactNode } from "react";

import { de } from "./de";

export type Lang = "en" | "de";
export type Choice = Lang | "auto";

const DICTIONARIES: Record<Lang, Record<string, string>> = { en: {}, de };

/**
 * The phone's preferred language. The Intl locale follows the region format ("English (UK)" with
 * German as language still gives en-GB), so iOS is asked for its language list first.
 */
function phoneTags(): string[] {
  const tags: string[] = [];
  try {
    // Loaded here so the unit tests (plain Node) can import this file.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NativeModules, Platform } = require("react-native") as typeof import("react-native");
    if (Platform.OS === "ios") {
      const settings = NativeModules.SettingsManager?.settings;
      const list: unknown = settings?.AppleLanguages;
      if (Array.isArray(list)) tags.push(...list.filter((x): x is string => typeof x === "string"));
      if (typeof settings?.AppleLocale === "string") tags.push(settings.AppleLocale);
    } else {
      const id: unknown = NativeModules.I18nManager?.localeIdentifier;
      if (typeof id === "string") tags.push(id);
    }
  } catch {
    // fall through to Intl
  }
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    if (tag) tags.push(tag);
  } catch {
    // ignore
  }
  return tags;
}

/** The language the phone is set to, as far as the app supports it. */
export function detectLang(): Lang {
  // The first language the app supports wins, like the system does when picking an app language.
  for (const tag of phoneTags()) {
    const code = tag.toLowerCase().split(/[-_]/)[0];
    if (code === "de") return "de";
    if (code === "en") return "en";
  }
  return "en";
}

let current: Lang = detectLang();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
}

export function resolveChoice(choice: Choice): Lang {
  return choice === "auto" ? detectLang() : choice;
}

/** BCP 47 tag for dates and numbers. */
export function locale(): string {
  return current === "de" ? "de-DE" : "en-GB";
}

/**
 * A key may end in "|context" to tell apart two places where one English word needs two German
 * ones ("Home|place" is the Info toggle, "Home" the tab). English shows the text before the bar.
 */
function template(en: string): string {
  return DICTIONARIES[current][en] ?? en.replace(/\|.*$/, "");
}

export function t(en: string, params?: Record<string, string | number>): string {
  const text = template(en);
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** Like `t`, with elements (for example a bold or underlined word) in place of the placeholders. */
export function rich(en: string, params: Record<string, ReactNode>): ReactNode {
  const parts = template(en).split(/(\{\w+\})/);
  return createElement(
    Fragment,
    null,
    ...parts.map((part, index) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1];
      if (name === undefined || !(name in params)) return part;
      return createElement(Fragment, { key: index }, params[name]);
    }),
  );
}

const SHORT_MONTHS: Record<Lang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  de: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."],
};

const LONG_MONTHS: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
};

export function shortMonths(): string[] {
  return SHORT_MONTHS[current];
}

export function longMonths(): string[] {
  return LONG_MONTHS[current];
}

/** "3 Oct" / "3. Okt.", with the year when asked: "3 Oct 2026" / "3. Okt. 2026". */
export function dayMonth(d: Date, withYear: boolean): string {
  const day = current === "de" ? `${d.getDate()}.` : String(d.getDate());
  const base = `${day} ${SHORT_MONTHS[current][d.getMonth()]}`;
  return withYear ? `${base} ${d.getFullYear()}` : base;
}
