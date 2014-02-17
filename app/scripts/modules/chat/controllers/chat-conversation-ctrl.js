'use strict';

angular.module('chat').controller('ChatConversationCtrl', function ($scope, $state, XmppService, $log) {

    var idCellTemplate = '<div class="ngCellText" ng-class="col.colIndex()">' +
            '<span ng-cell-text>{{row.getProperty(col.field)}}&nbsp&nbsp </span>' +
            '<span class="label label-warning" class="fade-in-animation" ' +
            'ng-if="getUnreadNumber(row.getProperty(col.field))>0">{{getUnreadNumber(row.getProperty(col.field))}}</span></div>',

        checkboxCellTemplate = '<div class="ngSelectionCell checkboxes">' +
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

    $scope.getUnreadNumber = function (recordId){
        if(recordId !== $scope.selectedConversationId && $scope.chat.conversation.map[recordId]) {
            return  $scope.chat.conversation.map[recordId].numberOfUnread;
        }
        else {
            //if view the current selected conversation, assume user will see the post immediately, no info badge needed.
            return 0;
        }

    };

    //view model
    $scope.draftMessage = '';
    $scope.conversationGridOptions = {
        columnDefs: [
            { field: 'conversationId', displayName: 'Record ID', cellTemplate: idCellTemplate },
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
        if ($scope.chat.conversation.map[$scope.selectedConversationId]) {
            $scope.chat.conversation.map[$scope.selectedConversationId].draftMessage = newValue;
        }
    });

    $scope.$watch('conversationGridOptions.selectedItems', function (selectedItems, previousItems) {
        var previousId;

        if (previousItems.length === 1) {
            previousId = previousItems[0].conversationId;

            if ($scope.chat.conversation.map[previousId]) {
                //reset number of unread when leaving the conversation
                $scope.chat.conversation.map[previousId].numberOfUnread = 0;
            }
        }

        if (selectedItems.length === 1) {
            $scope.selectedConversationId = selectedItems[0].conversationId;

            if ($scope.chat.conversation.map[$scope.selectedConversationId] === undefined) {
                //not found, initialize the model for this conversation
                $scope.chat.conversation.map[$scope.selectedConversationId] = {
                    initLoad: false,
                    numberOfUnread: 0,
                    draftMessage: '',
                    notes: []
                }
            }

            $scope.draftMessage = $scope.chat.conversation.map[$scope.selectedConversationId].draftMessage;

            if (!$scope.chat.conversation.map[$scope.selectedConversationId].initLoad) {
                //if the init load not complete, try to load all history
                XmppService.getPastConversation(
                        $scope.chat.conversation.pubSubId,
                        $scope.selectedConversationId,
                        $scope.chat.conversation.map[$scope.selectedConversationId].notes).then(
                    function () {
                        $scope.chat.conversation.map[$scope.selectedConversationId].initLoad = true;
                    }
                )
            }
        }
    }, true);


    $scope.openConversation = function () {
        var createNode = function () {
                return XmppService.createConversationNode($scope.chat.conversation.pubSubId, 'SD1019');
            },

            subscribe = function () {
                return XmppService.subscribe($scope.chat.conversation.pubSubId, 'SD1019');
            };

        //try to subscribe first, if conversation not exist, create one.
        subscribe().then(
            function () {
                $log.debug('subscribe in success');
                getSubscriptionList();
            },
            function (code) {
                if (code === 404) {
                    createNode().then(subscribe()).then(getSubscriptionList());
                }
            }
        );
    };

    $scope.publishNote = function ($event) {
        XmppService.publish($scope.chat.conversation.pubSubId, $scope.selectedConversationId, $scope.draftMessage).then(function () {
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

    $scope.formatTimestamp = function (timestamp) {
        var time = new Date(parseInt(timestamp));
        return time.toLocaleString();
    };

    $scope.refreshConversationList = getSubscriptionList;

    getSubscriptionList();
});