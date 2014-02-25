/**
 * simply wrap service on top of local storage currently
 */
angular.module('main').service('PersistenceService', function () {

    /**
     *
     * @param key
     * @param value
     */
    this.setItem = function (key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    };

    /**
     *
     * @param key
     * @returns {*}  undefined if the item is non exist
     */
    this.getItem = function (key) {
        var value = localStorage.getItem(key);
        return  value === 'undefined' ? undefined : JSON.parse(value);  //chrome would return 'undefined' string for non-exist item.
    };

    this.getItemRawValue = function (key) {
        return localStorage.getItem(key);
    };

    this.removeItem = function (key) {
        localStorage.removeItem(key);
    }

});