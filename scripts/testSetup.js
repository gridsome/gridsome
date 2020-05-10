const e2e = process.argv.some(v => v === '--e2e')

process.env.GRIDSOME_TEST = e2e ? 'e2e' : 'unit'
