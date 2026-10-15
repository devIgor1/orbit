/** Compare flat form fields with confirmed data, matching the schemas' text trimming. */
export function hasFormChanges(
  values: Readonly<Record<string, string | undefined>>,
  savedValues: Readonly<Record<string, string>>,
) {
  return Object.entries(savedValues).some(([key, savedValue]) =>
    (values[key] ?? savedValue).trim() !== savedValue.trim(),
  )
}
