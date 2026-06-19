/// <reference types="vite/client" />

import type { InCApi } from '../../preload'

declare global {
  interface Window {
    inC: InCApi
  }
}

export {}
