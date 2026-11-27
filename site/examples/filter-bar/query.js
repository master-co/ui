/**
 * The demo's query logic, shared by the filter bar and the table view: conditions on a field, an operator and a
 * value, all of which a row must meet (one level of AND), plus search, sort and pages. It reads plain rows and
 * plain fields and touches no element. An application asks its own data source the same questions; this is
 * not a query engine to publish.
 *
 * A field is `{ key, label, type, options? }`: `type` is `text`, `enum`, `number` or `date`, and an enum lists
 * its `options` as `[value, label]`. A date is `YYYY-MM-DD`, so dates compare as text.
 */

/** The operators each type of field offers, in the order a reader meets them: `[name, words]`. */
export const operators = {
  text: [['contains', 'contains'], ['is', 'is'], ['is-not', 'is not'], ['starts', 'starts with']],
  enum: [['is', 'is'], ['is-not', 'is not']],
  number: [['is', 'is'], ['more', 'is more than'], ['less', 'is less than']],
  date: [['on', 'is on'], ['before', 'is before'], ['after', 'is after']],
}

/** @param {{ type: keyof typeof operators }} field */
export const operatorsOf = (field) => operators[field.type]

/** A new condition on a field: its first operator, and a value still to give, even a choice. */
export function condition(field) {
  return { field: field.key, operator: operatorsOf(field)[0][0], value: '' }
}

/**
 * What is wrong with a condition, in words, or null when it can be applied. The input's own validity comes first,
 * so a number field that holds letters is caught as the browser sees it.
 * @param {{ field: string, operator: string, value: string }} given
 * @param {{ type: string, label: string, options?: string[][] }} field
 * @param {ValidityState} [validity]
 */
export function problem(given, field, validity) {
  if (!field) return 'Choose a field.'
  if (!operatorsOf(field).some(([name]) => name === given.operator)) return `Choose how ${field.label.toLowerCase()} compares.`
  const value = String(given.value ?? '').trim()
  if (validity?.badInput) return field.type === 'date' ? `Enter a whole date for ${field.label.toLowerCase()}.` : `Enter a number for ${field.label.toLowerCase()}.`
  if (!value) return field.type === 'enum' ? `Choose a ${field.label.toLowerCase()}, or remove the condition.` : `Enter a value for ${field.label.toLowerCase()}, or remove the condition.`
  if (field.type === 'number' && !Number.isFinite(Number(value))) return `Enter a number for ${field.label.toLowerCase()}.`
  if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return `Enter a whole date for ${field.label.toLowerCase()}.`
  if (field.type === 'enum' && !field.options.some(([option]) => option === value)) return `Choose a ${field.label.toLowerCase()}.`
  return null
}

/** Whether a row meets one condition. */
function meets(row, given, field) {
  const have = row[field.key]
  const want = given.value
  switch (field.type) {
    case 'text': {
      const text = String(have).toLowerCase()
      const term = String(want).trim().toLowerCase()
      if (given.operator === 'contains') return text.includes(term)
      if (given.operator === 'starts') return text.startsWith(term)
      return given.operator === 'is' ? text === term : text !== term
    }
    case 'enum':
      return given.operator === 'is' ? have === want : have !== want
    case 'number': {
      const number = Number(want)
      if (given.operator === 'more') return have > number
      if (given.operator === 'less') return have < number
      return have === number
    }
    case 'date':
      if (given.operator === 'before') return have < want
      if (given.operator === 'after') return have > want
      return have === want
  }
  return true
}

/** The rows that meet every condition. */
export function filter(rows, conditions, fields) {
  const keyed = new Map(fields.map((field) => [field.key, field]))
  return rows.filter((row) => conditions.every((given) => meets(row, given, keyed.get(given.field))))
}

/** The rows whose given text holds what was typed, without regard to case. */
export function search(rows, text, keys) {
  const term = text.trim().toLowerCase()
  if (!term) return rows
  return rows.filter((row) => keys.some((key) => String(row[key]).toLowerCase().includes(term)))
}

/** The rows in the order of one field, ascending or descending; ties keep the order they had. */
export function sort(rows, key, direction = 'ascending') {
  const sign = direction === 'descending' ? -1 : 1
  const compare = (a, b) => typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'en', { numeric: true })
  return [...rows].sort((a, b) => compare(a[key], b[key]) * sign)
}

/** One page of rows, and where it stands among them. A page past the end is the last one. */
export function paginate(rows, page, size) {
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const current = Math.min(Math.max(1, page), pages)
  const start = (current - 1) * size
  return { rows: rows.slice(start, start + size), page: current, pages, from: rows.length ? start + 1 : 0, to: Math.min(start + size, rows.length), total: rows.length }
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** A date as a reader reads it, day first: `13 Nov 2026`. */
export const formatDate = (value) => {
  const [year, month, day] = value.split('-')
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`
}

/** A condition in words, for its chip: `Status is Ready`. */
export function describe(given, field) {
  const words = operatorsOf(field).find(([name]) => name === given.operator)?.[1] ?? given.operator
  const value = field.type === 'enum'
    ? field.options.find(([option]) => option === given.value)?.[1] ?? given.value
    : field.type === 'date' ? formatDate(given.value) : field.type === 'text' ? `“${String(given.value).trim()}”` : given.value
  return `${field.label} ${words} ${value}${field.unit ? ` ${field.unit}` : ''}`
}
