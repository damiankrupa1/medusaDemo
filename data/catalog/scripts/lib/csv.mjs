// RFC 4180 CSV helpers (comma separator, CRLF rows, UTF-8 without BOM).
// A BOM would become part of the first header ("﻿Product Id") and
// Medusa rejects unknown columns, so it is never written.

export function csvCell(value) {
  if (value === undefined || value === null) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header, rows) {
  const lines = [header.map(csvCell).join(',')]
  for (const row of rows) {
    lines.push(header.map((column) => csvCell(row[column])).join(','))
  }
  return `${lines.join('\r\n')}\r\n`
}

/** Strict parser: returns { header, rows } and throws on malformed quoting. */
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) {
    throw new Error('CSV starts with a UTF-8 BOM; Medusa would read the first column name incorrectly')
  }
  const records = []
  let record = []
  let field = ''
  let quoted = false
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
        i++
        if (i < text.length && !/[,\r\n]/.test(text[i])) {
          throw new Error(`Unexpected character after closing quote at offset ${i}`)
        }
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      if (field !== '') throw new Error(`Quote inside unquoted field at offset ${i}`)
      quoted = true
      i++
    } else if (ch === ',') {
      record.push(field)
      field = ''
      i++
    } else if (ch === '\r' || ch === '\n') {
      record.push(field)
      records.push(record)
      record = []
      field = ''
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1
    } else {
      field += ch
      i++
    }
  }
  if (quoted) throw new Error('Unterminated quoted field at end of file')
  if (field !== '' || record.length) {
    record.push(field)
    records.push(record)
  }
  const [header, ...data] = records
  return {
    header,
    rows: data.map((cells, index) => {
      if (cells.length !== header.length) {
        throw new Error(`Row ${index + 2}: ${cells.length} cells, header has ${header.length}`)
      }
      return Object.fromEntries(header.map((column, c) => [column, cells[c]]))
    }),
  }
}
