'use strict';

angular.module('main').controller('MainCtrl', function ($scope, $state, exceptionObj) {
    $scope.user = {};
    $scope.currentError = exceptionObj.error;
    $state.go('home.chat');
});