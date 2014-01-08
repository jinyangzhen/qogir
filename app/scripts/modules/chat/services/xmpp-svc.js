angular.module('chat').service('XmppService', function ($log, $q, $timeout, PersistenceService) {
    'use strict';

    var BOSH_SERVICE = PersistenceService.getItem('bosh_service') || 'http://localhost:7070/http-bind/',
        NS_WORKGROUP = 'http://jabber.org/protocol/workgroup',
        NS_MUC = 'http://jabber.org/protocol/muc',
        connection,
        connectionStatus = Strophe.Status.DISCONNECTED,
        fullJabberId = null,
        password = null,
        groupName,
        workgroupPresenceRef,
        offeringInvitationRef,
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
            $iq({type: 'get'})
                .c('query', {xmlns: 'http://jabber.org/protocol/disco#items'}),
            function (iq) {
                var fpId, fastPathItem = $(iq).find('iq > query >item[name="Fastpath"][jid^="workgroup"]');
                if (fastPathItem.length === 1) {
                    fpId = fastPathItem.attr('jid');
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
            $iq({to: jid, type: 'get'})
                .c('workgroups', {xmlns: NS_WORKGROUP, jid: fullJabberId}),
            function (iq) {
                var names = [], workgroups = $(iq).find('iq > workgroups > workgroup[jid]');

                workgroups.each(function (index, oneGroup) {
                    names.push($(oneGroup).attr('jid'));
                });

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
    };


    /**
     *
     * @param group
     */
    this.loginWorkgroup = function (group, helpdeskModel) {
        //observe queue updates for any workgroup
        workgroupPresenceRef = connection.addHandler(function presenceHandler(pres) {
            var count, queueName, endUsers;
            $log.debug(pres);

            $timeout(function () {
                var from = $(pres).attr('from');
                if (from.indexOf(group) === 0) {

                    count = $(pres).find(' presence > notify-queue > count').text();
                    queueName = from.replace(group + '/', '');

                    if (count) {
                        //handle the general info for the queue
                        helpdeskModel.queue = {};
                        helpdeskModel.queue.name = queueName;
                        helpdeskModel.queue.count = count;
                        helpdeskModel.queue.items = [];
                    }
                    else {
                        endUsers = $(pres).find(' presence > notify-queue-details > user');
                        if (endUsers) {
                            helpdeskModel.queue.items.length = 0;      //empty existing queue   TODO: this is simple, but it may be worth to change to merge for better model handling
                            //handle detail info
                            for (var i = 0, j = endUsers.length; i < j; i++) {
                                var theNode = $(endUsers[i]),
                                    jid = theNode.attr('jid'),
                                    position = theNode.find('position').text(),
                                    waiting = theNode.find('time').text(),
                                    joinTime = theNode.find('join-time').text();

                                helpdeskModel.queue.items.push({
                                    jid: jid,
                                    position: position,
                                    waiting: waiting,
                                    joinTime: joinTime
                                })
                            }
                        }
                    }
                }
            });

            return true;
        }, NS_WORKGROUP, 'presence');

        //observe offering and offering revoke events sent by workgroup
        offeringInvitationRef = connection.addHandler(function iqHandler(iq) {
            $log.debug(iq);

            $timeout(function () {

                //Offering constructor
                function Offering(id, available, timeout /* optional */) {
                    this.id = id;
                    this.available = available || false;
                    this.leftTime = timeout;
                }

                Offering.prototype = {
                    countDown: function () {
                        var self = this;
                        self.leftTime--;
                        if (self.leftTime > 0) {
                            $timeout(function () {
                                self.countDown();
                            }, 1000);
                        }
                    }
                };

                var offering, revoke, theItem, i, j, m, n;

                //check whether it is offer
                offering = $(iq).find('iq > offer');
                if (offering && offering.length === 1) {
                    var offeringId = offering.attr('id'),
                        incomingJid = offering.attr('jid'),
                        expiredAfter = +offering.find('timeout').text();
                    for (i = 0, j = helpdeskModel.queue.items.length; i < j; i++) {
                        theItem = helpdeskModel.queue.items[i];
                        if (theItem.jid === incomingJid) {
                            theItem.offering = new Offering(offeringId, true, expiredAfter);
                            theItem.offering.countDown(); //kick off time countdown
                        }
                    }
                }


                //check whether it is offer-revoke
                revoke = $(iq).find('iq > offer-revoke');
                if (revoke && revoke.length === 1) {
                    var revokeJid = revoke.attr('jid'),
                        reason = revoke.find('reason').text();
                    for (m = 0, n = helpdeskModel.queue.items.length; m < n; m++) {
                        theItem = helpdeskModel.queue.items[m];
                        if (theItem.jid === revokeJid) {
                            theItem.offering = new Offering();
                            theItem.revokeReason = reason;
                        }
                    }
                }
            });

            return true;
        }, NS_WORKGROUP, 'iq', 'set', null, group);

        //login to a specified group
        connection.send($pres({to: group}).c('agent-status', {xmlns: NS_WORKGROUP}));
        connection.send($pres({to: group}).c('status').t('Online').up().c('priority').t('1'));
        groupName = group;

    };

    this.logoutWorkgroup = function () {
        //TODO send presence unavailable to previous
        connection.deleteHandler(workgroupPresenceRef);
        connection.deleteHandler(offeringInvitationRef);
        groupName = '';
    };

    /**
     *
     * @param offering
     * @returns {*}
     */
    this.acceptCall = function (offering) {
        var deferred = $q.defer();

        //send an accept IQ
        connection.sendIQ(
            $iq({type: 'set', to: groupName}).c('offer-accept', {id: offering.id, xmlns: NS_WORKGROUP})
        );

        //listen on room invitation message sent from workgroup
        connection.addHandler(function roomReadyHandle(msg) {
            var roomJid;
            $log.debug(msg);
            if ($(msg).attr('from').split('@')[1].indexOf('conference.') === 0) {
                var node = $(msg).find('message > x[xmlns="jabber:x:conference"]');
                roomJid = node.attr('jid');
                if (!roomJid) {
                    deferred.reject('room id not found');
                }
                else {
                    deferred.resolve(roomJid);
                }
            }
            else {
                return true; //keep on listening
            }

        }, NS_WORKGROUP, 'message');

        return deferred.promise;
    };

    /**
     * join a chat room for group chat
     * @param roomJid
     * @returns {*}
     */
    this.joinChatRoom = function (roomJid) {
        function presentToRoom(roomJid, nickName) {
            //send join msg to room
            connection.send($pres({to: roomJid + '/' + nickName}).c('x', {xmlns: NS_MUC}));
        }

        function getRandomIdentifier() {
            //borrow from http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
            var text = '', possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            for (var i = 0; i < 2; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            return text;
        }

        var deferred = $q.defer(), nickName = fullJabberId.split('@')[0], mucPresenceHandler, mucPresenceErrHandler;

        presentToRoom(roomJid, nickName);

        //listen on confirmation and participants presence msg
        mucPresenceHandler = connection.addHandler(function presenceHandler(pres) {
            $log.debug(pres);

            $timeout(function () {
                var roomFullJid = $(pres).attr('from'), nick;
                //if (Strophe.getBareJidFromJid(roomFullJid) === roomJid) {
                if ($(pres).find('presence > x > item').attr('role') === 'participant') {
                    nick = Strophe.getResourceFromJid(roomFullJid);
                    if (nick === nickName) {
                        // the presence's nick name returned from server is same with what sent from client,
                        // then consider it's a confirmation of successfully joining the chat room
                        deferred.resolve({nickName: nickName, mucHandler: mucPresenceHandler, munErrHandler: mucPresenceErrHandler});
                    }
                    else {
                        // handle presence for other participants
                        $log.debug('presence for other participants');
                    }
                }
                //}
            });

            return true; // keep on observing participants' presence
        }, NS_MUC, 'presence', null, null, roomJid, {matchBare: true});

        mucPresenceErrHandler = connection.addHandler(function presenceErrHandler(pres) {
            $log.debug(pres);

            $timeout(function () {
                if ($(pres).find('presence > error > conflict').length === 1) {
                    //handle nick name conflict
                    nickName = nickName + '-' + getRandomIdentifier();
                    $timeout(presentToRoom(roomJid, nickName));
                }
                else {
                    // fail to join the chat room
                    deferred.reject($(pres).find('presence > error').attr('code'));
                }
            });

            return true;
        }, NS_MUC, 'presence', 'error', null, roomJid, {matchBare: true});

        return deferred.promise;
    };


    this.leaveChatRoom = function () {

    }

});