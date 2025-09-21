export function formatBytes(bytes: number, fractionDigits = 1) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : fractionDigits)} ${units[index]}`;
}

export function sumSizes(values: Array<number | undefined>) {
  return values.reduce((acc, value) => acc + (value ?? 0), 0);
}
