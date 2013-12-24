'use strict'

angular.module('chat').controller('LoginCtrl', function ($scope, $state, $log, PersistenceService, XmppService) {
    var CREDENTIAL_KEY = 'k2_credential', existingCredential;

    $scope.model = {};

    existingCredential = PersistenceService.getItem(CREDENTIAL_KEY);

    if(existingCredential){
        $scope.model.rememberMe = true;
        $scope.model.jid = existingCredential.jid;
        $scope.model.password = existingCredential.password;
    }

    $scope.callbacks.onChangeConfig = function () {
        XmppService.resetBoshEndpoint(PersistenceService.getItem('bosh_service'));
    };

    $scope.login = function () {
        XmppService.connect($scope.model.jid, $scope.model.password).then(function () {
                if($scope.model.rememberMe){
                    PersistenceService.setItem(CREDENTIAL_KEY, {jid:$scope.model.jid, password:$scope.model.password})
                }
                else {
                    PersistenceService.removeItem(CREDENTIAL_KEY);
                }

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