'use strict';

angular.module('chat').controller('ChatHelpDeskCtrl', function ($scope, $state, XmppService) {

    $scope.queueGridOptions = {data: 'chat.helpdesk.requestQueue'};

    $scope.joinGroup = function (group) {
        XmppService.loginWorkgroup(group, $scope.chat.helpdesk.requestQueue);
    };


});