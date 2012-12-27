var GNUTarRecord = require('./record/gnu.js').GNUTarRecord;
var UStarRecord = require('./record/ustar.js').UStarRecord;
var TarRecord = require('./record/tar.js').TarRecord;
var PassThroughStream = require('readable-stream/passthrough');
var WriteableStream = require('readable-stream/writable');

function TarWriter(options) {
   options = options || {};
   this.type = options.type || 'ustar';
   this.defaults = options.defaults || {
      get devmajor() {
         return 0;
      },
      get devminor() {
         return 0;
      },
      get mode() {
         return ~process.umask() & parseInt('777', 8);
      },
      get mtime() {
         return Date.now() / 1000;
      },
      get uid() {
         return process.getuid();
      },
      get gid() {
         return process.getgid();
      }
   }
   this.writeExtendedHeaders = options.writeExtendedHeaders;
   this.stream = new PassThroughStream();
   this.currentStream = null;
   this.queue = [];
   return this;
}
var paddingBuffer = new Buffer(512);
paddingBuffer.fill(0);
TarWriter.prototype.createFile = function (headers) {
   if (headers instanceof TarRecord) {
      headers.set('type', '0');
   }
   else {
      headers.type = '0';
   }
   return this.createEntry.apply(this, arguments);
}
TarWriter.prototype.createLink = function (headers) {
   if (headers instanceof TarRecord) {
      headers.set('type', '1');
   }
   else {
      headers.type = '1';
   }
   return this.createEntry.apply(this, arguments);
}
TarWriter.prototype.createDirectory = function (headers, callback) {
   if (headers instanceof TarRecord) {
      headers.set('type', '5');
   }
   else {
      headers.type = '5';
   }
   return this.createEntry.apply(this, arguments);
}
TarWriter.prototype.createEntry = function (headers, callback) {
   var self = this;
   function onFlush() {
      if (self.currentStream) return;
      var args = self.queue.shift();
      if (!args) return;
      self.stream.write(self.generateRecord(args[0]));
      self.currentStream = new WriteableStream();
      var amountWritten = 0;
      self.currentStream._write = function (str, cb) {
         var result = self.stream.write(str);
         amountWritten += str.length;
         cb(null);
         return result;
      }
      self.currentStream.pipe(self.stream, {end: false});
      function addPadding() {
         self.currentStream = null;
         var toWrite = amountWritten % 512;
         if (toWrite) {
            self.stream.write(paddingBuffer.slice(toWrite));
         }
         process.nextTick(onFlush);
      }
      self.currentStream.on('finish', addPadding).on('end', addPadding).on('close', addPadding);
      args[1](null, self.currentStream);
   }
   this.queue.push([headers, callback]);
   process.nextTick(onFlush);
}
TarWriter.prototype.generateRecord = function (headers) {
   var record;
   if (headers instanceof TarRecord) {
      record = headers;
   }
   else {
      record = new (this.type == 'ustar' ? UStarRecord : GNUTarRecord)();
      var self = this;
      Object.keys(headers).forEach(function (name) {
         record.set(name, headers[name]);
      });
      Object.keys(self.defaults).forEach(function (name) {
         if (!(name in headers)) record.set(name, self.defaults[name]);
      })
   }
   return record.toBuffer(this.writeExtendedHeaders);
}
TarWriter.prototype.end = function () {
   this.stream.write(paddingBuffer);
   this.stream.end(paddingBuffer);
}

exports.TarWriter = TarWriter;
