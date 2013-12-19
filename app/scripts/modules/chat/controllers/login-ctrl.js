'use strict'

angular.module('chat').controller('LoginCtrl', function ($scope, $state, $log, XmppService) {

    $scope.model = {};

    $scope.login = function () {
        XmppService.connect($scope.model.jid, $scope.model.password).then(function () {
                $state.go('home.chat');
            },
            function () {
                $log.error('fail to connect');
            }
        );
    };

    $scope.status = function () {
        return XmppService.getCurrentStatus();
    }

})