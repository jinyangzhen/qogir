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
            '<div ng-cell></div></div>';

    $scope.getTabModel('_help_desk').active = true;

    $scope.queueGridOptions = {
        columnDefs: [
            { field: 'jid', displayName: 'Jabber ID' },
            { field: 'position', displayName: 'Position' },
            { field: 'waiting', displayName: 'Age' },
            { field: 'joinTime', displayName: 'Since' },
            { field: 'offering', displayName: 'Action', cellTemplate: actionCellTemplate, width:'230px' }
        ],
        data: 'chat.helpdesk.queue.items',
        showSelectionCheckbox: true,
        multiSelect: false,
        enableHighlighting: true,
        checkboxCellTemplate: checkboxCellTemplate,
        rowTemplate: rowTemplate,
        enableColumnResize: true  //resizable ng-grid seems to not able to refresh the viewport when sizing a column, need to look back
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
        if (offering) {
            return offering.leftTime;
        }
        else {
            return 'N/A';
        }
    };

    $scope.acceptIncomingCall = function (offering) {
        XmppService.acceptCall(offering).then(function (roomJid) {
            var newRoom = {
                jid: roomJid,
                nickName: null,
                participants: [],
                observables: [],
                history: []
            };

            XmppService.joinChatRoom(newRoom).then(function () {
                    XmppService.observeRoomMessage(newRoom);
                    //finally, push to the model representing 'group talk'
                    $scope.chat.helpdesk.chatRoom.push(newRoom);
                    $scope.chat.helpdesk.currentRoom = newRoom;
                    //then simply navigate to the view
                    $state.go('home.chat.group.detail', {roomId: newRoom.jid.split('@')[0]});
                    $log.debug(newRoom.observables);
                },
                function (error) {
                    $log.debug(error);
                });
        });
    };

    $scope.refuseIncomingCall = function (offering) {
         //TODO
    };

});