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
var Common = Common || {};

Common.PERSONIUM_LOCALUNIT = "personium-localunit:";

//Default timeout limit - 60 minutes.
Common.IDLE_TIMEOUT =  3600000;
// 55 minutes
Common.IDLE_CHECK = 3300000;
// Records last activity time.
Common.lastActivity = new Date().getTime();

Common.accessData = {
    targetUrl: null,
    unitUrl: null,
    cellUrl: null,
    cellName: null,
    appUrl: null,
    token: null,
    refToken: null,
    expires: null,
    refExpires: null
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

            Common.appendCommonDialog();

            Common.setAppCellUrl();

            Common.setAccessData();

            if (!Common.checkParam()) {
                // cannot do anything to recover
                // display a dialog and close the app.
                return;
            };

            Common.refreshToken(function(){
                let cellUrl = Common.getCellUrl();
                let token = Common.getToken();
                Common.getBoxUrlAPI(cellUrl, token)
                    .done(function(data, textStatus, request) {
                        let boxUrl = request.getResponseHeader("Location");
                        console.log(boxUrl);
                        Common.setInfo(boxUrl);
                        // define your own additionalCallback for each App/screen
                        if ((typeof additionalCallback !== "undefined") && $.isFunction(additionalCallback)) {
                            additionalCallback();
                        }
                    })
                    .fail(function(error) {
                        console.log(error.responseJSON.code);
                        console.log(error.responseJSON.message.value);
                        Common.irrecoverableErrorHandler("msg.error.failedToGetBoxUrl");
                    });
            });

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

Common.setAppCellUrl = function() {
    var appUrlSplit = _.first(location.href.split("#")).split("/");

    if (_.contains(appUrlSplit, "localhost") || _.contains(appUrlSplit, "file:")) {
        Common.accessData.appUrl = APP_URL; // APP_URL must be defined by each App
    } else {
        Common.accessData.appUrl = _.first(appUrlSplit, 4).join("/") + "/"; 
    }

    return;
};

Common.getAppCellUrl = function() {
    return Common.accessData.appUrl;
};

Common.setAccessData = function() {
    var hash = location.hash.substring(1);
    var params = hash.split("&");
    for (var i in params) {
        var param = params[i].split("=");
        var id = param[0];
        switch (id) {
        case "cell":
            Common.setCellUrl(param[1]);
            break;
        case "refresh_token":
            Common.accessData.refToken = param[1];
            break;
        }
    }
};

Common.getBoxUrlAPI = function(cellUrl, token) {
    return $.ajax({
        type: "GET",
        url: cellUrl + "__box",
        headers: {
            'Authorization':'Bearer ' + token,
            'Accept':'application/json'
        }
    });
};

Common.setInfo = function(url) {
    var urlSplit = url.split("/");
    Common.accessData.unitUrl = _.first(urlSplit, 3).join("/") + "/";
    Common.accessData.cellUrl = _.first(urlSplit, 4).join("/") + "/";
    Common.accessData.cellName = Common.getCellNameFromUrl(Common.accessData.cellUrl);
    Common.setBoxUrl(url + "/");
    Common.accessData.boxName = _.last(urlSplit);
};

Common.getUnitUrl = function() {
    return Common.accessData.unitUrl;
};

Common.changeLocalUnitToUnitUrl = function (cellUrl) {
    var result = cellUrl;
    if (cellUrl.startsWith(Common.PERSONIUM_LOCALUNIT)) {
        result = cellUrl.replace(Common.PERSONIUM_LOCALUNIT + "/", Common.getUnitUrl());
    }

    return result;
};

Common.setCellUrl = function(url) {
    Common.accessData.cellUrl = url;
};

Common.getCellUrl = function() {
    return Common.accessData.cellUrl;
};

Common.getCellName = function() {
    return Common.accessData.cellName;
};

Common.setBoxUrl = function(url) {
    Common.accessData.boxUrl = url;
};

Common.getBoxUrl = function() {
    return Common.accessData.boxUrl;
};

Common.setToCellBoxUrl = function(url) {
    Common.accessData.toCellBoxUrl = url;
};

Common.getToCellBoxUrl = function() {
    return Common.accessData.toCellBoxUrl;
};

Common.getBoxName = function() {
    return Common.accessData.boxName;
};

Common.getToken = function() {
    return Common.accessData.token;
};

Common.setToCellToken = function(token) {
    Common.accessData.toCellToken = token;
};

Common.getToCellToken = function() {
    return Common.accessData.toCellToken;
};

Common.getRefressToken = function() {
    return Common.accessData.refToken;
};

/*
 * Retrieve cell name from cell URL
 * Parameter:
 *     1. ended with "/", "https://demo.personium.io/debug-user1/"
 *     2. ended without "/", "https://demo.personium.io/debug-user1"
 * Return:
 *     debug-user1
 */
Common.getCellNameFromUrl = function(url) {
    if ((typeof url === "undefined") || url == null || url == "") {
        return "";
    };

    var cellName = _.last(_.compact(url.split("/")));
    return cellName;
};

Common.updateContent = function() {
    // start localizing, details:
    // https://github.com/i18next/jquery-i18next#usage-of-selector-function
    $('[data-i18n]').localize();
}

Common.checkParam = function() {
    var msg_key = "";
    if (Common.getCellUrl() === null) {
        msg_key = "msg.error.targetCellNotSelected";
    } else if (Common.accessData.refToken === null) {
        msg_key = "msg.error.refreshTokenMissing";
    }

    if (msg_key.length > 0) {
        Common.showIrrecoverableErrorDialog(msg_key);
        return false;
    }

    return true;
};

/*
 * Initialize info for idling check
 */
Common.setIdleTime = function() {
    // Create Session Expired Modal
    Common.appendSessionExpiredDialog();

    //Common.refreshToken();

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

Common.appendCommonDialog = function() {
    var html = [
        '<div id="modal-common" class="modal fade" role="dialog" data-backdrop="static">',
            '<div class="modal-dialog">',
                '<div class="modal-content">',
                    '<div class="modal-header login-header">',
                        '<h4 class="modal-title"></h4>',
                    '</div>',
                    '<div class="modal-body"></div>',
                    '<div class="modal-footer">',
                        '<button type="button" class="btn btn-primary" id="b-common-ok" data-i18n="sessionExpiredDialog.btnOk"></button>',
                    '</div>',
               '</div>',
           '</div>',
        '</div>'
    ].join("");
    $("body").append(html);
};

Common.openCommonDialog = function(title_key, message_key, okBtnCallback) {
    $("#modal-common .modal-title")
        .attr('data-i18n', title_key);

    $("#modal-common .modal-body")
        .attr('data-i18n', '[html]' + message_key);

    $('#b-common-ok').one('click', function() {
        if ((typeof okBtnCallback !== "undefined") && $.isFunction(okBtnCallback)) {
            okBtnCallback();
        } else {
            Common.closeTab();
        }
    });

    $("#modal-common")
        .localize()
        .modal('show');
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

Common.refreshToken = function(callback) {
    let cellUrl = Common.getCellUrl();
    Common.getAppAuthToken(cellUrl).done(function(appToken) {
        Common.getSchemaAuthToken(appToken.access_token, cellUrl).done(function(appCellToken) {
            // update sessionStorage
            Common.updateSessionStorage(appCellToken);
            if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                callback();
            };
        }).fail(function(appCellToken) {
            Common.showIrrecoverableErrorDialog("msg.error.failedToRefreshToken");
        });
    }).fail(function(appToken) {
        Common.showIrrecoverableErrorDialog("msg.error.failedToRefreshToken");
    });
};

// Get App Authentication Token
Common.getAppAuthToken = function(cellUrl) {
    let engineEndPoint = getEngineEndPoint();
    return $.ajax({
        type: "POST",
        url: engineEndPoint,
        data: {
                p_target: cellUrl
        },
        headers: {'Accept':'application/json'}
    });
};

/*
 * Get Schema Authentication Token
 * client_id belongs to a App's cell URL
 * Example: MyBoard is "https://demo.personium.io/app-myboard/"
 *          Calorie Smile is "https://demo.personium.io/hn-app-genki/"
 */
Common.getSchemaAuthToken = function(appToken, cellUrl) {
  return $.ajax({
                type: "POST",
                url: cellUrl + '__token',
                processData: true,
                dataType: 'json',
                data: {
                    grant_type: "refresh_token",
                    refresh_token: Common.accessData.refToken,
                    client_id: Common.getAppCellUrl(),
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
    sessionStorage.setItem("Common.accessData", JSON.stringify(Common.accessData));
};

Common.perpareToCellInfo = function(cellUrl, tcat, aaat, callback) {
    Common.getToCellSchemaAuthToken(cellUrl, tcat, aaat).done(function(appCellToken) {
        Common.setToCellToken(appCellToken.access_token);
        Common.getBoxUrlAPI(cellUrl, appCellToken.access_token)
            .done(function(data, textStatus, request) {
                let boxUrl = request.getResponseHeader("Location");
                Common.setToCellBoxUrl(boxUrl + "/");
                // callback
                if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                    callback(cellUrl, Common.getToCellBoxUrl(), Common.getToCellToken());
                }
            })
            .fail(function(error) {
                console.log(error.responseJSON.code);
                console.log(error.responseJSON.message.value);
                Common.showIrrecoverableErrorDialog("msg.error.failedToGetBoxUrl");
            });
    }).fail(function(error) {
        Common.showIrrecoverableErrorDialog("msg.error.failedToRefreshToken");
    });
};

Common.getToCellSchemaAuthToken = function(cellUrl, tcat, aaat) {
    return $.ajax({
        type: "POST",
        url: cellUrl + '__token',
        processData: true,
        dataType: 'json',
        data: {
            grant_type: 'urn:ietf:params:oauth:grant-type:saml2-bearer',
            assertion: tcat,
            client_id: Common.getAppCellUrl(),
            client_secret: aaat
        },
        headers: {'Accept':'application/json'}
    });
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

Common.showIrrecoverableErrorDialog = function(msg_key) {
    // define your own handler for each App/screen
    if ((typeof irrecoverableErrorHandler !== "undefined") && $.isFunction(irrecoverableErrorHandler)) {
        irrecoverableErrorHandler();
    }

    Common.openCommonDialog("irrecoverableErrorDialog.title", msg_key);
};

Common.showWarningDialog = function(msg_key, callback) {
    Common.openCommonDialog("warningDialog.title", msg_key, callback);
};

Common.displayMessageByKey = function(msg_key) {
    if (msg_key) {
        $('#dispMsg').attr("data-i18n", '[html]' + msg_key)
            .localize()
            .show();
    } else {
        $('#dispMsg').hide();
    }
};
