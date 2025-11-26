import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Home from './page'

describe('Home Page', () => {
  it('renders welcome message', () => {
    render(<Home />)
    expect(screen.getByText('Welcome to Next.js')).toBeInTheDocument()
  })

  it('increments counter', () => {
    render(<Home />)
    const incrementButton = screen.getByText('Increment')
    const counterValue = screen.getByText('0') // Assuming initial state is 0

    expect(counterValue).toBeInTheDocument()
    
    fireEvent.click(incrementButton)
    
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
