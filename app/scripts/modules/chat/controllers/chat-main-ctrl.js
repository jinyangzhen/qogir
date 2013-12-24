'use strict';

angular.module('chat').controller('ChatMainCtrl', function ($scope, $state, XmppService, $modal, $timeout, $log, $window) {
    var chatWithModalInstance;

    if (!XmppService.isConnected()) {
        //prompt for login
        $state.go('home.login');
        return;
    }

    $scope.connectionStatus = XmppService.getCurrentStatus();
    $scope.user.jid = XmppService.getUser();


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

        $timeout(angular.noop);  //calling $scope.apply() within the frame causing the handler fail to execute, move to next frame

        return true;  //keep on react instead of once
    }

    XmppService.registerChatHandler(onReceiveMessage);

    //define the chat model
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

        //TODO move out dom population from controller
        $timeout(function () {
            var div = $('#msgDisplay').get(0);
            div.scrollTop = div.scrollHeight;
        });
    };


    $scope.isCounterpartId = function (userId){
        if ($scope.chat.currentSession.counterpart.indexOf(userId) === 0) {
            return true;
        }

        return false;
    };

    $scope.$on('$destroy', XmppService.disconnect);
    $window.onbeforeunload =  XmppService.disconnect;

});