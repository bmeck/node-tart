# node-tart

This is a lower level library

## TarRecord(headers)

Represents the headers of a single record in a tar file.

### Required:

* path - where to place in the tar file
* size - in bytes

### Optional / defaulted:

* mtime - defaults to Date.now()
* uid - defaults to current
* gid - defaults to current
* mode - defaults to umask

### Common Extended Headers (if matching and needs more space will be upgraded automatically)

* path
* comment
* charset
* SCHILY.ino

## new TarReader(stream)

### TarReader.on('entry', function (headerRecord, stream) {...})

Event when a record is encountered.

Backpressure is applied to the stream so in order to skip content use `stream.resume()`.

## new TarWriter()

### TarWriter.stream

Buffered stream to use when consuming this writer.

### TarWriter.createEntry(headers, onReady(err, writableStream))

Tells the writer to queue an entry and callback when we can write.

### TarWriter.createFile(headers, onReady(err, writableStream))

Tells the writer to create a file entry

### TarWriter.createDirectory(headers, onReady(err, writableStream))

Tells the writer to create a directory entry

### TarWriter.end

Write the end of the tar file.
