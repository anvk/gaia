'use strict';

require('/shared/js/idletimer.js');

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
  var stubAddIdleObserver, stubRemoveIdleObserver, stubSetTimeout, stubClearTimeout, stubDateNow;

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
    switchProperty(navigator, 'removeIdleObserver', stubRemoveIdleObserver, reals);
    stubSetTimeout = this.sinon.stub();
    stubSetTimeout.returns('timer');
    switchProperty(window, 'setTimeout', stubSetTimeout, reals);
    stubClearTimeout = this.sinon.stub();
    switchProperty(window, 'clearTimeout', stubClearTimeout, reals);
    stubDateNow = this.sinon.stub();
    switchProperty(Date, 'now', stubDateNow, reals);
  });

  teardown(function() {
    restoreProperty(navigator, 'addIdleObserver', reals);
    restoreProperty(navigator, 'removeIdleObserver', reals);
    restoreProperty(window, 'setTimeout', reals);
    restoreProperty(window, 'clearTimeout', reals);
    restoreProperty(Date, 'now', reals);
  });

  test('proper id sequence', function() {
    var id1, id2, id3;

    // check that we generate a proper id sequence
    id1 = window.setIdleTimeout(idleCallback, activeCallback, 100);
    id2 = window.setIdleTimeout(idleCallback, activeCallback, 100);

    assert.ok(id1);
    assert.equal(1, id1);
    assert.ok(id2);
    assert.equal(2, id2);

    // now let's remove one of the created IdleTimers
    window.clearIdleTimeout(id1);
    // new one would still get an id next in the sequence
    id3 = window.setIdleTimeout(idleCallback, activeCallback, 100);
    assert.ok(id3);
    assert.equal(3, id3);

    // cleanup
    window.clearIdleTimeout(id2);
    window.clearIdleTimeout(id3);
  });

  suite('setIdleTimeout()', function() {
    var id, idleTimerObserver;

    setup(function() {
      // create idletimer observer
      id = window.setIdleTimeout(idleCallback, activeCallback, 100);
      // retrieve idleTimer.observer
      idleTimerObserver = stubAddIdleObserver.getCall(0).args[0];
    });

    teardown(function() {
      window.clearIdleTimeout(id);
    });

    test('regular call', function() {
      // check that we called proper functions when we created idletimer
      assert.ok(id);
      assert.isTrue(stubAddIdleObserver.calledOnce);
      assert.isTrue(stubDateNow.calledOnce);

      // Check that we were passing a proper observer into addIdleObserver
      assert.ok(idleTimerObserver.onactive);
      assert.ok(idleTimerObserver.onidle);
    });

    test('executing onidle', function() {
      idleTimerObserver.onidle();
      assert.isTrue(stubSetTimeout.calledOnce);
      assert.isTrue(stubDateNow.calledTwice);
    });

    test('executing onactive before any onidle', function() {
      idleTimerObserver.onactive();
      assert.isFalse(stubClearTimeout.calledOnce);
      assert.isTrue(stubDateNow.calledTwice);
    });

    test('executing onactive after onidle', function() {
      idleTimerObserver.onidle();
      assert.isTrue(stubSetTimeout.calledOnce);
      assert.isTrue(stubDateNow.calledTwice);

      idleTimerObserver.onactive();
      assert.isTrue(stubClearTimeout.calledOnce);
      assert.isTrue(stubDateNow.calledThrice);
    });
  });

  suite('clearIdleTimeout()', function() {
    var testFunc = function(isOnIdleCalled) {
      var assertFunc = (isOnIdleCalled) ? assert.isTrue: assert.isFalse;

      // First we create IdleTimer
      var id = window.setIdleTimeout(idleCallback, activeCallback, 100),
          idleTimerObserver;
      
      assert.ok(id);

      // retrieve idleTimer.observer    
      idleTimerObserver = stubAddIdleObserver.getCall(0).args[0];
      if (isOnIdleCalled) {
        idleTimerObserver.onidle();
      }
      
      // Now let's clear it
      window.clearIdleTimeout(id);
      // Check that we called removeIdleObserver and clearTimeout (depending if onIdle was executed prior)
      assert.isTrue(stubRemoveIdleObserver.calledOnce);
      assertFunc(stubClearTimeout.calledOnce);
      // Check that we were passing a proper observer into removeIdleObserver
      idleTimerObserver = stubRemoveIdleObserver.getCall(0).args[0];
      assert.ok(idleTimerObserver.onactive);
      assert.ok(idleTimerObserver.onidle);
    };

    test('calling before onidle was called', function() {
      testFunc();
    });

    test('calling after onidle was called', function() {
      testFunc(true);
    });
  });
});
