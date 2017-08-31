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
    targetUrl: null,
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
        case "target":
            Common.setTarget(param[1]);
            break;
        case "token":
            Common.accessData.token = param[1];
            break;
        case "ref":
            Common.accessData.refToken = param[1];
            break;
        case "expires":
            Common.accessData.expires = param[1];
            break;
        case "refexpires":
            Common.accessData.refExpires = param[1];
            break;
        case "fromCell":
            Common.accessData.fromCell = param[1];
            break;
        }
    }
};

Common.setTarget = function(url) {
    Common.accessData.targetUrl = url;

    var urlSplit = url.split("/");
    Common.accessData.cellUrl = _.first(urlSplit, 4).join("/") + "/";
    Common.accessData.cellName = Common.getCellNameFromUrl(Common.accessData.cellUrl);
    Common.accessData.boxName = _.last(urlSplit);
};

// Data subject's cell URL
Common.getTargetUrl = function() {
    return Common.accessData.targetUrl;
};

Common.getCellUrl = function() {
    return Common.accessData.cellUrl;
};

Common.getCellName = function() {
    return Common.accessData.cellName;
};

Common.getBoxName = function() {
    return Common.accessData.boxName;
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

Common.notMe = function() {
    if (typeof Common.accessData.fromCell !== "undefined") {
        return (Common.accessData.cellName != Common.accessData.fromCell);
    } else {
        return false;
    }
}

Common.updateContent = function() {
    // start localizing, details:
    // https://github.com/i18next/jquery-i18next#usage-of-selector-function
    $('[data-i18n]').localize();
}

Common.checkParam = function() {
    var msg_key = "";
    if (Common.getTargetUrl() === null) {
        msg_key = "msg.error.targetCellNotSelected";
    } else if (Common.accessData.token ===null) {
        msg_key = "msg.error.tokenMissing";
    } else if (Common.accessData.refToken === null) {
        msg_key = "msg.error.refreshTokenMissing";
    } else if (Common.accessData.expires === null) {
        msg_key = "msg.error.tokenExpiryDateMissing";
    } else if (Common.accessData.refExpires === null) {
        msg_key = "msg.error.refreshTokenExpiryDateMissing";
    }

    if (msg_key.length > 0) {
        Common.displayMessageByKey(msg_key);
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
    // Do nothing when current cell does not belong to the owner
    if (Common.notMe()) {
        return;
    }
    Common.getLaunchJson().done(function(launchObj){
        Common.getAppToken(launchObj.personal).done(function(appToken) {
            Common.getAppCellToken(appToken.access_token).done(function(appCellToken) {
                // update sessionStorage
                Common.updateSessionStorage(appCellToken);
            }).fail(function(appCellToken) {
                Common.displayMessageByKey("msg.error.failedToRefreshToken");
            });
        }).fail(function(appToken) {
            Common.displayMessageByKey("msg.error.failedToRefreshToken");
        });
    }).fail(function(){
        Common.displayMessageByKey("msg.error.failedToRefreshToken");
    });
};

Common.getLaunchJson = function() {
    return $.ajax({
        type: "GET",
        url: Common.getAppCellUrl() + "__/launch.json",
        headers: {
            'Authorization':'Bearer ' + Common.accessData.token,
            'Accept':'application/json'
        }
    });
}
// This App's token
Common.getAppToken = function(personalInfo) {
    return $.ajax({
                type: "POST",
                url: Common.getAppCellUrl() + '__token',
                processData: true,
                dataType: 'json',
                data: {
                        grant_type: "password",
                        username: personalInfo.appTokenId,
                        password: personalInfo.appTokenPw,
                        p_target: Common.getCellUrl()
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
                url: Common.getCellUrl() + '__token',
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

Common.displayMessageByKey = function(msg_key) {
    if (msg_key) {
        $('#dispMsg').attr("data-i18n", '[html]' + msg_key)
            .localize()
            .show();
    } else {
        $('#dispMsg').hide();
    }
};
