'use strict';

angular.module('chat').controller('ChatMainCtrl', function ($scope, $state, XmppService, $modal, $timeout, $log, $window) {
    var chatWithModalInstance;

    if (!XmppService.isConnected()) {
        //prompt for login
        $state.go('home.login');
        return;
    }
    else {
        //go to default tab
        $state.go('home.chat.session');
    }

    $scope.connectionStatus = XmppService.getCurrentStatus();

    function createNewSession(jid, message /*optional*/) {
        var newSession = {
            counterpart: jid,
            inputMessage: '',
            history: []
        };

        if (message) {
            addChatEntry(newSession, jid, message);
        }

        //add to chat model
        $scope.chat.sessions.push(newSession);

        return newSession;
    }

    function addChatEntry(session, jid, message) {
        session.history.push({ userId: jid.split('@')[0], timestamp: Date.now(), message: message});
    }

    function scrollMessageDisplay() {
        //TODO move out dom population from controller
        $timeout(function () {
            var div = $('#msgDisplay').get(0);
            div.scrollTop = div.scrollHeight;
        });
    }

    function onReceiveMessage(message) {
        function extractMessage(message) {
            var body = $(message).find("html > body");

            if (body.length === 0) {
                body = $(message).find('body');
                if (body.length > 0) {
                    body = body.text()
                } else {
                    body = null;
                }
            } else {
                body = body.contents();

                var span = $("<span></span>");
                body.each(function () {
                    if (document.importNode) {
                        $(document.importNode(this, true)).appendTo(span);
                    } else {
                        // IE workaround
                        span.append(this.xml);
                    }
                });

                body = span;
            }

            return body;
        }

        var fullJid = $(message).attr('from'),
            jid = Strophe.getBareJidFromJid(fullJid),
            composing = $(message).find('composing'),
            body = extractMessage(message),
            existingSession = false;

        if (composing.length > 0) {
            $log.info(jid + 'is typing');
        }
        else {
            for (var i = 0, j = $scope.chat.sessions.length; i < j; i++) {
                if ($scope.chat.sessions[i].counterpart === jid) {
                    existingSession = true;
                    addChatEntry($scope.chat.sessions[i], jid, body);
                }
            }

            if (!existingSession) {
                createNewSession(jid, body);
            }
        }

        $timeout(scrollMessageDisplay);  //directly calling $scope.apply() within the frame causing the handler fail to execute,
        // move to next frame
        return true;  //keep on react instead of once
    }

    XmppService.registerChatHandler(onReceiveMessage);

    //define view model
    $scope.model = {
        panes: [
            {
                id: '_chat_session',
                head: 'Chat Session',
                state: 'home.chat.session',
                icon: 'icon-comments'
            }
        ]
    };

    $scope.getTabModel = function (id) {
        for (var i = 0, j = $scope.model.panes.length; i < j; i++) {
            if ($scope.model.panes[i].id === id) {
                return  $scope.model.panes[i];
            }
        }

        return  null;
    };

    //try to discover the server component supporting help desk feature
    XmppService.discoverFastpath().then(function (jid) {

        XmppService.discoverWorkgroup(jid).then(function (workgroups) {

            $scope.model.panes.push({
                id: '_help_desk',
                head: ' Help Desk',
                state: 'home.chat.helpdesk',
                icon: 'icon-storm',
                extra: function () {
                    var count = $scope.chat.helpdesk.queue ? $scope.chat.helpdesk.queue.count : 0;
                    return '(' + count + ')';
                }
            });

            $scope.model.panes.push({
                id: '_group_talk',
                head: ' Group Talk ',
                state: 'home.chat.group.list',
                icon: 'icon-user-group',
                extra: function () {
                    var length = $scope.chat.helpdesk.chatRoom.length;
                    return '(' + length + ')';
                }
            });

            $scope.chat.helpdesk = {
                selectedGroup: null,
                fastPathId: jid,
                groupList: workgroups,
                requestQueue: [],
                chatRoom: [],
                currentRoom: null
            };
        });

    });


    //define the domain model
    $scope.chat = {
        sessions: [],
        selectedIndex: null,
        currentSession: null,
        newBuddyName: ''
    };

    $scope.openChatWithDialog = function () {
        $scope.chat.newBuddyName = '';
        chatWithModalInstance = $modal.open({
            templateUrl: 'scripts/modules/chat/templates/chat-with-dialog-tmpl.html',
            scope: $scope
        });
    };

    $scope.proceedToStart = function () {
        $scope.chat.currentSession = createNewSession($scope.chat.newBuddyName);
        chatWithModalInstance.dismiss('saved');
    };

    $scope.proceedToCancel = function () {
        chatWithModalInstance.dismiss('cancel');
    };

    $scope.moveTo = function (session) {
        $scope.chat.currentSession = session;
    };

    $scope.send = function () {
        XmppService.sendMessage($scope.chat.currentSession.counterpart, $scope.chat.currentSession.inputMessage);

        addChatEntry(
            $scope.chat.currentSession,
            XmppService.getUser(),
            $scope.chat.currentSession.inputMessage
        );

        $scope.chat.currentSession.inputMessage = '';
        scrollMessageDisplay();
    };

    $scope.isCounterpartId = function (userId) {
        return $scope.chat.currentSession.counterpart.indexOf(userId) === 0;
    };

    $scope.callbacks.onQuit = XmppService.disconnect;
    $window.onbeforeunload = XmppService.disconnect;

});