import { ApiError } from './types';


const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';


export async function http<T>(path:string, init?: RequestInit): Promise<T> {
const res = await fetch(`${BASE}${path}`, {
...init,
headers: {
'Content-Type': 'application/json',
...(init?.headers || {})
}
});
if (!res.ok) {
let err: ApiError = { code: 'generic', message: 'Что-то пошло не так' };
try { err = await res.json(); } catch {}
throw err;
}
return res.json() as Promise<T>;
}