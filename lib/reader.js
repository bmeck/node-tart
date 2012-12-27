var GNUTarRecord = require('./record/gnu.js').GNUTarRecord;
var UStarRecord = require('./record/ustar.js').UStarRecord;
var EventEmitter = require('events').EventEmitter;
var subStream    = require('./substream').subStream;

function TarReader(rstream) {
   var self = this;
   EventEmitter.call(self);
   self.stream       = rstream;
   self._couldEnd    = false;
   self._pax         = null;
   self._buffered    = '';
   self.globalPax    = {};
   self.localPax     = {};
   self.stream.on('readable', function () {
      self.readChunk();
   });
   return self;
}
require('util').inherits(TarReader, EventEmitter);
TarReader.prototype.readChunk = function () {
   var data = this.stream.read(512);
   if (data) {
      this.onChunk(data);
   }
}
TarReader.prototype.onChunk = TarReader.prototype.onHeaderChunk = function (header) {
   var self = this;
   function gotoHeader() {
      self.onChunk = self.onHeaderChunk;
      self.readChunk();
   }
   if (header.slice(257, 263).toString() === 'ustar ') {
      self._couldEnd = false;
      var record = new UStarRecord(header);
      switch (record.get('type')) {
         case 'g':
            self._pax = self.globalPax;
            break;
         case 'x':
            self._pax = self.localPax;
            break;
         default:
            var tooLate = false;
            var stream;
            self.emit('entry', record, function (cb) {
               //
               // This is required for piping behavior
               //
               if (tooLate) throw new Error('Cannot get a stream after the event has ended');
               //
               // This is due to backpressure without double buffering
               //
               if (stream) throw new Error('Cannot create multiple streams for entry');
               return stream = self.readContent(self._addPax(record), gotoHeader);
            });
            if (!stream) {
               stream = self.readContent(self._addPax(record), gotoHeader);
               stream.on('readable', function () {
                  stream.read();
               });
               stream.read();
            }
            tooLate = true;
            return;
      }
      self.onChunk = this.onPaxChunk;
      self.readChunk();
   }
   else if (header.slice(257, 263).toString() === '\x00\x00\x00\x00\x00\x00') {
      if (self._couldEnd) {
         self.emit('end');
      }
      else {
         self._couldEnd = true;
         self.readChunk();
      }
   }
   else {
      self._couldEnd = false;
      var record = new GNUTarRecord(header);
      var stream = this.readContent(record, gotoHeader);
      var tooLate = false;
      self.emit('entry', record, function (cb) {
         if (tooLate) throw new Error('Cannot get a stream after the event has ended');
         return self.readContent(self._addPax(record), gotoHeader);
      });
      tooLate = true;
   }
}
TarReader.prototype.onPaxChunk = function (data) {
   var lengthPattern = /\d+(?=\D)/g;
   this._buffered += data;
   var match = lengthPattern.exec(this._buffered);
   var index = 0;
   while (match) {
      var length = +match[0];
      index = match.index;
      var end = index + length;
      if (this._buffered.length < end) {
         this.readChunk();
         return;
      }
      else {
         var str = this._buffered.substring(index + match[0].length, end).trim();
         var key_and_value = /([^=]*)[=](.*)/.exec(str);
         var key = key_and_value[1];
         var value = key_and_value[2];
         this._pax[key] = value;
         lengthPattern.lastIndex = end;
         match = lengthPattern.exec(this._buffered);
      }
   }
   this.onChunk = this.onHeaderChunk;
   this.readChunk();
}
TarReader.prototype._addPax = function (record) {
   var combinedPax = {};
   var globalPax = this.globalPax;
   var localPax = this.localPax;
   var usePax = false, usedLocalPax = false;
   Object.keys(globalPax).forEach(function (name) {
      if (name in localPax) {
         return;
      }
      usePax = true;
      combinedPax[name] = globalPax[name];
   });
   Object.keys(localPax).forEach(function (name) {
      usePax = usedLocalPax = true;
      combinedPax[name] = localPax[name];
   });
   if (usePax) {
      record.pax = combinedPax;
      if (usedLocalPax) {
         this.localPax = {};
      }
   }
   return record;
}
TarReader.prototype.readContent = function (record, cb) {
   var length = +record.get('size');
   var stream = subStream(this.stream, length, 512 - (length % 512), cb);
   return stream;
}

exports.TarReader = TarReader;
