/**
 * Personium
 * Copyright 2017 FUJITSU LIMITED
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * The followings should be shared among applications and/or within the same application.
 */
var Common = {};

//Default timeout limit - 60 minutes.
Common.IDLE_TIMEOUT =  3600000;
// 55 minutes
Common.IDLE_CHECK = 3300000;
// Records last activity time.
Common.lastActivity = new Date().getTime();

Common.accessData = {
    cellUrl: null,
    token: null,
    refToken: null
};

/*
 * The followings should be shared among applications and/or within the same application.
 */
$(document).ready(function() {
    i18next
        .use(i18nextXHRBackend)
        .use(i18nextBrowserLanguageDetector)
        .init({
            fallbackLng: 'en',
            ns: getNamesapces(),
            defaultNS: 'common',
            debug: true,
            backend: {
                // load from i18next-gitbook repo
                loadPath: './locales/{{lng}}/{{ns}}.json',
                crossDomain: true
            }
        }, function(err, t) {
            Common.initJqueryI18next();
            
            // define your own additionalCallback for each App/screen
            if ((typeof additionalCallback !== "undefined") && $.isFunction(additionalCallback)) {
                additionalCallback();
            }

            Common.updateContent();
        });
});

/*
 * Need to move to a function to avoid conflicting with the i18nextBrowserLanguageDetector initialization.
 */
Common.initJqueryI18next = function() {
    // for options see
    // https://github.com/i18next/jquery-i18next#initialize-the-plugin
    jqueryI18next.init(i18next, $, {
        useOptionsAttr: true
    });
}

Common.updateContent = function() {
    // start localizing, details:
    // https://github.com/i18next/jquery-i18next#usage-of-selector-function
    $('[data-i18n]').localize();
}

/*
 * Initialize info for idling check
 */
Common.setIdleTime = function() {
    // Create Session Expired Modal
    Common.appendSessionExpiredDialog();

    Common.refreshToken();

    // check 5 minutes before session expires (60minutes)
    Common.checkIdleTimer = setInterval(Common.checkIdleTime, Common.IDLE_CHECK);

    $(document).on('click mousemove keypress', function (event) {
        Common.lastActivity = new Date().getTime();
    });
}

Common.appendSessionExpiredDialog = function() {
    // Session Expiration
    var html = [
        '<div id="modal-session-expired" class="modal fade" role="dialog" data-backdrop="static">',
            '<div class="modal-dialog">',
                '<div class="modal-content">',
                    '<div class="modal-header login-header">',
                        '<h4 class="modal-title" data-i18n="sessionExpiredDialog.title"></h4>',
                    '</div>',
                    '<div class="modal-body" data-i18n="[html]sessionExpiredDialog.message"></div>',
                    '<div class="modal-footer">',
                        '<button type="button" class="btn btn-primary" id="b-session-relogin-ok" data-i18n="sessionExpiredDialog.btnOk"></button>',
                    '</div>',
               '</div>',
           '</div>',
        '</div>'
    ].join("");
    $("body")
        .append(html)
        .localize();
    $('#b-session-relogin-ok').on('click', function() { 
        Common.closeTab();
    });
};

/*
 * clean up data and close tab/window
 */
Common.closeTab = function() {
    // define your own cleanupData for each App/screen
    if ((typeof cleanUpData !== "undefined") && $.isFunction(cleanUpData)) {
        cleanUpData();
    }

    // close tab/window
    window.close();
};

Common.refreshToken = function() {
    Common.getAppToken().done(function(appToken) {
        Common.getAppCellToken(appToken.access_token).done(function(appCellToken) {
            // update sessionStorage
            Common.updateSessionStorage(appCellToken);
        }).fail(function(appCellToken) {
            Common.displayMessageByKey("msg.error.failedToRefreshToken");
        });
    }).fail(function(appToken) {
        Common.displayMessageByKey("msg.error.failedToRefreshToken");
    });
};

// This App's token
Common.getAppToken = function() {
    return $.ajax({
                type: "POST",
                url: getAppCellUrl() + '__token',
                processData: true,
                dataType: 'json',
                data: {
                        grant_type: "password",
                        username: "megenki",
                        password: "personiumgenki",
                        p_target: Common.accessData.cellUrl
                },
                headers: {'Accept':'application/json'}
         });
};

/*
 * This App's refresh token
 * client_id must be this App's cell URL
 * Example: MyBoard is "https://demo.personium.io/app-myboard/"
 *          Calorie Smile is "https://demo.personium.io/hn-app-genki/"
 */
Common.getAppCellToken = function(appToken) {
  return $.ajax({
                type: "POST",
                url: Common.accessData.cellUrl + '__token',
                processData: true,
                dataType: 'json',
                data: {
                    grant_type: "refresh_token",
                    refresh_token: Common.accessData.refToken,
                    client_id: getAppCellUrl(),
                    client_secret: appToken
                },
                headers: {'Accept':'application/json'}
            });
};

Common.updateSessionStorage = function(appCellToken) {
    Common.accessData.token = appCellToken.access_token;
    Common.accessData.refToken = appCellToken.refresh_token;
    Common.accessData.expires = appCellToken.expires_in;
    Common.accessData.refExpires = appCellToken.refresh_token_expires_in;
    sessionStorage.setItem("accessInfo", JSON.stringify(Common.accessData));
};

/*
 * idling check 
 * Common.lastActivity + Common.accessData.expires * 1000
 */
Common.checkIdleTime = function() {
    if (new Date().getTime() > Common.lastActivity + Common.IDLE_TIMEOUT) {
        Common.stopIdleTimer();
        $('#modal-session-expired').modal('show');
    } else {
        Common.refreshToken();
    }
};

Common.stopIdleTimer = function() {
    clearInterval(Common.checkIdleTimer);
    $(document).off('click mousemove keypress');
};
