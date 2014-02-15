'use strict';

angular.module('chat').controller('ChatConversationCtrl', function ($scope, $state, XmppService, $log) {

    var checkboxCellTemplate = '<div class="ngSelectionCell checkboxes">' +
            '<label><input tabindex="-1" class="ngSelectionCheckbox" type="checkbox" ng-checked="row.selected" />' +
            '<span></span></label></div>',

        rowTemplate = '<div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}">' +
            '<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>' +
            '<div ng-cell></div></div>';

    //refresh the subscriptions list of the current user
    function getSubscriptionList() {
        return XmppService.getAllSubscriptionsByUser($scope.chat.conversation.pubSubId).then(function (subscriptions) {
            $scope.chat.conversation.subscriptions = subscriptions;
        });
    }

    $scope.getTabModel('_chat_conversation').active = true;

    //view model
    $scope.draftMessage = '';
    $scope.conversationGridOptions = {
        columnDefs: [
            { field: 'conversationId', displayName: 'Record ID' },
            { field: 'title', displayName: 'Record Title' },
            { field: 'owner', displayName: 'Owner' },
            { field: 'numberOfSubscriptions', displayName: 'Participant #' }
        ],
        data: 'chat.conversation.subscriptions',
        showSelectionCheckbox: true,
        multiSelect: false,
        enableHighlighting: true,
        checkboxCellTemplate: checkboxCellTemplate,
        rowTemplate: rowTemplate,
        selectedItems: []
    };

    $scope.$watch('draftMessage', function (newValue) {
        if($scope.chat.conversation.map[$scope.selectedConversationId]){
            $scope.chat.conversation.map[$scope.selectedConversationId].draftMessage = newValue;
        }
    });

    $scope.$watch('conversationGridOptions.selectedItems', function (selectedItems) {
        if (selectedItems.length === 1) {
            $scope.selectedConversationId = selectedItems[0].conversationId;

            if ($scope.chat.conversation.map[$scope.selectedConversationId] === undefined) {
                //not found, initialize the model for this conversation
                $scope.chat.conversation.map[$scope.selectedConversationId] = {
                    initLoad: false,
                    draftMessage: '',
                    notes: []
                }
            }

            $scope.draftMessage = $scope.chat.conversation.map[$scope.selectedConversationId].draftMessage;

            if (!$scope.chat.conversation.map[$scope.selectedConversationId].initLoad) {
                //if the init load not complete, try to load all history
                XmppService.getPastConversation($scope.chat.conversation.pubSubId, $scope.selectedConversationId).then(
                    function () {
                        $scope.chat.conversation.map[$scope.selectedConversationId].initLoad = true;
                    }
                )
            }
        }
    }, true);


    $scope.createConversation = function () {
        var createNode = function () {
                return XmppService.createConversationNode($scope.chat.conversation.pubSubId, 'SD1017');
            },

            subscribe = function () {
                return XmppService.subscribe($scope.chat.conversation.pubSubId, 'SD1017');
            };

        createNode().then(subscribe()).then(getSubscriptionList());
    };

    $scope.publishNote = function ($event) {
        XmppService.publish($scope.chat.conversation.pubSubId, $scope.selectedConversationId,  $scope.draftMessage ).then(function () {
            $scope.draftMessage = '';
        });
        $event.preventDefault();
    };

    $scope.addParticipant = function () {
        if ($scope.selectedConversationId) {
            XmppService.inviteParticipant($scope.chat.conversation.pubSubId, $scope.selectedConversationId, 'admin');
        }
        else {
            //TODO visually disable the btn if conversation not selected
            $log.warn('please select one covnersation');
        }
    };

    $scope.unsubscribe = function () {
        if ($scope.selectedConversationId) {
            XmppService.unsubscribe($scope.chat.conversation.pubSubId, $scope.selectedConversationId).then(getSubscriptionList());
        }
        else {
            //TODO visually disable the btn if conversation not selected
            $log.warn('please select one covnersation');
        }
    };

    $scope.refreshConversationList = getSubscriptionList;

    getSubscriptionList();
});