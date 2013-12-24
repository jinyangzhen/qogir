'use strict';

angular.module('main').controller('MainCtrl', function ($scope, $state, $modal, exceptionObj, PersistenceService, UserService) {
    var configModalInstance;

    $scope.config = {};
    $scope.error = { current: exceptionObj.error};
    $scope.callbacks = {
        onChangeConfig: angular.noop   // to be overridden by interested nested controller
    };

    $scope.openConfigDialog = function () {
        //
        //TODO bosh configuration specific to chat module, need to refactor
        //
        $scope.config.boshEndpoint = PersistenceService.getItem('bosh_service') || '';
        configModalInstance = $modal.open({
            templateUrl: 'scripts/modules/main/templates/config-dialog-tmpl.html',
            scope: $scope
        });
    };

    $scope.proceedToSave = function () {
        //
        //TODO bosh configuration specific to chat module, need to refactor
        //
        PersistenceService.setItem('bosh_service', $scope.config.boshEndpoint);
        configModalInstance.dismiss('saved');
        $scope.callbacks.onChangeConfig('bosh_service');
    };

    $scope.proceedToCancel = function () {
        configModalInstance.dismiss('cancel');
    };

    $scope.quit = function (){
        UserService.logout();
        $state.go('home.login');
    };

    $scope.getCurrentUser = function (){
        return UserService.getCurrentUser();
    };

    $state.go('home.chat');
});