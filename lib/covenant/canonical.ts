// RFC 8785 (JCS) canonical JSON for the value types a COVENANT transaction may hold:
// strings, safe integers, booleans, null, arrays and plain objects. Floats are refused, so
// JCS number formatting never comes into play (money is always integer minor units).
// JCS string escaping is ECMAScript JSON.stringify, and key order is UTF-16 code-unit order,
// which is exactly Array.prototype.sort's default comparison.
export function canonicalize(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('canonicalize: only safe integers are allowed')
    return String(value)
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj)
      .sort()
      .map((k) => {
        if (obj[k] === undefined) throw new Error(`canonicalize: undefined value at ${k}`)
        return `${JSON.stringify(k)}:${canonicalize(obj[k])}`
      })
      .join(',')}}`
  }
  throw new Error(`canonicalize: unsupported type ${typeof value}`)
}
