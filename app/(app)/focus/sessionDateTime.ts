export function toLocalDateTimeValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function datetimeLocalToIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function getDefaultManualSessionRange(referenceDate = new Date()) {
  const end = new Date(referenceDate);
  const start = new Date(referenceDate.getTime() - 25 * 60 * 1000);
  return {
    startedAt: toLocalDateTimeValue(start.toISOString()),
    endedAt: toLocalDateTimeValue(end.toISOString()),
  };
}
