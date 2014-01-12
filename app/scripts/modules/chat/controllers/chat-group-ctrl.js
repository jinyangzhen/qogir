'use strict';

angular.module('chat').controller('ChatGroupCtrl', function ($scope, $state, $stateParams, XmppService, $log) {

    $scope.getTabModel('_group_talk').active = true;

});
