'use strict';

angular.module('chat').controller('ChatHelpDeskCtrl', function ($scope, $state, XmppService, $log) {

    var actionCellTemplate = '<div class="fade-in-animation" ng-if="row.getProperty(col.field)" ng-show="showActionPanel(row.getProperty(col.field))" style="padding: 4px">' +
            '&nbsp<span class="label label-success tag-btn" ng-click="acceptIncomingCall(row.getProperty(col.field))">Accept</span>&nbsp<strong>or</strong>' +
            '&nbsp<span class="label label-important tag-btn" ng-click="refuseIncomingCall(row.getProperty(col.field))">Refuse</span>&nbsp<strong> in {{showLeftTime(row.getProperty(col.field))}} seconds </strong>' +
            '</div>',

        checkboxCellTemplate = '<div class="ngSelectionCell checkboxes">' +
            '<label><input tabindex="-1" class="ngSelectionCheckbox" type="checkbox" ng-checked="row.selected" />' +
            '<span></span></label></div>',

        rowTemplate = '<div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}">' +
            '<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>' +
            '<div ng-cell></div></div>'

    $scope.queueGridOptions = {
        columnDefs: [
            { field: 'jid', displayName: 'Jabber ID' },
            { field: 'position', displayName: 'Position' },
            { field: 'waiting', displayName: 'Age' },
            { field: 'joinTime', displayName: 'Since' },
            { field: 'offering', displayName: 'Action', cellTemplate: actionCellTemplate }
        ],
        data: 'chat.helpdesk.queue.items',
        showSelectionCheckbox: true,
        multiSelect: false,
        enableHighlighting: true,
        checkboxCellTemplate: checkboxCellTemplate,
        rowTemplate: rowTemplate
    };

    $scope.joinGroup = function (group) {
        if ($scope.chat.helpdesk.currentGroup !== group) {
            XmppService.logoutWorkgroup();
            XmppService.loginWorkgroup(group, $scope.chat.helpdesk);
            $scope.chat.helpdesk.currentGroup = group;
        }
    };


    $scope.showActionPanel = function (offering) {
        return offering ? offering.available || false : false;
    };

    $scope.showLeftTime = function (offering) {
        if(offering){
            return offering.leftTime;
        }
        else {
            return 'N/A';
        }
    };

    $scope.acceptIncomingCall = function (offering) {
        XmppService.acceptCall(offering).then(function(roomJid){
            XmppService.joinChatRoom(roomJid).then(function(jointResult){
                 $log.debug(jointResult);
            },
            function (error){
                $log.debug(error);
            });
        });
    };

    $scope.refuseIncomingCall = function (offering){

    };

});