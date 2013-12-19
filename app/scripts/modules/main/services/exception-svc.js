angular.module('main').value('exceptionObj', {error:''}).factory('$exceptionHandler', function ($log, exceptionObj) {
    'use strict';
    return function (exception, cause) {
        //override default exception handler
        exception.message += ' (caused by "' + cause + '")';
        $log.error(exception);
        exceptionObj.error = exception.message;
    };
});