#!/usr/bin/env node
//
// dogfood.js file-a file-b file-c
//
// A simple dogfooding service to pipe data in memory from a writer to a reader
//
var fs = require('fs');
var tart = require('./lib/index.js');
var TarWriter = tart.TarWriter;
var TarReader = tart.TarReader;

var IN_FILES = process.argv.slice(2);

var writer = new TarWriter();
//
// Piping a writer to a reader for simple dogfooding
//
new TarReader(writer.stream).on('entry', function (record, stream) {
  var path = record.get('path');
  console.log('FOUND ENTRY FOR:', path);
  //
  // We can dump or manipulate the data here, rewrite it if we want to and pipe it to a new writer
  //
  stream.on('data', function (data) {
    console.log('DATA:', data.toString())
  })
});

var togo = IN_FILES.length;
if (!togo) {
  writer.end();
}
IN_FILES.forEach(function (IN_FILE) {
  var content = fs.readFileSync(IN_FILE).toString();
  console.log('WRITING:', IN_FILE)
  //
  // Simple file creation
  //
  writer.createFile({
    path: IN_FILE,
    size: content.length
  },function (err, stream) {
    stream.end(content);
    
    togo--;
    if (!togo) {
      writer.end();
    }
  });
});