// Polyfill DOMException for older Hermes versions
if (typeof (global as any).DOMException === 'undefined') {
  (global as any).DOMException = class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
    }
  };
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
