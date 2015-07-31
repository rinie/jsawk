  for (var i=0; i<inputLines; i++) {
    var line=readline();
    input += (line ? line : "");
    input += "\n";
  }

  var wrapped;

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

  if (!noprint)
    out(RS);
})(typeof arguments === 'undefined' ? scriptArgs : arguments);
