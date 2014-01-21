'use strict';

/**
 * config route for chat module
 */

angular.module('chat', ['main']).config(function ($stateProvider) {

    var modulePath = 'scripts/modules/chat';

    $stateProvider.state('home.login', {
        url: '/login',
        templateUrl: modulePath + '/views/login-view.html',
        controller: 'LoginCtrl'
    })
        .state('home.chat', {
            url: '/chat',
            templateUrl: modulePath + '/views/chat-main-view.html',
            controller: 'ChatMainCtrl'
        })
        .state('home.chat.session', {
            url: '/session',
            templateUrl: modulePath + '/views/chat-session-view.html',
            controller: 'ChatSessionCtrl'
        })
        .state('home.chat.helpdesk', {
            url: '/helpdesk',
            templateUrl: modulePath + '/views/chat-helpdesk-view.html',
            controller: 'ChatHelpDeskCtrl'
        })
        .state('home.chat.group', {
            abstract: true,
            url: '/group',
            templateUrl: modulePath + '/views/chat-group-view.html',
            controller: 'ChatGroupCtrl'
        })
        .state('home.chat.group.list', {
            url: ''
        })
        .state('home.chat.group.detail', {
            url: '/{roomId:[a-zA-Z0-9]{1,12}}'  //openfire room usually identified with 9 chars (alphabet + number)
        });
    ;

});