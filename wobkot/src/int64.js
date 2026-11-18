"use strict";
/* Relapse-compatible int64 for Wobkot adapter (classic script, no modules). */
(function () {
  function sliceBacking(backing, offset) {
    if (offset < 0 || offset > backing.byteLength)
      throw new RangeError("int64: backing overflow");
    return new Uint8Array(
      backing.buffer,
      backing.byteOffset + offset,
      backing.byteLength - offset
    );
  }

  function int64(low, hi) {
    if (!(this instanceof int64)) return new int64(low, hi);
    this.low = (low === undefined ? 0 : low) >>> 0;
    this.hi = (hi === undefined ? 0 : hi) >>> 0;
    this.backing = null;
  }

  int64.prototype.add32 = function (value) {
    var low = (this.low + value) >>> 0;
    var hi = (this.hi + (low < this.low ? 1 : 0)) >>> 0;
    var result = new int64(low, hi);
    if (this.backing !== null) result.backing = sliceBacking(this.backing, value);
    return result;
  };

  int64.prototype.add32inplace = function (value) {
    var low = (this.low + value) >>> 0;
    this.hi = (this.hi + (low < this.low ? 1 : 0)) >>> 0;
    this.low = low;
    if (this.backing !== null) this.backing = sliceBacking(this.backing, value);
  };

  int64.prototype.sub32inplace = function (value) {
    var low = (this.low - value) >>> 0;
    this.hi = (this.hi - (low > this.low ? 1 : 0)) >>> 0;
    this.low = low;
  };

  int64.prototype.toString = function (radix) {
    if (radix === undefined) radix = 16;
    var low = this.low.toString(radix);
    if (this.hi === 0) return low;
    var width = radix === 16 ? 8 : Math.ceil(32 / Math.log2(radix));
    return this.hi.toString(radix) + low.padStart(width, "0");
  };

  globalThis.int64 = int64;
})();
