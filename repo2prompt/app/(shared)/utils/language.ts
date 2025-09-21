const extensionMap: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  json: 'JSON',
  go: 'Go',
  rs: 'Rust',
  py: 'Python',
  rb: 'Ruby',
  java: 'Java',
  cs: 'C#',
  cpp: 'C++',
  cxx: 'C++',
  cc: 'C++',
  c: 'C',
  h: 'C/C++ Header',
  php: 'PHP',
  swift: 'Swift',
  kt: 'Kotlin',
  kotlin: 'Kotlin',
  scala: 'Scala',
  sh: 'Shell',
  bash: 'Shell',
  ps1: 'PowerShell',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  md: 'Markdown',
  yml: 'YAML',
  yaml: 'YAML',
  toml: 'TOML',
  sql: 'SQL',
  dockerfile: 'Dockerfile',
  env: 'Env',
};

export function detectLanguage(path: string) {
  const file = path.split('/').pop() ?? '';
  const lower = file.toLowerCase();
  if (lower === 'dockerfile') return 'Dockerfile';
  if (!lower.includes('.')) return 'Other';
  const ext = lower.substring(lower.lastIndexOf('.') + 1);
  return extensionMap[ext] ?? 'Other';
}
