define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var fn = require("./fn");
  var extend = require("../common/extend");
  
  var bus_allocator = {
    audio:2, control:0
  };
  
  var Bus = (function() {
    function Bus(rate, index, numChannels) {
      this.rate  = rate;
      this.index = index;
      this.numChannels = numChannels;
    }
    extend(Bus, cc.Object);
    
    Bus.prototype.asUGenInput = function() {
      return this.index;
    };
    
    return Bus;
  })();

  cc.global.Bus = function() {
  };
  
  cc.global.Bus.control = fn(function(numChannels) {
    var index = bus_allocator.control;
    if (typeof numChannels === "number") {
      if (C.CONTROL_BUS_LEN < bus_allocator.control + numChannels) {
        throw new Error("Bus: failed to get a control bus allocated.");
      }
      bus_allocator.control += numChannels;
    } else {
      numChannels = 0;
    }
    return new Bus(C.AUDIO, index, numChannels);
  }).defaults("numChannels=1").build();
  
  cc.global.Bus.audio = fn(function(numChannels) {
    var index = bus_allocator.audio;
    if (typeof numChannels === "number") {
      if (C.AUDIO_BUS_LEN < bus_allocator.audio + numChannels) {
        throw new Error("Bus: failed to get an audio bus allocated.");
      }
      bus_allocator.audio += numChannels;
    } else {
      numChannels = 0;
    }
    return new Bus(C.AUDIO, index, numChannels);
  }).defaults("numChannels=1").build();
  
  cc.resetBus = function() {
    bus_allocator.audio   = 2;
    bus_allocator.control = 0;
  };
  
  module.exports = {};

});