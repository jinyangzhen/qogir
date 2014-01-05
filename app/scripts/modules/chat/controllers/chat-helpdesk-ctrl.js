'use strict';

angular.module('chat').controller('ChatHelpDeskCtrl', function ($scope, $state, XmppService) {

    var actionCellTemplate = '<div style="padding: 4px">&nbsp<span class="label label-success">Accept</span>&nbsp<strong>or</strong>&nbsp' +
        '<span class="label label-important">Refuse</span>&nbsp<strong> in 20 seconds </strong></div>';

    $scope.queueGridOptions = {
        columnDefs: [
            { field: 'jid', displayName: 'Jabber ID' },
            { field: 'position', displayName: 'Position' },
            { field: 'waiting', displayName: 'Age' },
            { field: 'joinTime', displayName: 'Since' },
            { field: 'Action', displayName: 'Action', cellTemplate: actionCellTemplate },
        ],
        data: 'chat.helpdesk.queue.items',
        multiSelect: false,
        enableHighlighting: true};

    $scope.joinGroup = function (group) {
        if ($scope.chat.helpdesk.currentGroup !== group) {
            XmppService.logoutWorkgroup();
            XmppService.loginWorkgroup(group, $scope.chat.helpdesk);
            $scope.chat.helpdesk.currentGroup = group;
        }
    };


});