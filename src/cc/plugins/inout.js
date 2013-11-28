define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  var slice = [].slice;
  
  cc.ugen.specs.In = {
    Klass: cc.MultiOutUGen,
    $ar: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        return cc.ugen.multiNewList(this, [C.AUDIO, numChannels, bus]);
      },
    },
    $kr: {
      defaults: "bus=0,numChannels=1",
      ctor: function(bus, numChannels) {
        return cc.ugen.multiNewList(this, [C.CONTROL, numChannels, bus]);
      }
    },
    init: function(numChannels) {
      this.inputs = slice.call(arguments, 1);
      this.numOfInputs = this.inputs.length;
      return this.initOutputs(numChannels, this.rate);
    }
  };
  
  cc.unit.specs.In = (function() {
    var ctor = function() {
      this._bufLength = cc.server.bufLength;
      if (this.calcRate === C.AUDIO) {
        this.process = next_a;
        this._busOffset = 0;
      } else {
        this.process = next_k;
        this._busOffset = this._bufLength * C.AUDIO_BUS_LEN;
      }
    };
    var next_a = function(inNumSamples, instance) {
      var out = this.outputs[0];
      var bus  = instance.bus;
      var bufLength = this._bufLength;
      var offset = (this.inputs[0][0] * bufLength)|0;
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = bus[offset + i];
      }
    };
    var next_k = function(inNumSamples, instance) {
      var out = this.outputs[0];
      var value = instance.bus[this._busOffset + (this.inputs[0][0]|0)];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = value;
      }
    };
    return ctor;
  })();
  
  cc.ugen.specs.A2K = {
    $kr: {
      defaults: "in=0",
      ctor: function(_in) {
        return cc.ugen.multiNewList(this, [C.CONTROL, _in]);
      }
    }
  };

  cc.unit.specs.A2K = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function() {
      this.outputs[0][0] = this.inputs[0][0];
    };
    return ctor;
  })();
  
  cc.ugen.specs.K2A = {
    $ar: {
      defaults: "in=0",
      ctor: function(_in) {
        return cc.ugen.multiNewList(this, [C.AUDIO, _in]);
      }
    }
  };

  cc.unit.specs.K2A = (function() {
    var ctor = function() {
      this.process = next;
    };
    var next = function(inNumSamples) {
      var out = this.outputs[0];
      var value = this.inputs[0][0];
      for (var i = 0; i < inNumSamples; ++i) {
        out[i] = value;
      }
    };
    return ctor;
  })();
  
  module.exports = {};

});