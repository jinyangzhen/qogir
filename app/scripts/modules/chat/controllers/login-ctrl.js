'use strict'

angular.module('chat').controller('LoginCtrl', function ($scope, $state, $log, PersistenceService, XmppService) {

    $scope.model = {};

    $scope.callbacks.onChangeConfig = function () {
        XmppService.setBoshServiceEndpoint(PersistenceService.getItem('bosh_service'));
    };


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