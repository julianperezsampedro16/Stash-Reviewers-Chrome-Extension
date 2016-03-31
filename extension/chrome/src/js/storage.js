var storage = (function() {
    'use strict';

    const REVIEWERS_KEY = 'stashplugin.groups_reviewers';
    const HIPCHAT_KEY = 'stashplugin.hipchat';
    const JUNCTION_KEY = 'stashplugin.junction';

    /**
        @method
        @memberof storage
        @see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.set}
    */
    function saveGroups(string, callback) {
        var data = {};
        data[REVIEWERS_KEY] = string
        chrome.storage.sync.set(data, callback);
    }

    /**
        @method
        @memberof storage
        @see {@link https://developer.chrome.com/apps/storage#type-StorageArea|StorageArea.get}
    */
    function loadGroups(callback) {
        chrome.storage.sync.get(null, function(items){
            if (callback) { 
                var groups = items[REVIEWERS_KEY];
                if(!groups) {
                    $.get(chrome.extension.getURL('/js/default.json'), function(data) {
                      callback(data);
                    });
                }
                else {
                    callback(groups);
                }
                
            }
        });
    }

    function loadHipChatUsername(callback) {
        chrome.storage.sync.get(null, function(items){
            if (callback) {                 
                callback(items[HIPCHAT_KEY]);                
            }
        });
    }

    function saveHipChatUsername(string, callback) {
        var data = {};
        data[HIPCHAT_KEY] = string
        chrome.storage.sync.set(data, callback);
    }

    function saveJunction(string, callback) {
        var data = {};
        data[JUNCTION_KEY] = string
        chrome.storage.sync.set(data, callback);
    }

    function loadJunction(callback) {
        chrome.storage.sync.get(null, function(items){
            if (callback) {
                callback(items[JUNCTION_KEY] || ''); // Default junction is empty
            }
        });
    }

    return {
        saveGroups,
        loadGroups,
        loadHipChatUsername,
        saveHipChatUsername,
        saveJunction,
        loadJunction
    };
})();