// The infections a person can name. This is the only list: the sender picks
// from it, the wire carries the `id`, and the receiver shows the label of an id
// it knows. Anything else, including text from a modified app, reads as a
// generic STI. Common one-word names, not medical terms. Edit here only.

export interface StiOption {
  /** Goes on the wire. Never change an id once released; add new ones. */
  id: string;
  /** What people see, starting with a capital. */
  label: string;
  /** Shorter name for chips, when the full label is long. */
  chipLabel?: string;
  /** Shown as a chip on the Notify screen; the rest sit under "More…". */
  common: boolean;
}

// Chips (`common`) are the infections most often found in men who have sex with
// men in Germany; the rest sit under "More…". Sources: BRAHMS cohort (German
// MSM at higher risk, 2019: Mycoplasma genitalium 18.8%, chlamydia 12.7%,
// gonorrhoea 9.9%, syphilis 4.3%), RKI/LAGeSo surveillance for Berlin (syphilis
// 35.7 per 100,000 in 2024, most cases in MSM). HIV is a chip despite low
// prevalence because notifying is time-sensitive (post-exposure treatment).
// Mpox (Berlin-concentrated, declining) sits under "More…". Herpes and HPV are
// left out: past partners gain nothing from being told (IUSTI 2024 European
// guideline on the management of partners, page 6).
export const STI_OPTIONS: readonly StiOption[] = [
  { id: "chlamydia", label: "Chlamydia", common: true },
  { id: "gonorrhoea", label: "Gonorrhoea", common: true },
  { id: "syphilis", label: "Syphilis", common: true },
  { id: "mycoplasma", label: "Mycoplasma genitalium", chipLabel: "Mycoplasma", common: true },
  { id: "hiv", label: "HIV", common: true },
  { id: "mpox", label: "Mpox", common: false },
  { id: "hepatitis_a", label: "Hepatitis A", common: false },
  { id: "hepatitis_b", label: "Hepatitis B", common: false },
  { id: "hepatitis_c", label: "Hepatitis C", common: false },
  { id: "trichomoniasis", label: "Trichomoniasis", common: false },
  { id: "shigella", label: "Shigella", common: false },
  { id: "scabies", label: "Scabies", common: false },
  { id: "lice", label: "Pubic Lice", common: false },
];

/** The wire value for "Don't specify". */
export const UNSPECIFIED_STI = "other";

/** Short name for a chip. */
export function chipText(option: StiOption): string {
  return option.chipLabel ?? option.label;
}

/** The option for an id, or null for the generic type and for anything unknown. */
export function findSti(id: string): StiOption | null {
  return STI_OPTIONS.find((option) => option.id === id) ?? null;
}
