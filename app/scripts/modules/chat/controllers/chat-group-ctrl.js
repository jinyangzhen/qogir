'use strict';

angular.module('chat').controller('ChatGroupCtrl', function ($scope, $state, $stateParams, XmppService, $log, $timeout) {

    $scope.getTabModel('_group_talk').active = true;


    function scrollMessageDisplay() {
        //TODO move out dom population from controller
        $timeout(function () {
            var div = $('#msgDisplay').get(0);
            div.scrollTop = div.scrollHeight;
        });
    }

    $scope.chatToRoom = function () {
        XmppService.chatToRoom($scope.chat.helpdesk.currentRoom.jid, $scope.chat.helpdesk.currentRoom.inputMessage);

        $scope.chat.helpdesk.currentRoom.history.push(
            {
                userId: $scope.chat.helpdesk.currentRoom.nickName,
                timestamp: Date.now(),
                message: $scope.chat.helpdesk.currentRoom.inputMessage
            }
        );

        $scope.chat.helpdesk.currentRoom.inputMessage = '';
        scrollMessageDisplay();
    };

    $scope.moveTo = function (room) {
        $scope.chat.helpdesk.currentRoom = room;
    };

    $scope.isCounterpartId = function (userId) {
        return $scope.chat.helpdesk.currentRoom.nickName !== userId;
    };

});
