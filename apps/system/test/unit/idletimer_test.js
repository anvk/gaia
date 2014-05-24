'use strict';

mocha.globals(['clearIdleTimeout', 'setIdleTimeout']);

requireApp('shared/js/idletimer.js');

function switchProperty(originObject, prop, stub, reals, useDefineProperty) {
  if (!useDefineProperty) {
    reals[prop] = originObject[prop];
    originObject[prop] = stub;
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return stub; }
    });
  }
}

function restoreProperty(originObject, prop, reals, useDefineProperty) {
  if (!useDefineProperty) {
    originObject[prop] = reals[prop];
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return reals[prop]; }
    });
  }
}

suite('idleTimer', function() {
  var stubAddIdleObserver, stubRemoveIdleObserver, stubSetTimeout, stubClearTimeout, stubDateNow, id;

  var idleCallback = function() {
    assert.isTrue(true);
  };
  var activeCallback = function() {
    assert.isTrue(true);
  };
  var reals = {};

  setup(function() {
    stubAddIdleObserver = this.sinon.stub();
    switchProperty(navigator, 'addIdleObserver', stubAddIdleObserver, reals);
    stubRemoveIdleObserver = this.sinon.stub();
    switchProperty(navigator, 'setIdleTimeout', stubRemoveIdleObserver, reals);
    stubSetTimeout = this.sinon.stub();
    switchProperty(window, 'setTimeout', stubSetTimeout, reals);
    stubClearTimeout = this.sinon.stub();
    switchProperty(window, 'clearTimeout', stubClearTimeout, reals);
    stubDateNow = this.sinon.stub();
    switchProperty(Date, 'now', stubDateNow, reals);
  });

  teardown(function() {
    restoreProperty(navigator, 'addIdleObserver', reals);
    restoreProperty(navigator, 'setIdleTimeout', reals);
    restoreProperty(window, 'setTimeout', reals);
    restoreProperty(window, 'clearTimeout', reals);
    restoreProperty(Date, 'now', reals);
  });

  test('setIdleTimeout()', function() {
    id = window.setIdleTimeout(idleCallback, activeCallback, 100);
    
    assert.ok(id);
    assert.isTrue(stubAddIdleObserver.calledOnce);
    assert.isTrue(stubSetTimeout.calledOnce);
    assert.isTrue(stubDateNow.calledOnce);

  });

  test('clearIdleTimeout()', function(done) {
    id = window.setIdleTimeout(idleCallback, activeCallback, 100);
    
    assert.ok(id);

    window.clearIdleTimeout(id);

    assert.isTrue(stubRemoveIdleObserver.calledOnce);
  });
});
