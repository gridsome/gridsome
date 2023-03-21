const {
  $refListIn,
  $refListNin,
  $refListEq,
  $refListNe,
  $refListExists,
  $refIn,
  $refNin,
  $refEq,
  $refNe,
  $refExists
} = require('../lokiOps')

test('$refListIn', () => {
  expect($refListIn(['1', '2', '3'], ['2'])).toEqual(true)
  expect($refListIn([{ id: '1' }, { id: '2' }], ['2'])).toEqual(true)
  expect($refListIn([{ id: '5' }, { id: '6' }], ['2'])).toEqual(false)
  expect($refListIn(['5', '6'], ['2'])).toEqual(false)
  expect($refListIn(null, ['2'])).toEqual(false)
  expect($refListIn(null)).toEqual(false)
})

test('$refListNin', () => {
  expect($refListNin(['1', '2', '3'], ['2'])).toEqual(false)
  expect($refListNin([{ id: '1' }, { id: '2' }], ['2'])).toEqual(false)
  expect($refListNin([{ id: '5' }, { id: '6' }], ['2'])).toEqual(true)
  expect($refListNin(['5', '6'], ['2'])).toEqual(true)
  expect($refListNin(null, ['2'])).toEqual(true)
  expect($refListNin(null)).toEqual(true)
})

test('$refListEq', () => {
  expect($refListEq(['1', '2', '3'], '2')).toEqual(true)
  expect($refListEq([{ id: '1' }, { id: '2' }], '2')).toEqual(true)
  expect($refListEq([{ id: '5' }, { id: '6' }], '2')).toEqual(false)
  expect($refListEq(['5', '6'], '2')).toEqual(false)
  expect($refListEq(null, '2')).toEqual(false)
  expect($refListEq(null)).toEqual(false)
})

test('$refListNe', () => {
  expect($refListNe(['1', '2', '3'], '2')).toEqual(false)
  expect($refListNe([{ id: '1' }, { id: '2' }], '2')).toEqual(false)
  expect($refListNe([{ id: '5' }, { id: '6' }], '2')).toEqual(true)
  expect($refListNe(['5', '6'], '2')).toEqual(true)
  expect($refListNe(null, '2')).toEqual(true)
  expect($refListNe(null)).toEqual(true)
})

test('$refListExists', () => {
  expect($refListExists(['1', '2', '3'], false)).toEqual(false)
  expect($refListExists(['1', '2', '3'], true)).toEqual(true)
  expect($refListExists([{ id: '1' }, { id: '2' }], true)).toEqual(true)
  expect($refListExists([{ id: undefined }, { id: undefined }], false)).toEqual(true)
  expect($refListExists([{ id: undefined }, { id: undefined }], true)).toEqual(false)
  expect($refListExists(null, false)).toEqual(false)
  expect($refListExists(null)).toEqual(false)
})

test('$refIn', () => {
  expect($refIn('2', ['1', '2'])).toEqual(true)
  expect($refIn('3', ['1', '2'])).toEqual(false)
  expect($refIn({ id: '2' }, ['1', '2'])).toEqual(true)
  expect($refIn({ id: '3' }, ['1', '2'])).toEqual(false)
  expect($refIn({ id: '3' })).toEqual(false)
})

test('$refNin', () => {
  expect($refNin('2', ['1', '2'])).toEqual(false)
  expect($refNin('3', ['1', '2'])).toEqual(true)
  expect($refNin({ id: '2' }, ['1', '2'])).toEqual(false)
  expect($refNin({ id: '3' }, ['1', '2'])).toEqual(true)
})

test('$refEq', () => {
  expect($refEq('2', '2')).toEqual(true)
  expect($refEq('3', '2')).toEqual(false)
  expect($refEq({ id: '2' }, '2')).toEqual(true)
  expect($refEq({ id: '3' }, '2')).toEqual(false)
  expect($refEq({ id: '3' })).toEqual(false)
  expect($refEq(null)).toEqual(false)
})

test('$refNe', () => {
  expect($refNe('2', '2')).toEqual(false)
  expect($refNe('3', '2')).toEqual(true)
  expect($refNe({ id: '2' }, '2')).toEqual(false)
  expect($refNe({ id: '3' }, '2')).toEqual(true)
  expect($refNe({ id: '3' })).toEqual(true)
  expect($refNe(null)).toEqual(true)
})

test('$refExists', () => {
  expect($refExists('2', false)).toEqual(false)
  expect($refExists('2', true)).toEqual(true)
  expect($refExists(undefined, false)).toEqual(true)
  expect($refExists(undefined, true)).toEqual(false)
  expect($refExists({ id: '2' }, false)).toEqual(false)
  expect($refExists({ id: '2' }, true)).toEqual(true)
  expect($refExists({ id: undefined }, false)).toEqual(true)
  expect($refExists({ id: undefined }, true)).toEqual(false)
  expect($refExists({ id: '2' })).toEqual(false)
  expect($refExists(null, false)).toEqual(false)
  expect($refExists(null)).toEqual(false)
})
