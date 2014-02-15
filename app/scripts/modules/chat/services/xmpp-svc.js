angular.module('chat').service('XmppService', function ($log, $q, $timeout, PersistenceService) {
    'use strict';

    var BOSH_SERVICE = SMC_CONFIG.bosh,
        XMPP_DOMAIN = SMC_CONFIG.domain,
        NS_WORKGROUP = 'http://jabber.org/protocol/workgroup',
        NS_MUC_USER = 'http://jabber.org/protocol/muc#user',
        NS_PUBSUB = 'http://jabber.org/protocol/pubsub',
        NS_PUBSUB_CONFIG = 'http://jabber.org/protocol/pubsub#node_config',
        NS_PUBSUB_OWNER = 'http://jabber.org/protocol/pubsub#owner',
        NS_PUBSUB_EVENT = 'http://jabber.org/protocol/pubsub#event',
        NS_JABBER_X_DATA = 'jabber:x:data',
        CLIENT_ID = 'smc',
        connection,
        connectionStatus = Strophe.Status.DISCONNECTED,
        fullJabberId = null,
        password = null,
        groupName,
        workgroupPresenceRef,
        offeringInvitationRef,
        conversationRef,
        invitationRef,
        statusTxt = {};

    statusTxt[Strophe.Status.CONNECTING] = 'Connecting';
    statusTxt[Strophe.Status.AUTHENTICATING] = 'Authenticating';
    statusTxt[Strophe.Status.CONNECTED] = 'Connected';
    statusTxt[Strophe.Status.DISCONNECTED] = 'Disconnected';
    statusTxt[Strophe.Status.DISCONNECTING] = 'Disconnecting';

    this.connect = function (jid, pass) {
        var deferred = $q.defer();

        //reconfigure in case they are overridden through the client.
        BOSH_SERVICE = PersistenceService.getItem('bosh_service') || BOSH_SERVICE;
        XMPP_DOMAIN = PersistenceService.getItem('xmpp_domain') || XMPP_DOMAIN;

        connection = new Strophe.Connection(BOSH_SERVICE);
        connection.connect(jid + '@' + XMPP_DOMAIN + '/' + CLIENT_ID, pass, function (status, condition) {
            connectionStatus = status;

            if (connectionStatus === Strophe.Status.CONNECTED) {
                fullJabberId = connection.jid; //keep the full id which has resource (client id) part
                password = pass;
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

    this.presence = function () {
        //send presence to server, and start to observe incoming msg
        connection.send($pres());
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
     * check whether Pubsub service available on server end
     * @returns {*}
     */
    this.discoverPubsub = function () {
        var deferred = $q.defer();
        connection.sendIQ(
            $iq({type: 'get'})
                .c('query', {xmlns: Strophe.NS.DISCO_ITEMS}),
            function (iq) {
                var pubSubId, pubsubItem = $(iq).find('iq > query >item[name="Publish-Subscribe service"][jid^="pubsub"]');
                if (pubsubItem.length === 1) {
                    pubSubId = pubsubItem.attr('jid');
                    deferred.resolve(pubSubId);
                    return;
                }

                deferred.reject('Publish-Subscribe service not found');
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
        //TODO send presence 'unavailable' to previous group
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
    this.joinChatRoom = function (room) {

        function presentToRoom(roomJid, nickName) {
            //send join msg to room
            connection.send($pres({to: roomJid + '/' + nickName}).c('x', {xmlns: Strophe.NS.MUC}));
        }

        function getRandomIdentifier() {
            //borrow from http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
            var text = '', possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            for (var i = 0; i < 2; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            return text;
        }

        var deferred = $q.defer(), nickName = fullJabberId.split('@')[0], mucPresenceRef, mucPresenceErrRef;

        presentToRoom(room.jid, nickName);

        //listen on confirmation and participants presence stanza
        mucPresenceRef = connection.addHandler(function presenceHandler(pres) {
            $log.debug(pres);

            $timeout(function () {
                var roomFullJid = $(pres).attr('from'), nick;

                nick = Strophe.getResourceFromJid(roomFullJid);
                if ($(pres).find('presence > x > item').attr('role') === 'participant') {
                    if (nick === nickName) {
                        // if the presence's nick name returned from server is same with what sent from client,
                        // then consider it's a confirmation of successfully joining the chat room

                        //  connection.deleteHandler(mucPresenceErrRef);

                        room.nickName = nickName;
                        room.observables.push(mucPresenceRef);
                        room.observables.push(mucPresenceErrRef);
                        deferred.resolve();
                    }
                    else {
                        room.participants.push(nick);
                        // handle presence for other participants
                        $log.debug('presence for other participants');
                    }
                }

                if ($(pres).attr('type') === 'unavailable') {
                    for (var i = 0, j = room.participants.length; i < j; i++) {
                        if (room.participants[i] === nick) {
                            room.participants.splice(i, 1);
                        }
                    }
                }
            });

            return true; // keep on observing participants' presence to the room
        }, NS_MUC_USER, 'presence', null, null, room.jid, {matchBare: true});

        mucPresenceErrRef = connection.addHandler(function presenceErrHandler(pres) {
            $log.debug(pres);

            $timeout(function () {
                if ($(pres).find('presence > error > conflict').length === 1) {
                    //handle nick name conflict
                    nickName = nickName + '-' + getRandomIdentifier();
                    presentToRoom(room.jid, nickName);
                }
                else {
                    // fail to join the chat room
                    deferred.reject($(pres).find('presence > error').attr('code'));
                }
            });

            return true;
        }, Strophe.NS.MUC, 'presence', 'error', null, room.jid, {matchBare: true});

        return deferred.promise;
    };


    this.closeChatRoom = function () {
        //TODO remove observer
    };

    /**
     * watch on group chat
     * @param room
     * @returns {*}
     */
    this.observeRoomMessage = function (room) {
        var msgHandlerRef = connection.addHandler(function (msg) {
            $log.debug(msg);

            $timeout(function () {
                var participantNickName = Strophe.getResourceFromJid($(msg).attr('from')), body = $(msg).find('message > body');

                if (participantNickName !== room.nickName && body.length === 1) {
                    room.history.push({ userId: participantNickName, timestamp: Date.now(), message: body.text()});
                }
            });

            return true;

        }, null, 'message', 'groupchat', null, room.jid, {matchBare: true});

        room.observables.push(msgHandlerRef);
    };

    /**
     *
     * @param jid
     * @param msg
     */
    this.chatToRoom = function (jid, msg) {
        var message = $msg({to: jid, 'type': 'groupchat'}).c('body').t(msg).up().c('active', {xmlns: 'http://jabber.org/protocol/chatstates'});
        connection.send(message);
    };

    /**
     * to create new ticket via SM gateway
     */
    this.sendTicketIQ = function (id) {
        var deferred = $q.defer();

        connection.sendIQ(
            $iq({type: 'set'})
                .c('query', {'xmlns': 'com:hp:emei:iq:gateway', 'session-id': id }),
            function (iq) {
                deferred.resolve($(iq).find('iq > query[ticketId]').attr('ticketId'));
            }, function (err) {
                $log(err);
                deferred.reject();
            }
        );

        return deferred.promise;
    };

    /**
     * create a pubsub node according to the id of system of record
     * @param pubSubId  the publish-subscribe service address in XMPP server
     * @param recordId  the id of system of record
     * @param recordTitle   the title of system of record
     * @returns {*}
     */
    this.createConversationNode = function (pubSubId, recordId, recordTitle) {
        var deferred = $q.defer();

        connection.sendIQ(
            $iq({from: fullJabberId, to: pubSubId, type: 'set'}).c('pubsub', {'xmlns': NS_PUBSUB}).c('create', {node: recordId})
                .up().c('configure').c('x', {'xmlns': NS_JABBER_X_DATA, type: 'submit'})
                .c('field', {'var': 'FORM_TYPE', 'type': 'hidden'}).c('value').t(NS_PUBSUB_CONFIG).up().up()
                .c('field', {'var': 'pubsub#title'}).c('value').t(recordId + '-' + (recordTitle || '')).up().up()
                //configure this node allow:
                //  1. all to contribute
                //  2. conversation records are persisted
                .c('field', {'var': 'pubsub#publish_model'}).c('value').t('open').up().up()
                .c('field', {'var': 'pubsub#persist_items'}).c('value').t('1'),
            function (iq) {
                $log.debug(iq);
                deferred.resolve();
            },
            function (err) {
                $log(err);
                deferred.reject();
            }
        );

        return deferred.promise;
    };

    /**
     * publish a comment to a conversation which is identified via id of system of record.
     * @param pubSubId
     * @param recordId
     * @returns {*}
     */
    this.publish = function (pubSubId, recordId, message) {
        var deferred = $q.defer();

        connection.sendIQ(
            $iq({from: fullJabberId, to: pubSubId, type: 'set'}).c('pubsub', {xmlns: NS_PUBSUB})
                .c('publish', {node: recordId}).c('item').c('x', {xmlns: NS_JABBER_X_DATA, type: 'result'})
                .c('field', {var: 'publisher'}).c('value').t(Strophe.getBareJidFromJid(fullJabberId)).up().up()
                .c('field', {var: 'comment'}).c('value').t(message).up().up()
                .c('field', {var: 'timestamp'}).c('value').t(Date.now().toString()),
            function (iq) {
                $log.debug(iq);
                deferred.resolve();
            },
            function (err) {
                $log(err);
                deferred.reject();
            }
        );

        return deferred.promise;
    };


    /**
     * subscribe to a conversation
     * @param pubSubId
     * @param recordId
     * @returns {*}
     */
    this.subscribe = function (pubSubId, recordId) {
        var deferred = $q.defer();

        connection.sendIQ(
            $iq({from: fullJabberId, to: pubSubId, type: 'set'}).c('pubsub', {xmlns: NS_PUBSUB})
                .c('subscribe', {node: recordId, jid: fullJabberId}),
            function (iq) {
                $log.debug(iq);
                deferred.resolve();
            },
            function (err) {
                $log(err);
                deferred.reject();
            }
        );

        return deferred.promise;
    };

    /**
     *
     * @param pubSubId
     * @param recordId
     */
    this.unsubscribe = function (pubSubId, recordId) {
        var deferred = $q.defer();

        connection.sendIQ(
            $iq({from: fullJabberId, to: pubSubId, type: 'set'}).c('pubsub', {xmlns: NS_PUBSUB})
                .c('unsubscribe', {node: recordId, jid: fullJabberId}),
            function (iq) {
                $log.debug(iq);
                deferred.resolve();
            },
            function (err) {
                $log(err);
                deferred.reject();
            }
        );

        return deferred.promise;
    };

    /**
     *
     * @param pubSubId
     * @param recordId
     * @param participantJabberId
     */
    this.inviteParticipant = function (pubSubId, recordId, participantId) {
        var invitationMsg =
            $msg(
                {to: participantId + '@' + XMPP_DOMAIN,
                    type: 'normal',
                    pubsub: pubSubId,
                    conversation: recordId
                })
                .c('body', {xmlns: NS_PUBSUB_EVENT})
                .t(Strophe.getBareJidFromJid(fullJabberId) + ' has invited you to join a conversation - ' + recordId);
        connection.send(invitationMsg);
    };

    /**
     * Attach the listener when pubsub srv discovered
     * @param conversation  the domain model which hold all conversation data
     */
    this.attachConversationListener = function (conversation) {
        conversationRef = connection.addHandler(function (msg) {

            $timeout(function () {
                var payload = $(msg).find('message > event > items'),
                    conversationId = payload.attr('node'),
                    items = payload.find('item'),
                    note, jqItem;

                if (conversation.map[conversationId] && conversation.map[conversationId].notes) {
                    for (var i = 0, j = items.length; i < j; i++) {
                        jqItem = $(items[i]);
                        note = {
                            publisher: jqItem.find('item > x > field[var="publisher"] > value').text(),
                            timestamp: jqItem.find('item x > field[var="timestamp"] > value').text(),
                            comment: jqItem.find('item x > field[var="comment"] > value').text()
                        }

                        conversation.map[conversationId].notes.push(note);
                    }
                }
            });


            return true;
        }, NS_PUBSUB_EVENT, 'message', null, null, conversation.pubSubId);
    };

    /**
     *
     */
    this.detachConversationListener = function () {
        if (conversationRef && connection) {
            $log.debug('detach conversation listener...');
            connection.deleteHandler(conversationRef);
        }
    };

    /**
     * Attach the listener after pubsub srv discovered
     * @param pubSubId
     */
    this.attachInvitationListener = function () {
        var self = this;

        //to monitor conversation invitation
        invitationRef = connection.addHandler(function (msg) {
            //new invitation will be captured here
            $log.debug(msg);

            var pubSubId = $(msg).attr('pubsub'),
                conversationId = $(msg).attr('conversation');

            self.subscribe(pubSubId, conversationId);

            return true;
        }, NS_PUBSUB_EVENT, 'message', 'normal');
    };

    /**
     *
     */
    this.detachInvitationListener = function () {
        if (invitationRef && connection) {
            $log.debug('detach conversation invitation listener...');
            connection.deleteHandler(invitationRef);
        }
    };

    /**
     * load history
     * @param pubSubId
     * @param recordId
     * @returns {*}
     */
    this.getPastConversation = function (pubSubId, recordId) {
        var deferred = $q.defer();

        connection.sendIQ(
            $iq({from: fullJabberId, to: pubSubId, type: 'get'})
                .c('pubsub', {xmlns: NS_PUBSUB}).c('items', {node: recordId}
            ),
            function (iq) {
                $log.debug(iq);
                deferred.resolve();
            },
            function (err) {
                $log(err);
                deferred.reject();
            }
        );

        return deferred.promise;
    };

    /**
     * Return all nodes that the current user subscribes
     * @param pubSubId
     * @returns {*}
     */
    this.getAllSubscriptionsByUser = function (pubSubId) {
        var deferred = $q.defer(), self = this;

        connection.sendIQ(
            $iq({from: fullJabberId, to: pubSubId, type: 'get'})
                .c('pubsub', {xmlns: NS_PUBSUB}).c('subscriptions'),
            function (iq) {
                var subHtmlNodes, jqNode, sub, metaPromise,
                    subscriptions = [], promises = [];
                $log.debug(iq);
                // loop all conversation nodes to aggregate the details of each node's subscriptions
                subHtmlNodes = $(iq).find('iq > pubsub > subscriptions > subscription');
                for (var i = 0, j = subHtmlNodes.length; i < j; i++) {
                    jqNode = $(subHtmlNodes[i]);
                    sub = {
                        conversationId: jqNode.attr('node'),
                        subscriber: jqNode.attr('jid'),
                        status: jqNode.attr('subscription'),
                        numberOfSubscriptions: 'N/A',
                        owner: null,
                        participants: [],
                        title: null
                    };

                    metaPromise = self.getConversationMetadata(pubSubId, sub.conversationId, sub).then(function (owner) {
                        var deferred = $q.defer();

                        if (owner === Strophe.getBareJidFromJid(fullJabberId)) {
                            //as per XEP-0060, only node owner can get subscription details of one specific node
                            return self.getAllSubscriptionsByRecord(pubSubId, sub.conversationId, sub);
                        }

                        deferred.resolve();
                        return deferred.promise;   // return an immediate resolved promise
                    });

                    subscriptions.push(sub);
                    promises.push(metaPromise);
                }

                $q.all(promises).then(function () {
                    deferred.resolve(subscriptions);
                });
            },
            function (err) {
                $log(err);
                deferred.reject();
            }
        );

        return deferred.promise;
    };

    /**
     * Acquire the meta-data of a specified conversation node
     * @param pubSubId
     * @param recordId
     * @returns {*}
     */
    this.getConversationMetadata = function (pubSubId, recordId, resultObj) {
        var deferred = $q.defer();

        connection.sendIQ(
            $iq({from: fullJabberId, to: pubSubId, type: 'get'})
                .c('query', {xmlns: Strophe.NS.DISCO_INFO, node: recordId}),
            function (iq) {
                $log.debug(iq);
                var theTitle = $(iq).find('iq > query > x >field[var="pubsub#title"] > value').text(),
                    theOwner = $(iq).find('iq > query > x >field[var="pubsub#owner"] > value').text();
                resultObj.title = theTitle.split('-')[1];
                resultObj.owner = theOwner;
                deferred.resolve(theOwner);
            },
            function (err) {
                $log(err);
                deferred.reject();
            }
        );

        return deferred.promise;
    };

    /**
     * Acquire all subscriptions for one conversation
     * @param pubSubId
     * @param recordId
     * @param resultObj
     * @returns {*}
     */
    this.getAllSubscriptionsByRecord = function (pubSubId, recordId, resultObj) {
        var deferred = $q.defer();

        connection.sendIQ(
            $iq({from: fullJabberId, to: pubSubId, type: 'get'})
                .c('pubsub', {xmlns: NS_PUBSUB_OWNER}).c('subscriptions', {node: recordId}),
            function (iq) {
                $log.debug(iq);
                var subHtmlNodes = $(iq).find('iq > pubsub > subscriptions > subscription');
                resultObj.numberOfSubscriptions = subHtmlNodes.length;
                for (var i = 0, j = subHtmlNodes.length; i < j; i++) {
                    resultObj.participants.push(Strophe.getBareJidFromJid($(subHtmlNodes[i]).attr('jid')));
                }

                deferred.resolve();
            },
            function (err) {
                $log(err);
                deferred.reject();
            }
        );

        return deferred.promise;
    };

    /**
     *
     * @param pubSubId
     * @param recordId
     */
    this.getNodeConfiguration = function (pubSubId, recordId) {

        var deferred = $q.defer();

        connection.sendIQ(
            $iq({to: pubSubId, type: 'get'}).c('pubsub', {'xmlns': NS_PUBSUB_OWNER}).c('configure', {node: recordId}),
            function (iq) {
                $log.debug(iq);
                deferred.resolve();
            },
            function (err) {
                $log(err);
                deferred.reject();
            }
        );
    }
});