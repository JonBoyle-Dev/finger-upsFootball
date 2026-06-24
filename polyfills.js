// Polyfills for browser APIs missing in Expo Go 54's Hermes engine
if (typeof global.DOMException === 'undefined') {
  global.DOMException = function DOMException(message, name) {
    var err = new Error(message);
    err.name = name || 'DOMException';
    return err;
  };
}

if (typeof global.PerformanceEntry === 'undefined') {
  global.PerformanceEntry = function PerformanceEntry() {};
}

if (typeof global.PerformanceObserver === 'undefined') {
  global.PerformanceObserver = function PerformanceObserver() {
    return { observe: function() {}, disconnect: function() {} };
  };
  global.PerformanceObserver.supportedEntryTypes = [];
}

if (typeof global.PerformanceMark === 'undefined') {
  global.PerformanceMark = function PerformanceMark() {};
}

if (typeof global.PerformanceMeasure === 'undefined') {
  global.PerformanceMeasure = function PerformanceMeasure() {};
}

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = function(obj) { return JSON.parse(JSON.stringify(obj)); };
}

if (typeof global.AbortController === 'undefined') {
  global.AbortController = function AbortController() {
    this.signal = { aborted: false };
    this.abort = function() { this.signal.aborted = true; };
  };
}
