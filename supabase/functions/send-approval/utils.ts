export function formatPrice(value: number | string | null) {
  if (value == null) return "";

  return Number(value).toLocaleString("ru-RU");
}

export function formatMileage(value: number | null) {
  if (!value) return "";

  return value.toLocaleString("ru-RU");
}

export function chunkArray<T>(array: T[], size: number): T[][] {

  const result: T[][] = [];

  for (let i = 0; i < array.length; i += size) {

    result.push(array.slice(i, i + size));

  }

  return result;

}

export function isValidUrl(url: unknown): url is string {

  return (
    typeof url === "string" &&
    url.trim().startsWith("https://")
  );

}