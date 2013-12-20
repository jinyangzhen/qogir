angular.module('chat').service('XmppService', function ($log, $q, PersistenceService) {
    'use strict';

    var BOSH_SERVICE = PersistenceService.getItem('bosh_service')||'http://localhost:7070/http-bind/',
        connection = new Strophe.Connection(BOSH_SERVICE),
        connectionStatus = Strophe.Status.DISCONNECTED,
        jabberId = null,
        password = null,
        _DEBUG = false,
        statusTxt = {};

    statusTxt[Strophe.Status.CONNECTING] = 'Connecting';
    statusTxt[Strophe.Status.AUTHENTICATING] = 'Authenticating';
    statusTxt[Strophe.Status.CONNECTED] = 'Connected';
    statusTxt[Strophe.Status.DISCONNECTED] = 'Disconnected';
    statusTxt[Strophe.Status.DISCONNECTING] = 'Disconnecting';

    connection.rawInput = function (data) {
        if (_DEBUG) {
            $log.debug('RECV: ' + data);
        }
    };
    connection.rawOutput = function (data) {
        if (_DEBUG) {
            $log.debug('SEND: ' + data);
        }
    };

    this.connect = function (jid, pass) {
        var deferred = $q.defer();
        connection.connect(jid, pass, function (status, condition) {
            connectionStatus = status;

            if (connectionStatus === Strophe.Status.CONNECTED) {
                jabberId = jid;
                password = pass;
                deferred.resolve(condition);
            }
            else if (connectionStatus === Strophe.Status.CONNECTING) {
                $log.info('Connecting...');
            }
            else if (connectionStatus === Strophe.Status.AUTHENTICATING) {
               $log.info('Authenticating...');
            }
            else {
                 deferred.reject(condition);
            }
        });
        return deferred.promise;
    };

    this.disconnect = function () {
        connection = null;
    };

    this.isConnected = function () {
        return  connectionStatus === Strophe.Status.CONNECTED;
    };

    this.getCurrentStatus = function () {
        return statusTxt[connectionStatus];
    };

    this.getUser = function () {
        return  jabberId;
    }

    this.resetBoshEndpoint = function (endpoint){
        BOSH_SERVICE = endpoint;
        connection = new Strophe.Connection(BOSH_SERVICE);
    }

});