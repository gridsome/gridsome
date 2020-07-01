module.exports = (meta) => {
  let showLineNumbersLocal = false
  let numberLinesStartAt = 1

  if (meta.split(`{`).length > 1) {
    const [, ...options] = meta.split(`{`)

    options.forEach(option => {
      const splitOption = option
        .slice(0, -1)
        .replace(/ /g, ``)
        .split(`:`)

      if (
        splitOption.length === 2 &&
        splitOption[0] === 'numberLines' &&
        (
          splitOption[1].trim() === 'true' ||
          Number.isInteger(parseInt(splitOption[1].trim(), 10))
        )
      ) {
        showLineNumbersLocal = true
        numberLinesStartAt = splitOption[1].trim() !== 'true'
          ? parseInt(splitOption[1].trim(), 10)
          : 1
      }
    })
  }

  return {
    showLineNumbersLocal,
    numberLinesStartAt
  }
}
