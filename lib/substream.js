var PassThroughStream = require('readable-stream/passthrough');
function subStream(origin, length) {
   var stream = new PassThroughStream({allowHalfOpen: false});
   function onReadable() {
      if (length <= 0) {
         return;
      }
      if (origin._readableState.length > 0 && origin._readableState.length < length) {
         var data = origin.read();
         stream.write(data);
         length -= data.length;
         return;
      }
      else {
         var data = origin.read(length);
         if (data) {
            length = 0;
            origin.removeListener('readable', onReadable);
            stream.write(data);
            stream.end();
         }
      }
   }
   origin.on('readable', onReadable);
   process.nextTick(function () {
      if (length <= 0) {
         stream.end();
         return;
      }
      onReadable();
   });
   return stream;
}

exports.subStream = subStream;
