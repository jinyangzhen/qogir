angular.module('chat').service('XmppService', function ($log, $q, PersistenceService) {
    'use strict';

    var BOSH_SERVICE = PersistenceService.getItem('bosh_service') || 'http://localhost:7070/http-bind/',
        connection,
        connectionStatus = Strophe.Status.DISCONNECTED,
        fullJabberId = null,
        password = null,
    //_DEBUG = false,
        statusTxt = {};

    statusTxt[Strophe.Status.CONNECTING] = 'Connecting';
    statusTxt[Strophe.Status.AUTHENTICATING] = 'Authenticating';
    statusTxt[Strophe.Status.CONNECTED] = 'Connected';
    statusTxt[Strophe.Status.DISCONNECTED] = 'Disconnected';
    statusTxt[Strophe.Status.DISCONNECTING] = 'Disconnecting';

    /*    connection.rawInput = function (data) {
     if (_DEBUG) {
     $log.debug('RECV: ' + data);
     }
     };
     connection.rawOutput = function (data) {
     if (_DEBUG) {
     $log.debug('SEND: ' + data);
     }
     };*/

    this.connect = function (jid, pass) {
        var deferred = $q.defer();
        connection = new Strophe.Connection(BOSH_SERVICE);
        connection.connect(jid, pass, function (status, condition) {
            connectionStatus = status;

            if (connectionStatus === Strophe.Status.CONNECTED) {
                fullJabberId = connection.jid; //keep the full id which has resource (session) part
                password = pass;
                connection.send($pres()); //send presence for listening on incoming msg
                deferred.resolve(condition);
            }
            else if (connectionStatus === Strophe.Status.CONNECTING) {
                $log.info('Connecting...');
            }
            else if (connectionStatus === Strophe.Status.AUTHENTICATING) {
                $log.info('Authenticating...');
            }
            else if (connectionStatus === Strophe.Status.AUTHFAIL) {
                deferred.reject('Auth failed');
            }
            else {
                deferred.reject(condition);
            }
        });
        return deferred.promise;
    };

    this.disconnect = function () {
        connection.disconnect();
        connection = null;
    };

    this.isConnected = function () {
        return  connectionStatus === Strophe.Status.CONNECTED;
    };

    this.getCurrentStatus = function () {
        return statusTxt[connectionStatus];
    };

    this.getUser = function () {
        return  fullJabberId.split('@')[0];
    };

    this.resetBoshEndpoint = function (endpoint) {
        BOSH_SERVICE = endpoint;
        connection.disconnect();
        connection = new Strophe.Connection(BOSH_SERVICE);
    };

    this.sendMessage = function (jid, msg) {
        var message = $msg({to: jid, 'type': 'chat'}).c('body').t(msg).up().c('active', {xmlns: 'http://jabber.org/protocol/chatstates'});
        connection.send(message);
    };

    this.registerChatHandler = function (callback) {
        connection.addHandler(callback, null, 'message', 'chat');
    };

    /**
     * check whether Fastpath component available on server end
     * @returns {*}
     */
    this.discoverFastpath = function () {
        var deferred = $q.defer();
        connection.sendIQ(
            $iq({type: "get"})
                .c("query", {xmlns: "http://jabber.org/protocol/disco#items"}),
            function (iq) {
                var fpId, item = $(iq).find('iq > query item[name="Fastpath"][jid^="workgroup"]');
                if (item.length > 0) {
                    fpId = item[0].attributes['jid'].value;
                    deferred.resolve(fpId);
                    return;
                }

                deferred.reject('Faskpath component not found');
            },
            function (error) {
                if (error) {
                    deferred.reject(error);
                }
                else {
                    deferred.reject('time out');
                }
            }
        );

        return deferred.promise;
    };

    /**
     * find back the work groups the component sets up
     * @param jid
     * @returns {*}
     */
    this.discoverWorkgroup = function (jid) {
        var deferred = $q.defer();
        connection.sendIQ(
            $iq({to: jid, type: "get"})
                .c("workgroups", {xmlns: "http://jabber.org/protocol/workgroup", jid: fullJabberId}),
            function (iq) {
                var i, j, wgName, names = [], workgroups = $(iq).find('iq > workgroups > workgroup[jid]');

                for (i = 0, j = workgroups.length; i < j; i++) {
                    wgName = workgroups[i].attributes['jid'].value;
                    names.push(wgName);
                }

                deferred.resolve(names);
            },
            function (error) {
                if (error) {
                    deferred.reject(error);
                }
                else {
                    deferred.reject('time out');
                }
            });

        return deferred.promise;
    }

});