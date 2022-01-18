const cycleJs = require('../lib/cycle')

test('Decycle generates same string as JSON.stringify()', () => {
  const testObj = {
    'numberHolder': 1234567890,
    'foo': {
      'beta': 'hello'
    },
    'check': {
      'check1': 'here',
      'check2': 'over here',
      'check3': {
        'hello': 'again'
      }
    }
  }
  expect(JSON.stringify(testObj)).toBe(JSON.stringify(cycleJs.decycle(testObj)))
})

test('Cyclic reference key', () => {
  const foo = {
    foo: 'Foo',
    beta: {
      beta: 'beta'
    },
    check: {
      test: [1, 2, 3, 10]
    },
    check2: {
      test: [1, 2, 3, 10]
    }
  }
  // Make sure we haven't lost anything
  const verifyString = '{"foo":"Foo","beta":{"beta":"beta","alpha":{"$ref":"$"}},"check":{"test":[1,2,3,10],"alpha":{"test":[1,2,3,10],"alpha":{"$ref":"$[\\"check\\"]"}}},"check2":{"$ref":"$[\\"check\\"][\\"alpha\\"]"}}'

  foo.beta.alpha = foo
  foo.check.alpha = foo.check2
  foo.check2.alpha = foo.check
  expect(JSON.stringify(cycleJs.decycle(foo))).toBe(verifyString)
})
