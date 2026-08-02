'use strict';

function createMockRouter() {
  const routes = [];
  const methods = ['get', 'post', 'put', 'delete', 'patch'];

  function track(method, path, handlers) {
    const entry = { method, path, handlers: [...handlers] };
    routes.push(entry);
  }

  const router = function () {};

  for (const m of methods) {
    router[m] = function (path, ...handlers) {
      track(m.toUpperCase(), path, handlers);
      return router;
    };
  }

  router.use = function (...args) {
    if (typeof args[0] === 'string') {
      track('USE', args[0], args.slice(1));
    } else {
      track('USE', '/', args);
    }
    return router;
  };

  router._routes = routes;
  return router;
}

function stubExpress() {
  const servedRouters = [];
  return {
    Router: (opts) => {
      const r = createMockRouter();
      r._mergeParams = !!(opts && opts.mergeParams);
      servedRouters.push(r);
      return r;
    },
    _servedRouters: servedRouters,
  };
}

module.exports = { createMockRouter, stubExpress };
