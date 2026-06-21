// The two syllabus schemes, in display order. Shared so the Resource Hub and
// the AI Tutor always offer the same options and match the database's
// year_scheme values ("2024_and_after" / "2023_and_before").
// Note: the `id` values are kept as-is (they match the database's year_scheme
// column and the API); only the display `label` is shown to users.
export const yearSchemes = [
  { id: "2024_and_after", label: "2025" },
  { id: "2023_and_before", label: "2023" },
];
