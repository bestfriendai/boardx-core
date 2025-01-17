import '@testing-library/jest-dom'
import 'jest-canvas-mock'
import polyfill from '/imports/utils/polyfill'

require('fake-indexeddb/auto')
require('dotenv').config()
polyfill()

jest.mock('nanoid', () => {
  return {
    nanoid: jest.fn(() => 'test-id'),
  }
})

// ReactDOM is located inside index.tsx file
// as a result, we need a place for it to render into
const element = document.createElement('div')
element.id = 'root'
document.body.appendChild(element)

