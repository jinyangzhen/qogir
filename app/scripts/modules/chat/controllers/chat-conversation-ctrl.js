'use strict';

angular.module('chat').controller('ChatConversationCtrl', function ($scope, $state, XmppService, $log, $q, PersistenceService, $timeout) {

    var idCellTemplate = '<div class="ngCellText" ng-class="col.colIndex()">' +
            '<span ng-cell-text>{{row.getProperty(col.field)}}&nbsp&nbsp </span>' +
            '<span class="label label-warning" class="fade-in-animation" ' +
            'ng-show="getUnreadNumber(row.getProperty(col.field))>0">{{getUnreadNumber(row.getProperty(col.field))}}</span></div>',

        checkboxCellTemplate = '<div class="ngSelectionCell checkboxes">' +
            '<label><input tabindex="-1" class="ngSelectionCheckbox" type="checkbox" ng-checked="row.selected" />' +
            '<span></span></label></div>',

        rowTemplate = '<div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}">' +
            '<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>' +
            '<div ng-cell></div></div>',

        systemOfRecordId,
        systemOfRecordType,
        taskPromise;

    //refresh the subscriptions list of the current user
    function getSubscriptionList() {
        $scope.chat.conversation.numberOfInvitation = 0;
        return XmppService.getAllSubscriptionsByUser($scope.chat.conversation.pubSubId).then(function (subscriptions) {
            $scope.chat.conversation.subscriptions = subscriptions;
        });
    }

    function checkSystemOfRecordFromLocalStorage() {
        systemOfRecordId = PersistenceService.getItemRawValue('webchat.context.id');
        systemOfRecordType = PersistenceService.getItemRawValue('webchat.context.objectName')
        $scope.systemOfRecordId = systemOfRecordId;
        taskPromise = $timeout(checkSystemOfRecordFromLocalStorage, 250);
    }

    checkSystemOfRecordFromLocalStorage();

    $scope.$on('$destroy', function () {
        $timeout.cancel(taskPromise); //cancel any pending check task
    });

    $scope.getTabModel('_chat_conversation').active = true;

    $scope.getUnreadNumber = function (recordId) {
        if (recordId !== $scope.selectedConversationId && $scope.chat.conversation.map[recordId]) {
            return  $scope.chat.conversation.map[recordId].numberOfUnread;
        }
        else {
            //if view the current selected conversation, assume user will see the post immediately, no info badge needed.
            return 0;
        }

    };

    //view model
    $scope.isParticipantPanelExpand = false;
    $scope.participantsToInvite = [];
    $scope.draftMessage = '';
    $scope.conversationGridOptions = {
        columnDefs: [
            { field: 'conversationId', displayName: 'Record ID', cellTemplate: idCellTemplate },
            { field: 'title', displayName: 'Record Title' },
            { field: 'owner', displayName: 'Owner' },
            { field: 'numberOfSubscriptions', displayName: 'Number of Participant' }
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

        //force to close the expanded participant panel when switch btw conversations
        $scope.isParticipantPanelExpand = false;
        //also clean up the view model
        $scope.participantsToInvite = [];

        if (previousItems.length === 1) {
            previousId = previousItems[0].conversationId;

            if ($scope.chat.conversation.map[previousId]) {
                //reset number of unread when leaving the conversation
                $scope.chat.conversation.map[previousId].numberOfUnread = 0;
            }
        }

        if (selectedItems.length === 1) {
            $scope.currentSubscription = selectedItems[0];
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
                return XmppService.createConversationNode($scope.chat.conversation.pubSubId, systemOfRecordId, systemOfRecordType);
            },

            subscribe = function () {
                return XmppService.subscribe($scope.chat.conversation.pubSubId, systemOfRecordId);
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

    $scope.isSubscriptionOwner = function () {
        if($scope.currentSubscription) {
            return $scope.currentSubscription.owner === XmppService.getUser();
        }

        return false;
    };

    $scope.publishNote = function ($event) {
        XmppService.publish($scope.chat.conversation.pubSubId, $scope.selectedConversationId, $scope.draftMessage).then(function () {
            $scope.draftMessage = '';
        });
        $event.preventDefault();
    };

    function convertToTreeViewModel(node) {
        var result = {
            label: '',
            data: {}
        };

        if (node.groupId) {
            //this node is a group
            result.label = node.groupName;
            result.data.type = 'group';
            result.children = [];
        }
        else if (node.id) {
            //this is a user
            result.label = node.id;
            result.data.type = 'user';
        }

        if (node.groups) {
            //contain subgroup
            for (var i = 0, j = node.groups.length; i < j; i++) {
                result.children.push(convertToTreeViewModel(node.groups[i]));
            }
        }
        else if (node.users) {
            //contain users
            for (var m = 0, n = node.users.length; m < n; m++) {
                result.children.push(convertToTreeViewModel(node.users[m]));
            }
        }

        return result;
    }

    $scope.handleTreeSelect = function (branch) {
        var userName;

        if (branch.data.type === 'user') {
            userName = branch.label;
            for (var i = 0, j = $scope.participantsToInvite.length; i < j; i++) {
                if ($scope.participantsToInvite[i] === userName) {
                    $scope.participantsToInvite.splice(i);
                    return;
                }
            }
            $scope.participantsToInvite.push(userName);
        }
    };


    $scope.displayParticipantPanel = function () {
        if ($scope.selectedConversationId) {
            if (!$scope.suggestedGroups || $scope.suggestedGroups.label !== $scope.selectedConversationId) {
                //initialize the group for the conversation
                XmppService.getSuggestedUsers($scope.currentSubscription.type, $scope.currentSubscription.conversationId).then(function (group) {
                    $scope.suggestedGroups = convertToTreeViewModel(group);
                });
            }
            $scope.isParticipantPanelExpand = !$scope.isParticipantPanelExpand;
        }
        else {
            //TODO visually disable the btn if conversation not selected
            $log.warn('please select one covnersation');
        }
    };

    $scope.inviteParticipant = function () {
        var promises = [];

        if ($scope.selectedConversationId) {
            for (var i = 0, j = $scope.participantsToInvite.length; i < j; i++) {
                promises.push(XmppService.inviteParticipant(
                    $scope.chat.conversation.pubSubId,
                    $scope.selectedConversationId,
                    $scope.participantsToInvite[i]
                ));
            }

            $q.all(promises).then(function () {
                $scope.participantsToInvite.length = 0;
                $scope.isParticipantPanelExpand = false;
            });
        }
        else {
            //TODO visually disable the btn if conversation not selected
            $log.warn('please select one covnersation');
        }
    };

    $scope.closeParticipantPanel = function () {
        $scope.isParticipantPanelExpand = false;
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

    //preload the subscription list
    getSubscriptionList();
});