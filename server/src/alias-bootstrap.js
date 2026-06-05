const Module = require('module');
const path = require('path');

if (Module.__aliasPatched) return;
Module.__aliasPatched = true;

const srcRoot = __dirname;
const origResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const resolved = path.join(srcRoot, request.slice(2));
    return origResolveFilename.call(this, resolved, parent, isMain, options);
  }
  return origResolveFilename.call(this, request, parent, isMain, options);
};
