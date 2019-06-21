let isWarming = null

// First run might cause a xmllib error, run safe warmup
// See https://github.com/lovell/sharp/issues/1593
function warmupSharp (sharp) {
  if (isWarming) return isWarming

  const svg = '<svg><rect width="1" height="1" /></svg>'
  const buffer = Buffer.from(svg, 'utf-8')

  sharp.simd(true)

  isWarming = sharp(buffer).metadata().then(() => sharp, () => sharp)

  return isWarming
}

module.exports = {
  warmupSharp
}
