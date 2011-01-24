var events = require('events');

var StreamStream = function () {
  this._closed = false; this._emitted = false;
  this._paused = false;
  this._chunks = [];
  this._substream = undefined;
};
StreamStream.prototype = new events.EventEmitter();
(function () {
  this.readable = true;
  this.writeable = true;

  this.end = function () {
    this._closed = true;
    if (!this._paused && !this._chunks.length && !this._substream) {
      this.emit('end');
      this._emitted = true;
    }
  };

  this.pause = function () {
    if (!this._paused) {
      this._paused = true;
      if (this._substream) {
        this._substream.pause();
      }
    }
  };
  this.resume = function () {
    if (this._paused) {
      this._paused = false;
      if (this._substream) {
        this._substream.resume();
      } else {
        this._drain();
      }
    }
  };

  this._drain = function () {
    if (this._paused) {
      //no-op;
    } else {
      var chunk;
      while ((chunk = this._chunks.shift()) != undefined) {
        if (chunk instanceof events.EventEmitter) {
          this._startSubstream(chunk);
          break;
        } else {
          this.emit('data', chunk);
        }
      }
      if (chunk == undefined) {
        if (this._closed && !this._paused) {
          this.emit('end');
          this._emitted = true;
        }
      }
    }
  };
  this._startSubstream = function (stream) {
    this._substream = stream;

    var self = this;
    stream.on('data', function (chunk) {
      self.emit('data', chunk);
    });
    stream.on('end', function () {
      self._substream = undefined;
      self._drain();
    });

    stream.resume();
  };

  this.write = function (stringOrStream) {
    if (this._closed) {
      throw new Error("Attempt to write to a closed Stream");
    }
    if (stringOrStream instanceof events.EventEmitter) {
      this._writeStream(stringOrStream);
    } else {
      this._writeString(stringOrStream);
    }
  };
  this._writeStream = function (stream) {
    if (!this._substream && !this._paused) {
      this._startSubstream(stream);
    } else {
      stream.pause();
      this._chunks.push(stream);
    }
  };
  this._writeString = function (string) {
    if (!this._substream && !this._paused) {
      this.emit('data', string);
    } else {
      this._chunks.push(string);
    }
  };

}.call(StreamStream.prototype));

exports.StreamStream = StreamStream;
