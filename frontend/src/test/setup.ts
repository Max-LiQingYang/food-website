import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: { pathname: '/', search: '', hash: '' },
})

// Mock Notification API
class MockNotification {
  static permission = 'default'
  static requestPermission() { return Promise.resolve('granted') }
  constructor() {}
}
vi.stubGlobal('Notification', MockNotification)

// Mock AudioContext
class MockAudioContext {
  createOscillator() {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 880 },
    }
  }
  createGain() {
    return {
      connect: vi.fn(),
      gain: { value: 0.3 },
    }
  }
  get currentTime() { return 0 }
  get destination() { return {} }
}
vi.stubGlobal('AudioContext', MockAudioContext)