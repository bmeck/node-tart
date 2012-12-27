var TarRecord = require('./tar.js').TarRecord;
function GNUTarRecord(buffer) {
   TarRecord.call(this);
   if (buffer) {
      this._buffer = buffer.slice(0, 512);
   }
   else {
      this._buffer = new Buffer(512);
      this._buffer.fill(0);
   }
   return this;
}
require('util').inherits(GNUTarRecord, TarRecord);
GNUTarRecord.prototype._buffer = null;
GNUTarRecord.prototype.set = function (name, value) {
   name = (''+name).toLowerCase();
   switch (name) {
      case "type":
         this._write(value, 156, 1);
         break;
      case "path":
         this._write(value, 0, 100);
         break;
      case "mode":
         this._write((+value).toString(8), 100, 7, '0', true);
         break;
      case "mtime":
         this._write((+value).toString(8), 136, 11, '0', true);
         break;
      case "size":
         this._write((+value).toString(8), 124, 11, '0', true);
         break;
      case "linkpath":
         this._write(value, 157, 100);
         break;
      case "uid":
         this._write((+value).toString(8), 108, 7, '0', true);
         break;
      case "gid":
         this._write((+value).toString(8), 116, 7, '0', true);
         break;
      default:
         return false;
   }
   return true;
}
GNUTarRecord.prototype._write = function (value, offset, length, fill, alignRight) {
   this._buffer.fill(fill || 0, offset, offset + length);
   this._buffer.write(value, alignRight ? Math.max(offset + length - value.length, offset) : offset, length);
}
GNUTarRecord.prototype.get = function (name) {
   switch (name) {
      case 'path':
         return this._read(0, 100);
      case 'mode':
         return this._read(100, 8);
      case 'uid':
         return parseInt(this._read(108, 8), 8);
      case 'gid':
         return parseInt(this._read(116, 8), 8);
      case 'size':
         return parseInt(this._read(124, 12), 8);
      case 'mtime':
         return parseInt(this._read(136, 12), 8);
      case 'type':
         return this._read(156, 1);
      case 'linkpath':
         return this._read(157, 100);
   }
   return null;
}
GNUTarRecord.prototype._read = function (offset, length) {
   return this._scrubValue(this._buffer.slice(offset, offset + length)).toString();
}
GNUTarRecord.prototype._scrubValue = function (value) {
   for (var i = 0; i < value.length; i++) {
      if (value[i] === 0) {
         break;
      }
   }
   return value.slice(0, i);
}
GNUTarRecord.prototype.toBuffer = function () {
   this._buffer.write('GNUTar ', 257, 6);
   this._buffer.write('01 ', 263, 2);
   this._doChecksum();
   return this._buffer;
}
GNUTarRecord.prototype._doChecksum = function () {
   this._buffer.write('        ', 148, 8);
   var sum = 0;
   for (var i = 0; i < this._buffer.length; i++) {
      sum += this._buffer[i];
   }
   this._write(sum.toString(8).slice(-6), 148, 6, '0', true);
   this._buffer.write('\x00 ', 154, 2);
}

exports.GNUTarRecord = GNUTarRecord;