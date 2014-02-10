'use strict';

angular.module('chat').controller('ChatConversationCtrl', function ($scope, $state, XmppService, $log) {

    var checkboxCellTemplate = '<div class="ngSelectionCell checkboxes">' +
            '<label><input tabindex="-1" class="ngSelectionCheckbox" type="checkbox" ng-checked="row.selected" />' +
            '<span></span></label></div>',

        rowTemplate = '<div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}">' +
            '<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>' +
            '<div ng-cell></div></div>';

    $scope.getTabModel('_chat_conversation').active = true;

    $scope.conversationGridOptions = {
        columnDefs: [
            { field: 'id', displayName: 'Record ID' },
            { field: 'type', displayName: 'Record Type' },
            { field: 'since', displayName: 'Age' },
            { field: 'numberOfParticipants', displayName: 'Participant #' }
        ],
        data: 'chat.conversation.items',
        showSelectionCheckbox: true,
        multiSelect: false,
        enableHighlighting: true,
        checkboxCellTemplate: checkboxCellTemplate,
        rowTemplate: rowTemplate
    };

    $scope.chat.conversation = {
        items: [
            {
                id: 'SD10000',
                type: 'Interaction',
                since: Date.now(),
                numberOfParticipants: 4
            }
        ]
    };


    $scope.createConversation = function (){

    };
});