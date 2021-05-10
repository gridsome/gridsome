const { isArray, isPlainObject } = require('lodash')

const refCheckFn = (a, b) => isPlainObject(a)
  ? String(a.id) === String(b)
  : String(a) === String(b)

const $refIn = (a, b) => isArray(b) && b.some(v => refCheckFn(a, v))
const $refNin = (a, b) => !$refIn(a, b)
const $refEq = (a, b) => refCheckFn(a, b)
const $refNe = (a, b) => !$refEq(a, b)
const $refExists = (a, b) => b ? !$refEq(a, undefined) : $refEq(a, undefined)
const $refListIn = (a, b) => isArray(a)
  ? a.some(v => $refIn(v, b))
  : false
const $refListNin = (a, b) => !$refListIn(a, b)
const $refListEq = (a, b) => isArray(a)
  ? a.some(v => $refEq(v, b))
  : false
const $refListNe = (a, b) => !$refListEq(a, [b])
const $refListExists = (a, b) => b ? !$refListEq(a, undefined) : $refListEq(a, undefined)

module.exports = {
  $refIn,
  $refNin,
  $refEq,
  $refNe,
  $refExists,
  $refListIn,
  $refListNin,
  $refListEq,
  $refListNe,
  $refListExists
}
