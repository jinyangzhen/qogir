'use strict';

angular.module('chat').controller('ChatSessionCtrl', function ($scope, $state, XmppService, $log) {

    $scope.getTabModel('_chat_session').active = true;
});