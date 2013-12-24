'use strict'

angular.module('chat').controller('LoginCtrl', function ($scope, $state, $log, PersistenceService, XmppService) {

    $scope.model = {};

    $scope.callbacks.onChangeConfig = function () {
        XmppService.resetBoshEndpoint(PersistenceService.getItem('bosh_service'));
    };

    $scope.login = function () {
        XmppService.connect($scope.model.jid, $scope.model.password).then(function () {
                $state.go('home.chat');
            },
            function (error) {
                XmppService.disconnect(); //terminate the unused session if any
                $log.error('fail to connect cos '+ error);
                $scope.model.connectionErr = error;
            }
        );
    };

    $scope.status = function () {
        return XmppService.getCurrentStatus();
    }

})