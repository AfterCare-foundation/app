// Timing advice shown under a received alert. Plain TypeScript so the tests can run it.
//
// The only date used is the day this phone saved the card the alert came through. It is never
// shown, and neither is "days since contact" or a countdown. Retests are not written into the
// alert: the Home screen shows a reminder when one is due (see `retestDue`).
//
// Each infection has one entry in ADVICE. Where sources differ, the strictest value is used.
// The values are health content: a clinician has to confirm the table before release.
// Sources (checked 2026-10):
//   HIV        BHIVA/BASHH/BIA 2020 https://www.bashh.org/_userfiles/pages/files/hivtesting2020wiley.pdf
//              EACS 2025 https://eacs.sanfordguide.com/en/eacs-hiv/art/eacs-post-exposure-prophylaxis
//              AWMF 055-004 (German PEP guideline)
//              https://register.awmf.org/assets/guidelines/055-004k_S2k_Medikamentoese-Postexpositionsprophylaxe-PEP-nach-HIV-Exposition_2022-04.pdf
//              RKI FAQ (6 and 12 weeks, slightly shorter, so the base stays)
//              https://www.rki.de/SharedDocs/FAQs/DE/HIVAids/FAQ-Liste.html
//   syphilis   BASHH 2024 https://www.bashh.org/_userfiles/pages/files/syphilis_2024.pdf
//              IUSTI 2020 https://iusti.org/wp-content/uploads/2020/11/2020-Syphilis-guideline.pdf
//              6-week check: German AWMF/DSTIG 059-002, known via
//              https://www.rki.de/DE/Aktuelles/Publikationen/RKI-Ratgeber/Ratgeber/Ratgeber_Syphilis.html
//   gonorrhoea BASHH 2025 https://www.bashh.org/_userfiles/pages/files/gc_guideline_2025_final.pdf
//              Swiss guideline https://kssg.guidelines.ch/guideline/1118/de
//   chlamydia  BASHH 2026 https://www.bashh.org/_userfiles/pages/files/bashh_chlamydia_guideline_july_2026.pdf
//              Swiss guideline (same page as above)
//   mpox       WHO, ECDC; STIKO/RKI https://www.rki.de/SharedDocs/FAQs/DE/Impfen/Mpox/FAQ-Liste_gesamt.html
// Doxy-PEP is not suggested on purpose: it can drive antibiotic resistance, and people who use it
// do so without being told by a partner, so the advice would not reach them and would only promote it.
// Hepatitis B has no entry on purpose: the advice depends on vaccination status. HPV has none
// either: the app does not offer it, because no guideline recommends notifying partners.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface AdviceEntry {
  /** Preventive treatment (PEP, vaccine) only helps within this many hours. Null: none. */
  deadlineHours: number | null;
  /** Days after the contact until a test is reliable. Null: no test without symptoms. */
  windowDays: number | null;
  /**
   * Days after the contact when a Home reminder asks for another test, earliest first. HIV adds
   * the day rapid and self-tests become reliable (90); syphilis adds the first check (42).
   */
  retestDays?: number[];
  /** Mpox: how long to watch for symptoms, in days. */
  watchDays?: number;
  /** A clinic may treat before the results are back. */
  treatBeforeResults?: boolean;
  source: string;
  lastReviewed: string;
}

export const ADVICE: Record<string, AdviceEntry> = {
  hiv: {
    deadlineHours: 72,
    windowDays: 45,
    retestDays: [45, 90],
    source: "BHIVA/BASHH/BIA 2020, EACS 2025, AWMF 055-004, RKI FAQ",
    lastReviewed: "2026-10",
  },
  syphilis: {
    deadlineHours: null,
    windowDays: 84,
    retestDays: [42, 84],
    treatBeforeResults: true,
    source: "BASHH 2024, IUSTI 2020, AWMF/DSTIG 059-002 via RKI",
    lastReviewed: "2026-10",
  },
  gonorrhoea: {
    deadlineHours: null,
    windowDays: 21,
    retestDays: [21],
    treatBeforeResults: true,
    source: "BASHH 2025, Swiss guideline",
    lastReviewed: "2026-10",
  },
  chlamydia: {
    deadlineHours: null,
    windowDays: 28,
    retestDays: [28],
    treatBeforeResults: true,
    source: "BASHH 2026, Swiss guideline",
    lastReviewed: "2026-10",
  },
  mpox: {
    deadlineHours: 14 * 24,
    windowDays: null,
    watchDays: 21,
    source: "WHO, ECDC, STIKO/RKI",
    lastReviewed: "2026-10",
  },
};

const DISCLAIMER = "This is general guidance, not a diagnosis. Please see a doctor or a sexual health clinic.";

function startOfUtcDay(iso: string): number | null {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) {
    return null;
  }
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

/**
 * The single line the alert card shows: only for infections with a prevention deadline (HIV
 * PEP 72 hours, mpox vaccine 14 days), and only while that deadline can still be met. The
 * deadline counts from the save time, the latest the contact can have been. Otherwise null.
 */
export function pepLine(sti: string, scannedAt: string | null, now: number = Date.now()): string | null {
  const entry = ADVICE[sti];
  const saved = scannedAt === null ? NaN : new Date(scannedAt).getTime();
  if (!entry || entry.deadlineHours === null || Number.isNaN(saved)) {
    return null;
  }
  if (now - saved > entry.deadlineHours * HOUR_MS) {
    return null;
  }
  return sti === "mpox"
    ? "It may not be too late for a preventive vaccination. Contact a clinic or your doctor today."
    : "It may not be too late for preventive treatment (PEP). Contact a clinic or emergency department today.";
}

/**
 * Short advice lines for a decrypted alert. The contact is taken to be on the day the card was
 * saved. A contact is never after the save, so the save time is the latest it can have been, and
 * a deadline offer (PEP, vaccine) is shown for as long as there is still a chance:
 * until the deadline has passed counted from the save time. Retest dates count from the saved
 * day. Time passes while the alert waits, so call this when the alert is shown, not when it
 * arrives. A card with no date, or an infection without an entry, gets the general line only.
 */
export function adviceLines(sti: string, scannedAt: string | null, now: number = Date.now()): string[] {
  const entry = ADVICE[sti];
  const day = scannedAt === null ? null : startOfUtcDay(scannedAt);
  if (!entry || day === null) {
    return [DISCLAIMER];
  }

  const sinceScanDay = now - day;
  const lines: string[] = [];

  const pep = pepLine(sti, scannedAt, now);
  if (pep !== null) {
    lines.push(pep);
  }

  if (entry.windowDays !== null) {
    if (sinceScanDay >= entry.windowDays * DAY_MS) {
      lines.push("A test now gives a reliable result.");
    } else {
      // The date is not written here: a reminder on the Home screen carries it (see `retestDue`).
      lines.push("Get tested now. A reminder will show on the Home screen when it is time to test again.");
    }
  }

  if (entry.watchDays !== undefined && sinceScanDay < entry.watchDays * DAY_MS) {
    lines.push(`Watch for new symptoms for ${entry.watchDays} days. If any appear, see a doctor.`);
  }

  if (entry.treatBeforeResults) {
    lines.push("A clinic may treat you straight away, before your results.");
  }

  lines.push(DISCLAIMER);
  return lines;
}

/** A retest reminder is held back by a random delay of up to this long, so its time does not give the contact day away. */
export const MAX_RETEST_DELAY_MS = 72 * HOUR_MS;

/**
 * When a reminder should reach the user: the due moment, but never at night. Before 10:00 local
 * it waits for 10:00 that day, after 20:00 for 10:00 the next day.
 */
export function reminderTime(dueMs: number): number {
  const due = new Date(dueMs);
  const hour = due.getHours();
  if (hour >= 10 && hour < 20) {
    return dueMs;
  }
  const day = new Date(due.getFullYear(), due.getMonth(), due.getDate() + (hour >= 20 ? 1 : 0), 10, 0, 0, 0);
  return day.getTime();
}

interface RetestStage {
  days: number;
  /** The day the stage belongs to, before the random delay. */
  baseMs: number;
}

/**
 * The retest stages of an alert that still count. A stage counts only if the alert was opened
 * before its day: someone who opened it later was already told a test is reliable. Counted from
 * the saved day, as in `adviceLines`.
 */
function retestStages(sti: string, scannedAt: string | null, acknowledgedAt: string | null): RetestStage[] {
  const entry = ADVICE[sti];
  const day = scannedAt === null ? null : startOfUtcDay(scannedAt);
  if (!entry?.retestDays || day === null || acknowledgedAt === null) {
    return [];
  }
  const acknowledged = new Date(acknowledgedAt).getTime();
  return entry.retestDays
    .map((days) => ({ days, baseMs: day + days * DAY_MS }))
    .filter((stage) => stage.baseMs > acknowledged);
}

/**
 * The retest reminder the Home screen should show for an alert, as the number of days after the
 * contact it belongs to, or null. A stage is due once its day plus the alert's random delay has
 * come. Dismissing a stage stores its day, so earlier stages and that one stay hidden and a later
 * one (syphilis 42, then 84) can still appear.
 */
export function retestDue(
  sti: string,
  scannedAt: string | null,
  acknowledgedAt: string | null,
  dismissedDays: number,
  now: number = Date.now(),
  delayMs: number = 0,
): number | null {
  return retestDueStage(sti, scannedAt, acknowledgedAt, dismissedDays, now, delayMs)?.days ?? null;
}

/** Like `retestDue`, with the moment the reminder was due (the scheduled time, not the time it is noticed). */
export function retestDueStage(
  sti: string,
  scannedAt: string | null,
  acknowledgedAt: string | null,
  dismissedDays: number,
  now: number = Date.now(),
  delayMs: number = 0,
): { days: number; at: number } | null {
  let due: { days: number; at: number } | null = null;
  for (const stage of retestStages(sti, scannedAt, acknowledgedAt)) {
    const at = reminderTime(stage.baseMs + delayMs);
    if (stage.days > dismissedDays && at <= now) {
      due = { days: stage.days, at };
    }
  }
  return due;
}

/** The local notifications to schedule for an alert that was just opened: the stages still ahead. */
export function retestNotifications(
  sti: string,
  scannedAt: string | null,
  acknowledgedAt: string | null,
  delayMs: number,
  now: number = Date.now(),
): { days: number; at: number }[] {
  return retestStages(sti, scannedAt, acknowledgedAt)
    .map((stage) => ({ days: stage.days, at: reminderTime(stage.baseMs + delayMs) }))
    .filter((item) => item.at > now);
}
