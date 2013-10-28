define(function(require, exports, module) {
  "use strict";
  
  var cc = require("./cc");
  var extend = require("../common/extend");
  var pack   = require("../common/pack").pack;
  var timer  = require("../common/timer");
  var Timeline = require("./sched").Timeline;
  var node     = require("./node");
  var buffer   = require("./buffer");
  var commands = {};
  
  var SynthClient = (function() {
    function SynthClient() {
      this.klassName = "SynthClient";
      this.sampleRate = 0;
      this.channels   = 0;
      this.strmLength = 0;
      this.bufLength  = 0;
      this.rootNode   = new node.Group();
      this.timeline   = new Timeline(this);
      this.timelineResult  = [];
      this.bufferRequestId = 0;
      this.bufferRequestCallback = {};
      this.phase = 0;
    }
    
    SynthClient.prototype.sendToIF = function() {
      throw "should be overridden";
    };
    SynthClient.prototype.recvFromIF = function(msg) {
      if (msg) {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        }
      }
    };
    SynthClient.prototype.sendToServer = function() {
      throw "should be overridden";
    };
    SynthClient.prototype.recvFromServer = function(msg) {
      if (msg instanceof Int16Array) {
        this.sendToIF(msg);
        return;
      }
      if (msg) {
        var func = commands[msg[0]];
        if (func) {
          func.call(this, msg);
        }
      }
    };
    SynthClient.prototype.pushToTimeline = function(cmd) {
      this.timelineResult.push(cmd);
    };
    SynthClient.prototype.play = function(msg) {
      this.timeline.play();
      this.sendToServer(msg);
    };
    SynthClient.prototype.pause = function(msg) {
      this.sendToServer(msg);
    };
    SynthClient.prototype.reset = function(msg) {
      buffer.reset();
      node.reset();
      timer.reset();
      this.timeline.reset();
      this.sendToServer(msg);
    };
    SynthClient.prototype.requestBuffer = function(path, callback) {
      if (!(typeof path === "string" && typeof callback === "function")) {
        return;
      }
      var requestId = this.bufferRequestId++;
      this.bufferRequestCallback[requestId] = callback;
      this.sendToIF(["/buffer/request", path, requestId]);
    };
    SynthClient.prototype.process = function() {
      throw "should be overridden";
    };
    
    return SynthClient;
  })();
  
  
  var WorkerSynthClient = (function() {
    function WorkerSynthClient() {
      SynthClient.call(this);
      this.sampleRate = C.WORKER_SAMPLERATE;
      this.channels   = C.WORKER_CHANNELS;
      this.strmLength = C.WORKER_STRM_LENGTH;
      this.bufLength  = C.WORKER_BUF_LENGTH;
    }
    extend(WorkerSynthClient, SynthClient);
    
    WorkerSynthClient.prototype.sendToIF = function(msg) {
      postMessage(msg);
    };
    WorkerSynthClient.prototype.process = function() {
      this.timeline.process();
      var timelineResult = this.timelineResult.splice(0);
      this.sendToServer(["/processed", timelineResult]);
    };
    
    return WorkerSynthClient;
  })();
  
  
  var IFrameSynthClient = (function() {
    function IFrameSynthClient() {
      SynthClient.call(this);
      var that = this;
      this.sampleRate = C.IFRAME_SAMPLERATE;
      this.channels   = C.IFRAME_CHANNELS;
      this.strmLength = C.IFRAME_STRM_LENGTH;
      this.bufLength  = C.IFRAME_BUF_LENGTH;
      this.server = new Worker(cc.coffeeColliderPath);
      this.server.onmessage = function(e) {
        that.recvFromServer(e.data);
      };
      require("../common/console").receive(commands);
    }
    extend(IFrameSynthClient, SynthClient);
    
    IFrameSynthClient.prototype.sendToServer = function(msg) {
      this.server.postMessage(msg);
    };
    IFrameSynthClient.prototype.process = function() {
      var timeline = this.timeline;
      var n = this.strmLength / this.bufLength;
      var timelineResult = [];
      while (n--) {
        timeline.process();
        timelineResult = timelineResult.concat(
          this.timelineResult.splice(0), C.DO_NOTHING
        );
      }
      this.sendToServer(["/processed", timelineResult]);
    };
    
    return IFrameSynthClient;
  })();


  var SocketSynthClient = (function() {
    function SocketSynthClient() {
      SynthClient.call(this);
      this.sampleRate = C.SOCKET_SAMPLERATE;
      this.channels   = C.SOCKET_CHANNELS;
      this.strmLength = C.SOCKET_STRM_LENGTH;
      this.bufLength  = C.SOCKET_BUF_LENGTH;
      this.socketPath = null;
    }
    extend(SocketSynthClient, SynthClient);

    SocketSynthClient.prototype.openSocket = function() {
      var that = this;
      var socket   = this.socket = new WebSocket(this.socketPath);
      var pendings = [];
      socket.binaryType = "arraybuffer";
      socket.onopen = function() {
        pendings.forEach(function(msg) {
          socket.send(msg);
        });
        pendings = [];
      };
      socket.onmessage = function(e) {
        // receive a message from the socket-server
        var msg = e.data;
        if (typeof msg !== "string") {
          that.sendToIF(new Int16Array(msg));
          return;
        }
        that.recvFromServer(JSON.parse(msg));
      };
      socket.onclose = function() {
      };
      socket.onerror = function() {
      };
      this.sendToServer = function(msg) {
        if (msg instanceof Uint8Array) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(msg.buffer);
          }
        } else {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(msg));
          } else {
            pendings.push(JSON.stringify(msg));
          }
        }
      };
    };
    SocketSynthClient.prototype.closeSocket = function() {
      this.socket.close();
      this.socket = null;
    };
    SocketSynthClient.prototype.process = function() {
      var timeline = this.timeline;
      var n = this.strmLength / this.bufLength;
      var timelineResult = [];
      while (n--) {
        timeline.process();
        timelineResult = timelineResult.concat(
          this.timelineResult.splice(0), C.DO_NOTHING
        );
      }
      this.sendToServer(["/processed", timelineResult]);
    };
    
    return SocketSynthClient;
  })();
  
  commands["/connected"] = function(msg) {
    this.sendToIF(msg);
  };
  commands["/init"] = function(msg) {
    this.sampleRate = msg[1]|0;
    this.channels   = msg[2]|0;
    this.sendToServer(msg);
  };
  commands["/play"] = function(msg) {
    this.play(msg);
  };
  commands["/pause"] = function(msg) {
    this.pause(msg);
  };
  commands["/reset"] = function(msg) {
    this.reset(msg);
  };
  commands["/process"] = function() {
    this.process();
  };
  commands["/socket/open"] = function() {
    this.openSocket();
  };
  commands["/socket/close"] = function() {
    this.closeSocket();
  };
  commands["/socket/sendToServer"] = function(msg) {
    // receive a message from the client-interface
    this.sendToServer(msg);
  };
  commands["/socket/sendToIF"] = function(msg) {
    // receive a message from the client-interface
    this.sendToIF(msg);
  };
  commands["/execute"] = function(msg) {
    var execId   = msg[1];
    var code     = msg[2];
    var append   = msg[3];
    var data     = msg[4];
    var callback = msg[5];
    if (!append) {
      this.reset(["/reset"]);
    }
    global.DATA   = data;
    global._gltc_ = this.timeline.context;
    var result = eval.call(global, code);
    if (callback) {
      this.sendToIF(["/executed", execId, pack(result)]);
    }
  };
  commands["/buffer/response"] = function(msg) {
    var buffer = msg[1];
    var requestId = msg[2];
    var callback = this.bufferRequestCallback[requestId];
    if (callback) {
      callback(buffer);
      delete this.bufferRequestCallback[requestId];
    }
  };
  commands["/importScripts"] = function(msg) {
    importScripts(msg[1]);
  };
  commands["/console/log"] = function(msg) {
    this.sendToIF(msg);
  };
  commands["/console/debug"] = function(msg) {
    this.sendToIF(msg);
  };
  commands["/console/info"] = function(msg) {
    this.sendToIF(msg);
  };
  commands["/console/warn"] = function(msg) {
    this.sendToIF(msg);
  };
  commands["/console/error"] = function(msg) {
    this.sendToIF(msg);
  };
  commands["/emit/n_end"] = function(msg) {
    var nodeId = msg[1]|0;
    var n = node.get(nodeId);
    if (n) {
      n.emit("end");
    }
  };
  commands["/emit/n_done"] = function(msg) {
    var nodeId = msg[1]|0;
    var tag    = msg[2];
    var n = node.get(nodeId);
    if (n) {
      n.emit("done", tag);
    }
  };
  
  var listener = function(e) {
    var msg = e.data;
    if (msg instanceof Uint8Array) {
      cc.client.sendToServer(msg);
    } else {
      cc.client.recvFromIF(msg);
    }
  };
  
  var install = function() {
    var client;
    switch (cc.opmode) {
    case "socket":
      client = new SocketSynthClient();
      window.onmessage = function(e) {
        e.ports[0].onmessage = listener;
        client.sendToIF = function(msg) {
          e.ports[0].postMessage(msg);
        };
        client.socketPath = e.data;
        window.onmessage = null;
      };
      break;
    case "iframe":
      client = new IFrameSynthClient();
      window.onmessage = function(e) {
        e.ports[0].onmessage = listener;
        client.sendToIF = function(msg) {
          e.ports[0].postMessage(msg);
        };
        window.onmessage = null;
      };
      break;
    default: // "worker"
      client = new WorkerSynthClient();
      global.onmessage = listener;
    }
    timer.init();
    cc.client = client;
  };
  
  module.exports = {
    install: install
  };

});
