'use strict';

/**
 * config route for chat module
 */

angular.module('chat', ['main']).config(function ($stateProvider) {

    var modulePath = 'scripts/modules/chat';

    $stateProvider.state('home.chat', {
        url: 'chat',
        templateUrl: modulePath + '/views/chat-main-view.html',
        controller: 'ChatMainCtrl'
    }).state('home.login', {
            url: 'login',
            templateUrl: modulePath + '/views/login-view.html',
            controller: 'LoginCtrl'
        });

});