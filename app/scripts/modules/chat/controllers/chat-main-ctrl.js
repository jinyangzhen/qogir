'use strict';

angular.module('chat').controller('ChatMainCtrl', function ($scope, $state, XmppService, $modal, $timeout, $log, $window) {
    var chatWithModalInstance,

        discoverPubsub = function () {
        return XmppService.discoverPubsub().then(function (jid) {
            $scope.model.panes.push({
                id: '_chat_conversation',
                head: 'Conversation',
                state: 'home.chat.conversation',
                icon: 'icon-comments'
            });

            $scope.chat.conversation = {
                pubSubId: jid
            };

            XmppService.attachConversationListener(jid);
            XmppService.attachInvitationListener();
        });
        },

        discoverFastpath = function () {
            return  XmppService.discoverFastpath().then(function (jid) {
                return jid;
            })
        },

        discoverWorkgroup = function (jid) {
            return XmppService.discoverWorkgroup(jid).then(function (workgroups) {

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
        };

    if (!XmppService.isConnected()) {
        //prompt for login
        $state.go('home.login');
        return;
    }
    else {
        //go to default tab
        $state.go('home.chat.conversation');
    }

    $scope.connectionStatus = XmppService.getCurrentStatus();

    //define view model
    $scope.model = {
        panes: []
    };

    //define the domain model
    $scope.chat = {};

    $scope.getTabModel = function (id) {
        for (var i = 0, j = $scope.model.panes.length; i < j; i++) {
            if ($scope.model.panes[i].id === id) {
                return  $scope.model.panes[i];
            }
        }
        return  null;
    };

    discoverPubsub().then(discoverFastpath).then(discoverWorkgroup).then(function (){
        //IMPORTANT: only after all services initialized, make the user presence available on the server
        //Because server sends offline msg as long as a user's presence is available, so we have to make sure correct
        //initialization order to prepare all kinds of messages' listener.
         XmppService.presence();
    });

    $scope.callbacks.onQuit = XmppService.disconnect;
    $window.onbeforeunload = XmppService.disconnect;


    $scope.$on('$destroy', function () {
        XmppService.detachConversationListener();
        XmppService.detachInvitationListener();
    })
});