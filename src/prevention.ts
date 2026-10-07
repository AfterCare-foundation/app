// Time-limited prevention lines for the alert card. Plain TypeScript so the tests can run it.

const HOUR_MS = 60 * 60 * 1000;

/**
 * Time-limited prevention, shown under the alert. Both options only work within about 72 hours
 * of the contact. `contactAt` is when this phone saved the card the alert came through, which
 * stands in for the contact (scans happen 0 to 24 hours after it, so the real contact is never
 * later). Once the card is older than 72 hours the contact is certainly too old and the line is
 * hidden. Otherwise it stays conditional ("If ..."), because the contact may be older than the
 * scan. The date itself is never shown. With no known card the line is shown, conditional.
 * HIV: post-exposure prophylaxis (PEP), ideally within 24 hours, not after 72. Chlamydia and
 * syphilis: doxycycline PEP ("Doxy-PEP"), which some German doctors recommend and others do not;
 * not offered for gonorrhoea, where it works poorly. Wording is for the clinical reviewers to check.
 */
export function preventionNote(
  sti: string,
  contactAt: string | null = null,
  now: number = Date.now(),
): string | null {
  if (contactAt !== null && now - new Date(contactAt).getTime() > 72 * HOUR_MS) {
    return null;
  }
  if (sti === "hiv") {
    return "If it was in the last 72 hours, go to a clinic or emergency room today and ask about HIV PEP. The sooner, the better.";
  }
  if (sti === "chlamydia" || sti === "syphilis") {
    return "If it was in the last 72 hours, ask a clinic whether Doxy-PEP, a preventive antibiotic, is an option for you.";
  }
  return null;
}
