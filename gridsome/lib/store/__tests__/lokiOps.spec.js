const {
  $refListIn,
  $refListNin,
  $refListEq,
  $refListNe,
  $refIn,
  $refNin,
  $refEq,
  $refNe
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
