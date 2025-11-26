import { describe, it, expect } from 'vitest'

describe('API', () => {
  it('fetches user data', async () => {
    const response = await fetch('https://api.example.com/user')
    const data = await response.json()

    expect(data).toEqual({
      id: 'c7b3d8e0-5e0b-4b0f-8b3a-3b9f4b3d3b3d',
      firstName: 'John',
      lastName: 'Maverick',
    })
  })
})
