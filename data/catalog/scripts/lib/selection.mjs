// `--ids FS-0001,FS-0002` limits a script to these catalog products, e.g. to
// import a few products as a test before the whole catalog. Without it the
// scripts work on every product in catalog.json.

export function selectProducts(products, args = process.argv.slice(2)) {
  const i = args.indexOf('--ids')
  if (i < 0) return products
  const ids = [...new Set((args[i + 1] ?? '').split(',').map((id) => id.trim()).filter(Boolean))]
  if (!ids.length) throw new Error('--ids needs a comma-separated list of catalog ids, e.g. --ids FS-0001,FS-0002')
  const byId = new Map(products.map((p) => [p.id, p]))
  const unknown = ids.filter((id) => !byId.has(id))
  if (unknown.length) throw new Error(`--ids: not in catalog.json: ${unknown.join(', ')}`)
  return ids.map((id) => byId.get(id))
}
