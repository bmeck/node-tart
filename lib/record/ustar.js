var GNUTarRecord = require('./gnu.js').GNUTarRecord;
function UStarRecord(buffer) {
   GNUTarRecord.call(this, buffer);
   this.pax = null;
   return this;
}
require('util').inherits(UStarRecord, GNUTarRecord);
UStarRecord.prototype.set = function (name, value) {
   name = (''+name).toLowerCase();
   switch (name) {
      case "path":
         if (value.length > 100) {
            if (value.length > 255) {
               // NEED PAX
               this.set('path', value.substr(0, 255));
               this._PAX('path', value);
            }
            else {
               // USE PREFIX
               this.set('prefix', value.substr(0, 100));
               this.set('path', value.substr(100));
            }
            break;
         }
      default:
         var wasSet = GNUTarRecord.prototype.set.call(this, name, value);
         if (!wasSet) {
            this._PAX(name, value);
         }
         break;
      case "prefix":
         this._write(value, 345, 155);
         break;
      case "uname":
         this._write(value, 265, 32);
         break;
      case "gname":
         this._write(value, 297, 32);
         break;
      case "devmajor":
         this._write((+value).toString(8), 329, 7, '0', true);
         break;
      case "devminor":
         this._write((+value).toString(8), 337, 7, '0', true);
         break;
   }
   return true;
}
UStarRecord.prototype.get = function (name) {
   if (this.pax && name in this.pax) {
      return this.pax[name];
   }
   switch (name) {
      case 'path':
         if (this.pax && this.pax.path) {
            return this.pax.path;
         }
         return this._scrubValue(this.get('prefix')) + GNUTarRecord.prototype.get.call(this, 'path');
      case 'prefix':
         return this._scrubValue(this._buffer.slice(345, 500)).toString();
      case 'uname':
         return this._scrubValue(this._buffer.slice(265, 297)).toString();
      case 'gname':
         return this._scrubValue(this._buffer.slice(297, 329)).toString();
      case 'devmajor':
         return parseInt(this._scrubValue(this._buffer.slice(329, 337)).toString(), 8);
      case 'devminor':
         return parseInt(this._scrubValue(this._buffer.slice(337, 345)).toString(), 8);
      default:
         return GNUTarRecord.prototype.get.call(this, name);
   }
}

UStarRecord.prototype._PAX = function (name, value) {
   this.pax = this.pax || {};
   this.pax[name] = value;
}
UStarRecord.prototype._makePaxBuffer = function () {
   var content = '';
   var headers = this.pax;
   Object.keys(headers).forEach(function (name) {
      var value = headers[name];
      var length = 1 + name.length + 1 + value.length + 1;
      content += (length.toString().length + length) + ' ' + name + ' ' + value + '\n';
   });
   content += '0';
   var buffer = new Buffer(content.length + 512);
   var doppleganger = {
      _buffer: buffer
   }
   this.set.call(doppleganger, 'type', 'x');
   this.set.call(doppleganger, 'path', 'PAXHeader/' + (headers.path.substr(0, 255 - 'PAXHeader/'.length)));
   this.set.call(doppleganger, 'size', content.length);
   this._doChecksum.call(doppleganger);
   buffer.write(content, 512, content.length);
   return buffer;
}
UStarRecord.prototype.toBuffer = function (includePAX) {
   this._write('ustar ', 257, 6);
   this._write('00 ', 263, 2);
   this._doChecksum();
   if (!includePAX || !this.pax) {
     return this._buffer;
   }
   var paxBuffer = this._makePaxBuffer();
   var combined = new Buffer(512  + paxBuffer.length);
   paxBuffer.copy(combined, 0, 0, paxBuffer.length);
   this._buffer.copy(combined, paxBuffer.length, 0, 512);
   return combined;
}

exports.UStarRecord = UStarRecord;
