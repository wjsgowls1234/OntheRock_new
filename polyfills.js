'use strict';
if (typeof global.DOMException === 'undefined') {
  global.DOMException = function DOMException(message, name) {
    this.message = message || '';
    this.name = name || 'DOMException';
    this.code = 0;
  };
  global.DOMException.prototype = Object.create(Error.prototype);
  global.DOMException.prototype.constructor = global.DOMException;
}
