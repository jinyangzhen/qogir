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
            { field: 'conversationId', displayName: 'Record ID' },
            { field: 'title', displayName: 'Record Title' },
            { field: 'numberOfSubscriptions', displayName: 'Participant #' }
        ],
        data: 'chat.conversation.subscriptions',
        showSelectionCheckbox: true,
        multiSelect: false,
        enableHighlighting: true,
        checkboxCellTemplate: checkboxCellTemplate,
        rowTemplate: rowTemplate
    };

    $scope.createConversation = function () {
        XmppService.createConversationNode($scope.chat.conversation.pubSubId, 'SD1009');
        //immediate to subscribe the new conversation
        XmppService.subscribe($scope.chat.conversation.pubSubId, 'SD1009');
    };


    $scope.publishNote = function () {
        XmppService.publish($scope.chat.conversation.pubSubId, 'SD1004');
    };

    $scope.addParticipant = function () {
        XmppService.inviteParticipant($scope.chat.conversation.pubSubId, 'SD1009', 'admin@jinyangz6');
    };

    //refresh the subscriptions list of the current user
    XmppService.getAllSubscriptionsByUser($scope.chat.conversation.pubSubId).then(function (subscriptions){
        $scope.chat.conversation.subscriptions = subscriptions;
    });


});