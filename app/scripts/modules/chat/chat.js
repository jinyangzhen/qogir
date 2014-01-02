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
            templateUrl: modulePath + '/views/chat-session-view.html'
        })
        .state('home.chat.helpdesk', {
            url: '/helpdesk',
            templateUrl: modulePath + '/views/chat-helpdesk-view.html',
            controller: 'ChatHelpDeskCtrl'
        })
    ;

});