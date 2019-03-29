const csvParse = require('csv-parse/lib/sync')

class CSVTransformer {
  static mimeTypes () {
    return ['text/csv']
  }

  parse (source) {
    const records = csvParse(source, {
      columns: true,
      skip_empty_lines: true
    })

    const fields = { records }

    return { fields }
  }
}

module.exports = CSVTransformer
