define(function(require, exports, module) {
  "use strict";

  var cc = require("./cc");
  var extend = require("../common/extend");
  
  var graphFunc  = {};
  var doneAction = {};
  
  graphFunc[C.ADD_TO_HEAD] = function(target, node) {
    var prev;
    if (target instanceof Group) {
      if (target.head === null) {
        target.head = target.tail = node;
      } else {
        prev = target.head.prev;
        if (prev) {
          prev.next = node;
        }
        node.next = target.head;
        target.head.prev = node;
        target.head = node;
      }
      node.parent = target;
    }
  };
  graphFunc[C.ADD_TO_TAIL] = function(target, node) {
    var next;
    if (target instanceof Group) {
      if (target.tail === null) {
        target.head = target.tail = node;
      } else {
        next = target.tail.next;
        if (next) {
          next.prev = node;
        }
        node.prev = target.tail;
        target.tail.next = node;
        target.tail = node;
      }
      node.parent = target;
    }
  };
  graphFunc[C.ADD_BEFORE] = function(target, node) {
    var prev = target.prev;
    target.prev = node;
    node.prev = prev;
    if (prev) {
      prev.next = node;
    }
    node.next = target;
    if (target.parent && target.parent.head === target) {
      target.parent.head = node;
    }
    node.parent = target.parent;
  };
  graphFunc[C.ADD_AFTER] = function(target, node) {
    var next = target.next;
    target.next = node;
    node.next = next;
    if (next) {
      next.prev = node;
    }
    node.prev = target;
    if (target.parent && target.parent.tail === target) {
      target.parent.tail = node;
    }
    node.parent = target.parent;
  };
  graphFunc[C.REPLACE] = function(target, node) {
    node.next = target.next;
    node.prev = target.prev;
    node.head = target.head;
    node.tail = target.tail;
    node.parent = target.parent;
    if (target.prev) {
      target.prev.next = node;
    }
    if (target.next) {
      target.next.prev = node;
    }
    if (target.parent && target.parent.head === target) {
      target.parent.head = node;
    }
    if (target.parent && target.parent.tail === target) {
      target.parent.tail = node;
    }
  };
  
  doneAction[0] = function() {
    // do nothing when the UGen is finished
  };
  doneAction[1] = function() {
    // pause the enclosing synth, but do not free it
    this.running = false;
  };
  doneAction[2] = function() {
    // free the enclosing synth
    free.call(this);
  };
  doneAction[3] = function() {
    // free both this synth and the preceding node
    var prev = this.prev;
    if (prev) {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[4] = function() {
    // free both this synth and the following node
    var next = this.next;
    free.call(this);
    if (next) {
      free.call(next);
    }
  };
  doneAction[5] = function() {
    // free this synth; if the preceding node is a group then do g_freeAll on it, else free it
    var prev = this.prev;
    if (prev instanceof Group) {
      g_freeAll(prev);
    } else {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[6] = function() {
    // free this synth; if the following node is a group then do g_freeAll on it, else free it
    var next = this.next;
    free.call(this);
    if (next) {
      g_freeAll(next);
    } else {
      free.call(next);
    }
  };
  doneAction[7] = function() {
    // free this synth and all preceding nodes in this group
    var next = this.parent.head;
    if (next) {
      var node = next;
      while (node && node !== this) {
        next = node.next;
        free.call(node);
        node = next;
      }
    }
    free.call(this);
  };
  doneAction[8] = function() {
    // free this synth and all following nodes in this group
    var next = this.next;
    free.call(this);
    if (next) {
      var node = next;
      while (node) {
        next = node.next;
        free.call(node);
        node = next;
      }
    }
  };
  doneAction[9] = function() {
    // free this synth and pause the preceding node
    var prev = this.prev;
    free.call(this);
    if (prev) {
      prev.running = false;
    }
  };
  doneAction[10] = function() {
    // free this synth and pause the following node
    var next = this.next;
    free.call(this);
    if (next) {
      next.running = false;
    }
  };
  doneAction[11] = function() {
    // free this synth and if the preceding node is a group then do g_deepFree on it, else free it
    var prev = this.prev;
    if (prev instanceof Group) {
      g_deepFree(prev);
    } else {
      free.call(prev);
    }
    free.call(this);
  };
  doneAction[12] = function() {
    // free this synth and if the following node is a group then do g_deepFree on it, else free it
    var next = this.next;
    free.call(this);
    if (next) {
      g_deepFree(next);
    } else {
      free.call(next);
    }
  };
  doneAction[13] = function() {
    // free this synth and all other nodes in this group (before and after)
    var next = this.parent.head;
    if (next) {
      var node = next;
      while (node) {
        next = node.next;
        free.call(node);
        node = next;
      }
    }
  };
  doneAction[14] = function() {
    // free the enclosing group and all nodes within it (including this synth)
    g_deepFree(this);
  };
  var free = function() {
    if (this.prev) {
      this.prev.next = this.next;
    }
    if (this.next) {
      this.next.prev = this.prev;
    }
    if (this.parent) {
      if (this.parent.head === this) {
        this.parent.head = this.next;
      }
      if (this.parent.tail === this) {
        this.parent.tail = this.prev;
      }

      var userId;
      if (this.world) {
        userId = this.world.userId;
      }
    }
    this.prev = null;
    this.next = null;
    this.parent = null;
    this.blocking = false;
    if (this.world) {
      delete this.world.nodes[this.nodeId];
    }
  };
  var g_freeAll = function(node) {
    var next = node.head;
    free.call(node);
    node = next;
    while (node) {
      next = node.next;
      free.call(node);
      node = next;
    }
  };
  var g_deepFree = function(node) {
    var next = node.head;
    free.call(node);
    node = next;
    while (node) {
      next = node.next;
      free.call(node);
      if (node instanceof Group) {
        g_deepFree(node);
      }
      node = next;
    }
  };
  
  var Node = (function() {
    function Node(nodeId, world) {
      this.nodeId = nodeId|0;
      this.next   = null;
      this.prev   = null;
      this.parent = null;
      this.running = true;
      this.world = world;
    }
    Node.prototype.play = function() {
      this.running = true;
    };
    Node.prototype.pause = function() {
      this.running = false;
    };
    Node.prototype.stop = function() {
      free.call(this);
    };
    Node.prototype.run = function(inRun) {
      this.running = !!inRun; // TODO
    };
    Node.prototype.end = function() {
      this.running = false; // TODO
    };
    Node.prototype.doneAction = function(action) {
      var func = doneAction[action];
      if (func) {
        func.call(this);
        var userId;
        if (this.world) {
          userId = this.world.userId;
        }
      }
    };
    return Node;
  })();

  var Group = (function() {
    function Group(nodeId, target, addAction, world) {
      Node.call(this, nodeId, world);
      this.head = null;
      this.tail = null;
      if (target) {
        graphFunc[addAction](target, this);
      }
    }
    extend(Group, Node);
    
    Group.prototype.process = function(inNumSamples) {
      if (this.head && this.running) {
        this.head.process(inNumSamples);
      }
      if (this.next) {
        this.next.process(inNumSamples);
      }
    };
    
    return Group;
  })();

  var Synth = (function() {
    function Synth(nodeId, target, addAction, defId, controls, world) {
      Node.call(this, nodeId, world);
      if (world) {
        var specs = world.defs[defId];
        if (specs) {
          this.build(specs, controls, world);
        }
      }
      if (target) {
        graphFunc[addAction](target, this);
      }
    }
    extend(Synth, Node);
    
    Synth.prototype.build = function(specs, controls, world) {
      this.specs = specs;
      var list, value, unit, i, imax;
      var fixNumList, unitList, filteredUnitList;
      list = specs.consts;
      fixNumList = new Array(list.length);
      for (i = 0, imax = list.length; i < imax; ++i) {
        value = list[i];
        fixNumList[i] = world.getFixNum(value);
      }
      list = specs.defList;
      unitList = new Array(list.length);
      for (i = 0, imax = list.length; i < imax; ++i) {
        unitList[i] = cc.createUnit(this, list[i]);
      }
      
      this.params   = specs.params;
      this.controls = new Float32Array(this.params.values);
      this.set(controls);
      
      this.unitList = filteredUnitList = [];
      for (i = 0, imax = unitList.length; i < imax; ++i) {
        unit = unitList[i];
        var inputs    = unit.inputs;
        var inRates   = unit.inRates;
        var fromUnits = unit.fromUnits;
        var inSpec  = unit.specs[3];
        for (var j = 0, jmax = inputs.length; j < jmax; ++j) {
          var j2 = j << 1;
          if (inSpec[j2] === -1) {
            inputs[j]  = fixNumList[inSpec[j2+1]].outputs[0];
            inRates[j] = C.SCALAR;
          } else {
            inputs[j]    = unitList[inSpec[j2]].outputs[inSpec[j2+1]];
            inRates[j]   = unitList[inSpec[j2]].outRates[inSpec[j2+1]];
            fromUnits[j] = unitList[inSpec[j2]];
          }
        }
        unit.init();
        if (unit.process) {
          filteredUnitList.push(unit);
        }
      }
      return this;
    };

    Synth.prototype.set = function(controls) {
      for (var i = 0, imax = controls.length; i < imax; i += 2) {
        var index = controls[i    ];
        var value = controls[i + 1];
        this.controls[index] = value;
      }
    };
    
    Synth.prototype.process = function(inNumSamples) {
      if (this.running && this.unitList) {
        var unitList = this.unitList;
        for (var i = 0, imax = unitList.length; i < imax; ++i) {
          var unit = unitList[i];
          if (unit.calcRate !== C.DEMAND) {
            unit.process(unit.rate.bufLength);
          }
        }
      }
      if (this.next) {
        this.next.process(inNumSamples);
      }
    };
    
    return Synth;
  })();
  
  cc.createServerRootNode = function(world) {
    return new Group(0, 0, 0, world);
  };

  cc.createServerGroup = function(nodeId, target, addAction, world) {
    return new Group(nodeId, target, addAction, world);
  };

  cc.createServerSynth = function(nodeId, target, addAction, defId, controls, world) {
    return new Synth(nodeId, target, addAction, defId, controls, world);
  };
  
  module.exports = {
    Node : Node,
    Group: Group,
    Synth: Synth
  };

});
