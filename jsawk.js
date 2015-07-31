/*
#
# Jsawk: It's like awk for JSON, in bash.
#
# Fork me on github:
#   http://github.com/micha/jsawk
#
# Author:
#   Micha Niskin <micha@thinkminimo.com>
#   Copyright 2009, no rights reserved, other than as required by the
#   licenses of the incorporated software below.
#
*/
var sprintf = require('./sprintf.js');
var _ = require('./underscore.js');
var jsonquery = require('./jsonquery.js');
var json = require('./json.js');
var isNode = false;
if (typeof window === 'undefined') {
	window = global; // rinie try
	isNode = true;
}
else {
	window    = this;     // the global object
}

window.IS = [];       // the input set
window.RS = [];       // the result set
window.$_ = {};       // the current element index
window.$$ = {};       // the current element

(function(p) {
  var doPrint = function() {
    var args  = Array.prototype.slice.call(arguments);
    var type  = args.shift();
    var input = args.join(" ");
    var lines = input.split("\n");
    for (var i in lines)
      p(type, lines[i]);
  };
  var doJsonPrint = function() {
    var args  = Array.prototype.slice.call(arguments);
    var type  = args.shift();
    if (args.length > 0) {
      args = args.length > 1 ? args : args[0];
      var ret  = typeof(args) == "string" ? args : json(args);
      doPrint(type, ret);
    }
  };
  window.Q = function() {
    try {
      var ret = JSONQuery.apply(window, arguments);
      ret.length;
      return ret;
    } catch (e) {
      err("jsawk: JSONQuery parse error: '"+arguments[0]+"'");
      quit(4);
    }
  };
  window.out = function() {
    var args  = Array.prototype.slice.call(arguments);
    args.unshift("OUT:");
    doJsonPrint.apply(window, args);
  };
  window.err = function() {
    var args  = Array.prototype.slice.call(arguments);
    args.unshift("ERR:");
    doJsonPrint.apply(window, args);
  };
  window.alert = p;
  window.doJson = function(input) {
    if (typeof input !== "string") {
      return input;
    } else {
      input = input.replace(/\s*$/,"");
      if (!input.length) {
        return {};
      } else {
        try {
          return eval("("+input+")");
        } catch (e) {
          err("jsawk: JSON parse error: '"+input+"'");
          quit(2);
        }
      }
    }
  };
  window.doCall = function(fun, obj) {
    try {
      return fun.call(obj);
    } catch (e) {
      err("jsawk: js error: "+e);
      quit(3);
    }
  };
  window.makeFilter = function(fun) {
    try {
      return eval("(function() { "+fun+"; return this })");
    } catch (e) {
      err("jsawk: script parse error: '"+fun+"'");
      quit(3);
    }
  };
  window.json = function() {
    try {
      return JSON.stringify.apply(window, arguments);
    } catch (e) {
      err("jsawk: JSON stringify error: "+e);
      quit(5);
    }
  };
  window.get = function() {
    return $$ = IS[++$_];
  };
  window.put = function(record) {
    IS = IS.slice(0, $_+1).concat([record]).concat(IS.slice($_+1));
  };
  window.forEach = function(ary, fun) {
    fun = eval("function(index,item) { "+fun+"; }");
    for (var i=0; i<ary.length; i++) {
      try {
        fun.call(ary[i], i, ary[i]);
      } catch (e) {
        err("jsawk: js error: "+e);
        quit(3);
      }
    }
  };
})(window.print);

(function(argv) {
  argv = Array.prototype.slice.call(argv);

  var inputLines = argv.shift();

  var usage = function() {
    err("Usage: jsawk [-n] [-j jsbin] [-f jsfile1.js]* [-q jsonquery] \\\n" +
        "             [-b script] [-a script] [-v NAME=VALUE] [script]");
    quit(1);
  };

  var fun = "";
  var noprint = false;
  var libs    = [];
  var befores = [];
  var afters  = [];
  var queries = [];
  var i,j,k,l,m,n;

  var arg;

  while (arg = argv.shift()) {
    switch(arg) {
      case "-j":
      case "-s":
      case "-i":
        argv.shift();
        break;
      case "-h":
        usage();
        break;
      case "-n":
        noprint = true;
        break;
      case "-q":
        if (argv.length < 1) usage();
        queries.push(argv.shift());
        break;
      case "-f":
        if (argv.length < 1) usage();
        libs.push(argv.shift());
        break;
      case "-b":
        if (argv.length < 1) usage();
        befores.push(makeFilter(argv.shift()));
        break;
      case "-a":
        if (argv.length < 1) usage();
        afters.push(makeFilter(argv.shift()));
        break;
      case "-v":
        if (argv.length < 1) usage();
        var tmp = argv.shift();
        var key = tmp.replace(/=.*$/, "");
        var val = tmp.replace(/^[^=]+=/, "");
        window[key] = val;
        break;
      default:
        fun = arg;
    }
  }

// node part taken from https://github.com/cthulhuology/jsawk
//options = require(process.env['HOME'] + '/.jsawkrc')

var input="";

  process.stdin.on('data', function(data) {
	input += data
  })

  var wrapped;

  process.stdin.on('close', function() {
	 IS      = doJson(input);
	 wrapped = !(IS instanceof Array);

	  if (wrapped)
	    IS = [ IS ];

	  for (i in libs)
	    load(libs[i]);

	  var f = makeFilter(fun);

	  for (i in queries)
	    IS = Q(queries[i], IS);

	  $_ = -1;
	  $$ = IS;

	  for (i in befores)
	    IS = doCall(befores[i], IS);

	  RS = [];

	  for ($_=0; $_<IS.length; $_++) {
	    $$ = IS[$_]
	    var tmp = doCall(f, $$);
	    if (tmp != null) RS.push(tmp);
	  }

	  $_ = -1;
	  $$ = RS;

	  for (i in afters)
	    RS = doCall(afters[i], RS);

	  if (wrapped)
	    RS = RS.pop();

	  if (!noprint) out(RS);
 	})
})(process.argv)