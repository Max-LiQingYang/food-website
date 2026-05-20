const fn = jest.fn((key) => key === 'token' ? 'fake' : null)

test('before clear', () => {
  expect(fn('token')).toBe('fake')
})

test('after clear', () => {
  jest.clearAllMocks()
  expect(fn('token')).toBe('fake')
})
