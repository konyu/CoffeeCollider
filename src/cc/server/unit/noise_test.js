define(function(require, exports, module) {
  "use strict";
  
  var assert = require("chai").assert;

  var unitTestSuite = require("./unit_test").unitTestSuite;
  var noise = require("./noise");

  unitTestSuite("unit/noise.js", [
    [ "WhiteNoise" , ["ar", "kr"], 0, 1 ],
    [ "PinkNoise"  , ["ar", "kr"], 0, 1 ],
    [ "ClipNoise"  , ["ar", "kr"], 0, 1 ],
    [ "Dust"       , ["ar", "kr"], 1, 1 ],
    [ "Dust2"      , ["ar", "kr"], 1, 1 ],
    [ "LFNoise0"   , ["ar", "kr"], 1, 1 ],
    [ "LFNoise1"   , ["ar", "kr"], 1, 1 ],
    [ "LFNoise2"   , ["ar", "kr"], 1, 1 ],
    [ "LFNoiseClip", ["ar", "kr"], 1, 1 ],
  ]);

});
