define(function(require, exports, module) {
  "use strict";

  var cc = require("../cc");
  
  cc.ugen.specs.RLPF = {
    ar: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.AUDIO, _in, freq, rq).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,freq=440,rq=1,mul=1,add=0",
      ctor: function(_in, freq, rq, mul, add) {
        return this.init(C.CONTROL, _in, freq, rq).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.RHPF = cc.ugen.specs.RLPF;

  cc.ugen.specs.Lag = {
    ar: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return this.init(C.AUDIO, _in, lagTime).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,lagTime=0.1,mul=1,add=0",
      ctor: function(_in, lagTime, mul, add) {
        return this.init(C.CONTROL, _in, lagTime).madd(mul, add);
      }
    },
  };

  cc.ugen.specs.Lag2 = cc.ugen.specs.Lag;
  cc.ugen.specs.Lag3 = cc.ugen.specs.Lag;
  cc.ugen.specs.Ramp = cc.ugen.specs.Lag;

  cc.ugen.specs.LagUD = {
    ar: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return this.init(C.AUDIO, _in, lagTimeU, lagTimeD).madd(mul, add);
      }
    },
    kr: {
      defaults: "in=0,lagTimeU=0.1,lagTimeD=0.1,mul=1,add=0",
      ctor: function(_in, lagTimeU, lagTimeD, mul, add) {
        return this.init(C.CONTROL, _in, lagTimeU, lagTimeD).madd(mul, add);
      }
    }
  };
  
  cc.ugen.specs.Lag2UD = cc.ugen.specs.LagUD;
  cc.ugen.specs.Lag3UD = cc.ugen.specs.LagUD;
  
  module.exports = {};

});
