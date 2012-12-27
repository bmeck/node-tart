//
// Create a stream that consumes a future part an existing stream
//

var ReadableStream = require('readable-stream');
function subStream(origin, length, pad, end) {
   var stream = new ReadableStream({allowHalfOpen: false});
   var readPadding = false;
   function _readPadding() {
      if (pad === 0) {
         end();
         return;
      }
      if (readPadding) return;
      var data = origin.read(pad);
      if (data) {
         readPadding = true;
         end();
      }
      else {
         origin.once('readable', _readPadding);
      }
   }
   stream._read = function _read(size, cb) {
      if (!length) {
         cb(null, null);
         process.nextTick(function () {
            _readPadding();
         });
         return;
      }
      var data = origin.read(Math.min(size, length));
      if (data) {
         length -= data.length;
         cb(null, data);
         if (!length) {
            process.nextTick(function () {
               cb(null, null);
               process.nextTick(function () {
                  _readPadding();
               });
            })
         }
      }
      else {
         origin.once('readable', _read.bind(this, size, cb));
      }
   }
   return stream;
}

exports.subStream = subStream;
