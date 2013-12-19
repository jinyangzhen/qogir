'use strict';

angular.module('chat').controller('ChatMainCtrl', function ($scope, $state, XmppService) {

    if (!XmppService.isConnected()) {
        //not login, render the login view
        $state.go('home.login');
        return;
    }

    $scope.connectionStatus = XmppService.getCurrentStatus();
    $scope.user.jid = XmppService.getUser();

});