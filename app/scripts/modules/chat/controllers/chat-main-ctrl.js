'use strict';

angular.module('chat').controller('ChatMainCtrl', function ($scope, $state, XmppService, $modal, $timeout, $log) {
    var chatWithModalInstance;

    if (!XmppService.isConnected()) {
        //prompt for login
        $state.go('home.login');
        return;
    }

    $scope.connectionStatus = XmppService.getCurrentStatus();
    $scope.user.jid = XmppService.getUser();


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
                if ($scope.chat.sessions[i].jid === jid) {
                    existingSession = true;
                    $scope.chat.sessions[i].history.push({ timestamp: Date.now(), message: body});
                }
            }

            if (!existingSession) {
                //add a new session
                $scope.chat.sessions.push({
                    jid: jid,
                    inputMessage: '',
                    history: [
                        { timestamp: Date.now(), message: body}
                    ]
                });
            }
        }

        $timeout(angular.noop);

        return true;  //keep on react
    };

    XmppService.registerChatHandler(onReceiveMessage);

    //define the chat model
    $scope.chat = {
        sessions: [],
        selectedIndex: null,
        currentSession: null,
        newPeopleName: ''
    };

    $scope.openChatWithDialog = function () {
        $scope.chat.newPeopleName = '';
        chatWithModalInstance = $modal.open({
            templateUrl: 'scripts/modules/chat/templates/chat-with-dialog-tmpl.html',
            scope: $scope
        });
    };

    $scope.proceedToStart = function () {
        var newSession = {
            jid: $scope.chat.newPeopleName,
            inputMessage: '',
            history: []
        };

        $scope.chat.sessions.push(newSession);
        $scope.chat.currentSession = newSession;
        chatWithModalInstance.dismiss('saved');
    };

    $scope.proceedToCancel = function () {
        chatWithModalInstance.dismiss('cancel');
    };

    $scope.moveTo = function (session) {
        $scope.chat.currentSession = session;
    };

    $scope.send = function () {
        XmppService.sendMessage($scope.chat.currentSession.jid, $scope.chat.currentSession.inputMessage);
        $scope.chat.currentSession.history.push({ timestamp: Date.now(), message: $scope.chat.currentSession.inputMessage});
        $scope.chat.currentSession.inputMessage = '';

        //TODO move out dom ops from controller
        $timeout(function () {
            var div = $('#msgDisplay').get(0);
            div.scrollTop = div.scrollHeight;
        });
    };


});