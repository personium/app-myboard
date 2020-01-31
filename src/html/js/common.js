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

//Default timeout limit - 30 minutes.
Common.REFRESH_TIMEOUT = 1800000;

Common.settingNowPage = 0;
Common.settingNowTitle = {};

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

Common.path_based_cellurl_enabled = true;
Common.unitUrl = "";
Common.sharingMemberRole = {};
Common.reqReceivedUUID = {};
Common.reqRequestAuthority = {};

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

            Common.setAccessData();

            if (!Common.checkParam()) {
                // cannot do anything to recover
                // display a dialog and close the app.
                return;
            };

            Common.setAppCellUrl(function() {
                Common.startOAuth2(function(){
                    let cellUrl = Common.getCellUrl();
                    let extUrl = Common.getTargetCellUrl();
                    if (extUrl !== cellUrl) {
                        Common.getProtectedBoxAccessToken4ExtCell(cellUrl, extUrl)
                            .done(function(appCellToken){
                                Common.updateSessionStorage(appCellToken);
                                let token = appCellToken.access_token;
                                Common.prevAdditionalCallback(extUrl, token);
                            })
                            .fail(function(error) {
                                console.log(error.responseJSON);
                            });
                    } else {
                        let token = Common.getToken();
                        Common.prevAdditionalCallback(cellUrl, token);
                    }
                });
    
                Common.updateContent();
            });
        });
});

Common.prevAdditionalCallback = function(cellUrl, token) {
    Common.getBoxUrlAPI(cellUrl, token)
        .done(function(data, textStatus, request) {
            let tempInfo = {
                data: data,
                request: request,
                targetCellUrl: cellUrl
            };
            let boxUrl = Common.getBoxUrlFromResponse(tempInfo);
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
            Common.showIrrecoverableErrorDialog("msg.error.failedToGetBoxUrl");
        });
}

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

Common.setAppCellUrl = function(callback) {
    var appUrlSplit = _.first(location.href.split("#")).split("/");

    if (_.contains(appUrlSplit, "localhost") || _.contains(appUrlSplit, "file:")) {
        Common.accessData.appUrl = APP_URL; // APP_URL must be defined by each App
    } else {
        Common.accessData.appUrl = _.first(appUrlSplit, 3).join("/") + "/"; 
    }

    Common.getCell(Common.accessData.appUrl).done(function(cellObj) {
        if (!cellObj.cell) {
            Common.accessData.appUrl = _.first(appUrlSplit, 4).join("/") + "/";
        }
    }).fail(function(xmlObj) {
        if (xmlObj.status !== "200") {
            Common.accessData.appUrl = _.first(appUrlSplit, 4).join("/") + "/";
        }
    }).always(function() {
        if ((typeof callback !== "undefined") && $.isFunction(callback)) {
            callback();
        }
    })
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
        case "targetCell":
            Common.setTargetCellUrl(param[1]);
        }
    }

    var cellUrl = Common.getCellUrl();
    if (!Common.accessData.targetCellUrl) {
        Common.setTargetCellUrl(cellUrl);
    }

    Common.getCell(cellUrl).done(function(cellObj, status, xhr){
        let ver = xhr.getResponseHeader("x-personium-version");
        if (ver >= "1.7.1") {
            Common.unitUrl = cellObj.unit.url;
            Common.path_based_cellurl_enabled = cellObj.unit.path_based_cellurl_enabled;
        } else {
            let unitUrlSplit = cellUrl.split("/");
            Common.unitUrl = _.first(unitUrlSplit, 3).join("/") + "/";
            Common.path_based_cellurl_enabled = true;
        }
        
    }).fail(function() {
        let unitUrlSplit = cellUrl.split("/");
        Common.unitUrl = _.first(unitUrlSplit, 3).join("/") + "/";
        Common.path_based_cellurl_enabled = true;
    });
};

Common.getBoxUrlFromResponse = function(info) {
    let urlFromHeader = info.request.getResponseHeader("Location");
    let urlFromBody = info.data.Url;
    let boxUrl = urlFromHeader || urlFromBody;

    return boxUrl;
};

Common.setInfo = function(url) {
    Common.setBoxUrl(url);
    Common.getBox(url, Common.getToken()).done(function(boxObj, status, xhr) {
        var urlSplit = url.split("/");
        let ver = xhr.getResponseHeader("x-personium-version");
        if (ver >= "1.7.1") {
            Common.accessData.unitUrl = boxObj.unit.url;
        } else {
            Common.accessData.unitUrl = _.first(urlSplit, 3).join("/") + "/";
        }
        
        if (boxObj.box) {
            Common.setTargetCellUrl(boxObj.cell.url);
            Common.accessData.cellName = boxObj.cell.name;
            Common.accessData.boxName = boxObj.box.name;
        } else {
            // In older version, URL is decomposed and created
            Common.setTargetCellUrl(_.first(urlSplit, 4).join("/") + "/");
            Common.accessData.cellName = Common.getCellNameFromUrl(Common.getTargetCellUrl());
            Common.accessData.boxName = _.last(_.compact(urlSplit));
        }
    }).always(function() {
        sessionStorage.setItem("Common.accessData", JSON.stringify(Common.accessData));
    })
};

Common.displayMyDisplayName = function(extUrl, profObj) {
    $("#appTitle")
        .text(profObj.dispName);
};

/**
 * Drawer_Menu
 * param:none
 */
Common.Drawer_Menu = function() {
  $('#drawer_btn').on('click', function () {
    Common.openSlide();
    return false;
  });

  $('#other_btn').on('click', function () {
    Common.getOtherAllowedCells();
    Common.openOther();
    return false;
  });

  $('#menu-background').click(function () {
    Common.closeSlide();
  });

  $('#drawer_menu,#other_list').click(function (event) {
    event.stopPropagation();
  });
}

Common.getUnitUrl = function() {
    return Common.accessData.unitUrl;
};

/*
 * Convert "personium-localunit:{cellName}:/" to the normal URL format when the Cell (cellUrl) is in the same Personium Unit.
 * Cell URL: personium-localunit:/dixonsiu  (supporting old format)
 *           personium-localunit:/dixonsiu/ (supporting old format)
 *           personium-localunit:dixonsiu:  (new - missing ending slash)
 *           personium-localunit:dixonsiu:/ (new)
 */
Common.changeLocalUnitToUnitUrl = function (cellUrl) {
    var result = cellUrl;
    if (cellUrl.startsWith(Common.PERSONIUM_LOCALUNIT)) {
        // Remove the keyword first
        let cellname = cellUrl.replace(Common.PERSONIUM_LOCALUNIT, "");
        // Remove all "/" of "/dixonsiu", "/dixonsiu/", "dixonsiu:" and "dixonsiu:/"
        cellname = cellname.replace(/:|\//g, "");
        
        if (Common.path_based_cellurl_enabled) {
            // https://fqdn/cellname/
            result = Common.unitUrl + cellname + "/";
        } else {
            // https://cellname.fqdn/
            let unitSplit = Common.unitUrl.split("/");
            unitSplit[2] = cellname + "." + unitSplit[2];
            result = unitSplit.join("/");
        }
    }

    return result;
};

Common.setCellUrl = function(url) {
    Common.accessData.cellUrl = Common.preparePersoniumUrl(url);
};

Common.getCellUrl = function() {
    return Common.accessData.cellUrl;
};

Common.setTargetCellUrl = function(url) {
    Common.accessData.targetCellUrl = Common.preparePersoniumUrl(url);
};

Common.getTargetCellUrl = function() {
    return Common.accessData.targetCellUrl;
};

Common.getCellName = function() {
    return Common.accessData.cellName;
};

Common.setBoxUrl = function(url) {
    Common.accessData.boxUrl = Common.preparePersoniumUrl(url);
};

Common.getBoxUrl = function() {
    return Common.accessData.boxUrl;
};

Common.setToCellBoxUrl = function(url) {
    Common.accessData.toCellBoxUrl = Common.preparePersoniumUrl(url);
};

// Make sure Unit/Cell/Box URL contains ending slash ('/')
Common.preparePersoniumUrl = function(url) {
    let tempUrl = url;

    if (url.slice(-1) != '/') {
        tempUrl = url + '/';
    }

    return tempUrl;
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

Common.getRefreshToken = function() {
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
Common.setRefreshTimer = function() {
    // refresh token every 30 minutes
    Common.checkRefreshTimer = setInterval(Common.refreshToken, Common.REFRESH_TIMEOUT);
};

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
                        '<button type="button" class="btn btn-primary" id="b-common-cancel" data-i18n="sessionExpiredDialog.cancelBtn" style="display:none;" onclick="$(\'#modal-common\').modal(\'hide\');"></button>',
                        '<button type="button" class="btn btn-primary" id="b-common-ok" data-i18n="sessionExpiredDialog.btnOk"></button>',
                    '</div>',
               '</div>',
           '</div>',
        '</div>'
    ].join("");
    $("body").append(html);
    $('#modal-common').on('hidden.bs.modal', function () {
        $("#modal-common #b-common-cancel").hide();
    });
};

Common.openCommonDialog = function(title_key, message_key, okBtnCallback, cancelBtnCallback) {
    $("#modal-common .modal-title")
        .attr('data-i18n', title_key);

    $("#modal-common .modal-body")
        .attr('data-i18n', '[html]' + message_key);

    $('#b-common-ok').off().one('click', function() {
        if ((typeof okBtnCallback !== "undefined") && $.isFunction(okBtnCallback)) {
            okBtnCallback();
        } else {
            Common.closeTab();
        }
    });

    $('#b-common-cancel').off().one('click', function() {
        if ((typeof cancelBtnCallback !== "undefined") && $.isFunction(cancelBtnCallback)) {
            cancelBtnCallback();
        } else {
            $('#modal-common').modal('hide');
        }
    });

    $("#modal-common")
        .localize()
        .modal('show');
};

Common.openWarningDialog = function(title_key, message, okBtnCallback) {
    $("#modal-common .modal-title")
        .attr('data-i18n', title_key);

    $("#modal-common .modal-body")
        .html(message);

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

// https://qiita.com/kawaz/items/1e51c374b7a13c21b7e2
Common.startOAuth2 = function(callback) {
    let endPoint = getStartOAuth2EngineEndPoint();
    let params = $.param({
        cellUrl: Common.getCellUrl()
    });
    $.ajax({
        type: "POST",
        xhrFields: {
            withCredentials: true
        },
        url: endPoint + "?" + params,
        headers: {
            'Accept':'application/json'
        }
    }).done(function(appCellToken) {
        // update sessionStorage
        Common.updateSessionStorage(appCellToken);
        if ((typeof callback !== "undefined") && $.isFunction(callback)) {
            callback();
        };
    }).fail(function(error) {
        console.log(error.responseJSON);
        Common.showIrrecoverableErrorDialog("msg.error.failedToRefreshToken");
    });
};

Common.refreshToken = function(callback) {
    let cellUrl = Common.getTargetCellUrl();
    Common.refreshProtectedBoxAccessToken(cellUrl).done(function(appCellToken) {
        // update sessionStorage
        Common.updateSessionStorage(appCellToken);
        if ((typeof callback !== "undefined") && $.isFunction(callback)) {
            callback();
        };
    }).fail(function(error) {
        console.log(error.responseJSON);
        Common.showIrrecoverableErrorDialog("msg.error.failedToRefreshToken");
    });
};

Common.updateSessionStorage = function(appCellToken) {
    Common.accessData.token = appCellToken.access_token;
    Common.accessData.refToken = appCellToken.refresh_token;
    Common.accessData.expires = appCellToken.expires_in;
    Common.accessData.refExpires = appCellToken.refresh_token_expires_in;
    sessionStorage.setItem("Common.accessData", JSON.stringify(Common.accessData));
};

Common.showIrrecoverableErrorDialog = function(msg_key) {
    // define your own handler for each App/screen
    if ((typeof irrecoverableErrorHandler !== "undefined") && $.isFunction(irrecoverableErrorHandler)) {
        irrecoverableErrorHandler();
    }

    Common.openCommonDialog("irrecoverableErrorDialog.title", msg_key);
};

Common.showConfirmDialog = function(msg_key, callback, cancelCallBack) {
    $("#modal-common #b-common-cancel").show();
    Common.openCommonDialog("confirmDialog.title", msg_key, callback, cancelCallBack);
}

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

Common.openSlide = function() {
    $('#menu-background').show();
    $('#drawer_menu').animate({
      width: 'show'
    }, 300);
};

Common.openOther = function() {
    $('#menu-background').show();
    $('#other_list').animate({
      width: 'show'
    }, 300);
};

Common.closeSlide = function() {
    if ($('#drawer_menu').css('display') == 'block') {
        $('#drawer_menu').animate({
          width: 'hide'
        }, 300, function () {
          $('#menu-background').hide();
          return false;
        });
    } else {
        $('#other_list').animate({
          width: 'hide'
        }, 300, function () {
          $('#menu-background').hide();
          return false;
        });
    }
    
};

Common.slideShow = function(id) {
    $(id).show();
    $(id).animate({
        left: 0
    }, 300);
}

Common.slideHide = function(id, direction, callback) {
    let m = "100%";
    if (direction == "left") {
        m = "200%";
    }

    $(id).animate({
        "left": m
    }, 300, function() {
        $(id).hide();
        if ((typeof callback !== "undefined") && $.isFunction(callback)) {
            callback();
        }
    });
}

/******************************/
/*         side menu          */  
/******************************/
/* sharing by */
Common.displaySharingMemberListPanel = function() {
    if (Common.getTargetCellUrl() !== Common.getCellUrl()) {
       // You can not sharing request on another's calendar
       return;
    }

    Common.closeSlide();
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        $('body > div.mySpinner').show();
        var out_html = $($.parseHTML(data));
        let id = Common.createSubContent(out_html);
        $(id + " main").empty();
        $(id + " .header-title").attr("data-i18n", "Sharing.Member.label").localize();
        $(id + " footer").hide();
        $(id + " .header-btn-right").hide();
        Common.getExtCell().done(function(data) {
            Common.sharingMemberRole = {};
            Common.reqReceivedUUID = {};
            Common.reqRequestAuthority = {};
            let eUl = $('<ul>', {
                class: 'slide-list hover-action',
                id: 'sharingMemberCells'
            });
            $(id + " main").append($(eUl)).localize();
            eUl = $('<ul>', {
                class: 'slide-list hover-action',
                id: 'sharingAddNewMember'
            });
            $(id + " main").append($(eUl)).localize();
            let addMemberTag = [
                '<li>',
                    '<a href="javascript:void(0)" onclick="Common.displaySharingAddMemberListPanel();">',
                        '<div class="add-btn">',
                            '<span class="add-member" data-i18n="Sharing.Member.add"></span>',
                        '</div>',
                    '</a>',
                '</li>'
            ].join("");
            $("#sharingAddNewMember").append(addMemberTag).localize();

            let res = data.d.results;
            res.sort(function(val1, val2) {
                return (val1.Url < val2.Url ? 1 : -1);
            })
            addId = "";
            for (var i = 0; i < res.length; i++) {
                Common.dispSharingMemberList(id + " main", res[i].Url, i);
            }
            $('body > div.mySpinner').hide();
        });
    }).fail(function(error) {
        console.log(error);
    });
}
Common.displaySharingAddMemberListPanel = function() {
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        $('body > div.mySpinner').show();
        var out_html = $($.parseHTML(data));
        let id = Common.createSubContent(out_html);
        $(id + " main").empty();
        $(id + " .header-title").attr("data-i18n", "Sharing.Member.label").localize();
        $(id + " footer").hide();
        $(id + " .header-btn-right").hide();
        Common.getExtCell().done(function(data) {
            let eUl = $('<ul>', {
                class: 'slide-list hover-action',
                id: 'sharingAddMemberCells'
            });
            $(id + " main").append($(eUl)).localize();

            let res = data.d.results;
            res.sort(function(val1, val2) {
                return (val1.Url < val2.Url ? 1 : -1);
            })
            addId = "Add";
            for (var i = 0; i < res.length; i++) {
                Common.dispSharingMemberList(id + " main", res[i].Url, i);
            }
            $('body > div.mySpinner').hide();
        });
    }).fail(function(error) {
        console.log(error);
    });
}
Common.dispSharingMemberList = function(id, url, no) {
    Common.getExtCellRoleList(url).done(function(data) {
        var results = data.d.results;
        results.sort(function (val1, val2) {
            return (val1.uri < val2.uri ? 1 : -1);
        });
        Common.sharingMemberRole[no] = {};
        Common.sharingMemberRole[no].url = url;
        Common.sharingMemberRole[no].roleList = [];
        let extUrl = Common.changeLocalUnitToUnitUrl(url);
        for (var i = 0; i < results.length; i++) {
            var uri = results[i].uri;
            var matchName = uri.match(/\(Name='(.+)',/);
            var roleName = matchName[1];
            var matchBox = uri.match(/_Box\.Name='(.+)'/);
            var roleBox = "";
            if (matchBox != null) {
                roleBox = matchBox[1];
            } else {
                roleBox = null;
            }
            if (Common.getBoxName() == roleBox) {
                Common.sharingMemberRole[no].roleList.push(roleName);
            }
        }

        if (addId != "") {
            if (Common.sharingMemberRole[no].roleList.length == 0) {
                Common.getProfileName(extUrl, Common.prepareExtCellForApp, no);
            }
        } else {
            if (Common.sharingMemberRole[no].roleList.length > 0) {
                Common.getProfileName(extUrl, Common.prepareExtCellForApp, no);
            }
        }
    })
}
Common.displayReceivedSendSharingListPanel = function() {
    if (Common.getTargetCellUrl() !== Common.getCellUrl()) {
       // You can not sharing request on another's calendar
       return;
   }

   Common.closeSlide();
   Common.loadContent("./templates/_list_template.html").done(function(data) {
       $('body > div.mySpinner').show();
       var out_html = $($.parseHTML(data));
       let id = Common.createSubContent(out_html);
       $(id + " main").empty();
       $(id + " .header-title").attr("data-i18n", "Sharing.Received.label").localize();
       $(id + " footer").hide();
       $(id + " .header-btn-right").hide();
       Common.getReceivedMessageAPI().done(function(data) {
           Common.dispReceivedSharingList(id + " main", data);
       });
   }).fail(function(error) {
       console.log(error);
   });
}
Common.dispReceivedSharingList = function(id, results) {
    let eUl = $('<ul>', {
        class: 'slide-list hover-action',
        id: 'sendSharingCells'
    });
    $(id).append($(eUl)).localize();
    let res = results.d.results;
    res.sort(function(val1, val2) {
        return (val1.Url < val2.Url ? 1 : -1);
    })
    Common.sharingMemberRole = {};
    Common.reqReceivedUUID = {};
    Common.reqRequestAuthority = {};
    for (var i in res) {
        if (res[i].Status == "approved" || res[i].Status == "rejected" || !res[i].RequestObjects) {
            continue;
        }

        Common.reqReceivedUUID[i] = res[i].__id;
        Common.reqRequestAuthority[i] = res[i].RequestObjects[0].Name;
        let extUrl = Common.changeLocalUnitToUnitUrl(res[i].From);

        Common.getProfileName(extUrl, Common.prepareExtCellForApp, i);
    }
    $('body > div.mySpinner').hide();
}
Common.dispReceivedCellInfo = function(extUrl, uuid, eleId, reqAuth) {
    Common.loadContent("./templates/_shared_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        let id = Common.createSubContent(out_html);
        $(id + " .singleBtn").hide();
        $(id + " .header-btn-right").hide();
        $(id + " .sendShared").hide();
        $(id + " #reqAuthority").text(getAppRoleAuthorityName(reqAuth))
        $(id + " #approvalFooterButton").removeAttr("onclick").on("click", function() {
            Common.approvalRel(extUrl, uuid, eleId, Common.backSubContent);
        });
        $(id + " #refectionFooterButton").removeAttr("onclick").on("click", function() {
            Common.rejectionRel(extUrl, uuid, eleId, Common.backSubContent);
        });
        Common.getProfileName(extUrl, function(url, profObj) {
            $(id + " .header-title").text(profObj.dispName);
            $(id + " .user-cell-url").text(url);
            $(id + " .user-description").text(profObj.description);
            $(id + " .extcell-profile .user-icon").append('<img class="user-icon-large" src="' + profObj.dispImage + '" alt="user">');
        });
    }).fail(function(error) {
        console.log(error);
    });
}

/* sharing with */
/*
 * Display the followings:
 * 1. List of sharing requesters to send
 */
Common.displaySendSharingListPanel = function() {
   if (Common.getTargetCellUrl() !== Common.getCellUrl()) {
       // You can not sharing request on another's calendar
       return;
   }

   Common.closeSlide();
   Common.loadContent("./templates/_list_template.html").done(function(data) {
       $('body > div.mySpinner').show();
       var out_html = $($.parseHTML(data));
       let id = Common.createSubContent(out_html);
       $(id + " main").empty();
       $(id + " .header-title").attr("data-i18n", "Sharing.Send.label").localize();
       $(id + " footer").hide();
       $(id + " .header-btn-right").hide();
       Common.getExtCell().done(function(data) {
           Common.dispSendSharingList(id + " main", data);
       });
   }).fail(function(error) {
       console.log(error);
   });
}
Common.dispSendSharingList = function(id, results) {
    let eUl = $('<ul>', {
        class: 'slide-list hover-action',
        id: 'sendSharingCells'
    });
    $(id).append($(eUl)).localize();
    let res = results.d.results;
    res.sort(function(val1, val2) {
        return (val1.Url < val2.Url ? 1 : -1);
    })
    Common.sharingMemberRole = {};
    Common.reqReceivedUUID = {};
    Common.reqRequestAuthority = {};
    for (var i = 0; i < res.length; i++) {
        let extUrl = Common.changeLocalUnitToUnitUrl(res[i].Url);
        Common.getProfileName(extUrl, Common.prepareExtCellForApp, i);
    }
    $('body > div.mySpinner').hide();
}
Common.dispSendCellInfo = function(extUrl) {
    Common.loadContent("./templates/_shared_template.html").done(function(data) {
        var out_html = $($.parseHTML(data));
        let id = Common.createSubContent(out_html);
        $(id + " .doubleBtn").hide();
        $(id + " .header-btn-right").hide();
        $(id + " .dispShared").hide();
        Common.getProfileName(extUrl, function(url, profObj) {
            $(id + " .header-title").text(profObj.dispName);
            $(id + " .user-cell-url").text(url);
            $(id + " .user-description").text(profObj.description);
            $(id + " .extcell-profile .user-icon").append('<img class="user-icon-large" src="' + profObj.dispImage + '" alt="user">');
        });
    }).fail(function(error) {
        console.log(error);
    });
}
Common.sendSharingRequest = function() {
    Common.showConfirmDialog("msg.info.requestSent", function() {
        $("#modal-common").modal('hide');
        var selAuth = $("#selectAuth").data("select-auth");
        var reqRel = getAuthorityAppRole(selAuth);
        var extUrl = $(".user-cell-url").text();
        var title = i18next.t("readRequestTitle");
        var body = i18next.t("readRequestBody");
        Common.sendMessageAPI(null, extUrl, "request", title, body, "role.add", reqRel, Common.getCellUrl()).done(function(data) {
            Common.backSubContent();
        }).fail(function(data) {
            Common.showWarningDialog("msg.error.failedRequestSent", function(){
               $("#modal-common").modal('hide'); 
            });
        });
    });
}

/* other cell */
Common.getOtherAllowedCells = function() {
    Common.getExtCell().done(function(json) {
        $(".subMySpinner").show();
        var objSel = document.getElementById("otherAllowedCells");
        if (objSel.hasChildNodes()) {
            while (objSel.childNodes.length > 0) {
                objSel.removeChild(objSel.firstChild);
            }
        }

        Common.sharingMemberRole = {};
        Common.reqReceivedUUID = {};
        Common.reqRequestAuthority = {};
        var results = json.d.results;
        if (results.length > 0) {
            results.sort(function(val1, val2) {
                return (val1.Url < val2.Url ? 1 : -1);
            })

            for (var i in results) {
                var url = Common.changeLocalUnitToUnitUrl(results[i].Url);
                Common.dispOtherAllowedCells(url, i);
            }
        }
        $(".subMySpinner").hide();
    });
};
Common.dispOtherAllowedCells = function(extUrl, no) {
    Common.getProfileName(extUrl, Common.prepareExtCellForApp, no);
};
/*
 * Get Transcell Token of the external Cell and prepare its data.
 * When done, execute callback (add external Cell to proper list).
 */
/*
 * Perform the followings for an external Cell:
 * 1. Get access token for protected box which is accessible by the App.
 * 2. Get Box URL.
 * 3. Add an entry to the accessible list which is rendered when the Group icon on the top right corner is clicked.
 */
Common.prepareExtCellForApp = function(extUrl, profObj, no) {
    let cellUrl = Common.getCellUrl();
    Common.getProtectedBoxAccessToken4ExtCell(cellUrl, extUrl).done(function(appCellToken) {
        let boxAcessToken = appCellToken.access_token;
        Common.getBoxUrlAPI(extUrl, boxAcessToken)
            .done(function(data, textStatus, request) {
                let tempInfo = {
                    data: data,
                    request: request,
                    targetCellUrl: extUrl
                };
                let boxUrl = Common.getBoxUrlFromResponse(tempInfo);
                console.log(boxUrl);
                
                Common.appendExtCellToList(boxUrl, boxAcessToken, extUrl, profObj, no);
            })
            .fail(function(error) {
                console.log(error.responseJSON.code);
                console.log(error.responseJSON.message.value);
            });
    }).fail(function(error) {
        console.log(error.responseJSON.code);
        console.log(error.responseJSON.message.value);
    });
};
/* 
 * Check and append the external Cell to either fo the following lists.
 * - List contains Cell which has read permission
 * - List contains Cell which does not has read permission
 */
Common.appendExtCellToList = function(extBoxUrl, extTcat, extUrl, profObj, no) {
    let onclick = "Common.execOtherApp('"+extUrl+"');";
    let noId = no;
    let appendId = "otherAllowedCells";
    let notDispFlg = false;
    if (Object.keys(Common.sharingMemberRole).length > 0) {
        noId = "Share" + no;
        appendId = "sharing"+addId+"MemberCells";
        onclick = "Common.displaySharingMemberInfoPanel('"+extUrl+"', '"+no+"', '#otherCell"+noId+"');";
        profObj.description = i18next.t("Authority.label") + ":";
        let roleList = Common.sharingMemberRole[no].roleList;
        profObj.description += getAppRoleAuthorityList(roleList);
        if (!$("#otherCell" + noId).length) {    
            let html = Common.createOtherCells(extUrl, profObj, noId, onclick);
            $("#" + appendId).append(html);
        }
    } else {
        Common.getAppDataAPI(extBoxUrl, extTcat)
            .fail(function(data) {
                // Insufficient access privileges
                if (data.status === 403) {
                    noId = "Share" + no;
                    onclick = "Common.dispSendCellInfo('"+extUrl+"');";
                    appendId = "sendSharingCells";
                } else {
                    notDispFlg = true;
                }
            }).always(function() {
                // Current situation, there is nothing to display and make it empty
                profObj.description = "";
                if (!notDispFlg && !$("#otherCell" + noId).length) {
                    if (Object.keys(Common.reqReceivedUUID).length > 0) {
                        noId = "Share" + no;
                        appendId = "sendSharingCells";
                        onclick = "Common.dispReceivedCellInfo('"+extUrl+"', '"+Common.reqReceivedUUID[no]+"', 'otherCell"+noId+"', '"+Common.reqRequestAuthority[no]+"');";
                    }
    
                    let html = Common.createOtherCells(extUrl, profObj, noId, onclick);
                    $("#" + appendId).append(html);
                }
            });
    }
};
Common.createOtherCells = function(extUrl, profObj, no, onclick) {
    let html = [
        '<li id="otherCell' + no + '">',
            '<a href="javascript:void(0)" onClick="'+onclick+'">',
                '<div class="pn-list">',
                    '<div class="pn-list-icon">',
                        '<img src="'+profObj.dispImage+'">',
                    '</div>',
                    '<div class="account-info">',
                        '<div class="user-name">'+profObj.dispName+'</div>',
                        '<div>',
                            '<span class="user-description">'+profObj.description+'</span>',
                        '</div>',
                    '</div>',
                '</div>',
            '</a>',
        '</li>'
    ].join("");
    return html;
};
Common.displaySharingMemberInfoPanel = function(extUrl, no, editId) {
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        $('body > div.mySpinner').show();
        var out_html = $($.parseHTML(data));
        let id = Common.createSubContent(out_html);
        $(id + " main").empty();
        $(id + " .header-title").attr("data-i18n", "Authority.label").localize();
        $(id + " footer").hide();
        $(id + " .header-btn-right").hide();
        Common.getRoleList().done(function(data) {
            let eUl = $('<ul>', {
                class: 'slide-list hover-action',
                id: 'memberRoles'
            });
            $(id + " main").append($(eUl)).localize();
            let res = data.d.results;
            res.sort(function (val1, val2) {
                return (val1["_Box.Name"] > val2["_Box.Name"] ? 1 : -1);
            });
            for (var i in res) {
                let roleName = res[i].Name;
                let dispRoleName = getAppRoleAuthorityName(roleName);
                let boxName = res[i]["_Box.Name"];
                if (Common.getBoxName() == boxName) {
                    let markStyle = "";
                    if ($.inArray(roleName, Common.sharingMemberRole[no].roleList) >= 0) {
                        markStyle = "check-mark-left";
                    }
                    let html = [
                        '<li class="pn-check-list check-position-l '+markStyle+'" data-edit-id="'+editId+'" data-edit-no="'+no+'" data-role-name="'+roleName+'">',
                            '<div class="pn-list pn-list-no-arrow">',
                                '<div class="account-info">',
                                    '<div class="user-name">',
                                    '<img class="image-circle-small '+roleName+'-icon" style="margin-top:0px;" src="./img/role_default.png">',
                                        '<span>' + dispRoleName + '</span>',
                                    '</div>',
                                    '<div></div>',
                                '</div>',
                            '</div>',
                        '</li > '
                    ].join("");
                    $("#memberRoles").append(html);
                }
            }
            Common.Add_Check_Mark();
            $('body > div.mySpinner').hide();
        })
    }).fail(function(error) {
        console.log(error);
    });
}
/**
   * Add_Check_Mark
   * param:none
   */
Common.Add_Check_Mark = function() {
    $('.pn-check-list').click(function (event) {
        //CASE: check list
        if ($(this).parents('#memberRoles').length != 0) {
            // Disable click event
            $(this).css("pointer-events", "none");
            if ($(this).hasClass('check-mark-left')) {
                Common.deleteExtCellLink($(this));
            } else {
                Common.addExtCellLink($(this));
            }
        }
    });
}
Common.addExtCellLink = function (obj) {
    let roleName = obj.data("role-name");
    let boxName = Common.getBoxName();
    let no = obj.data("edit-no");
    let extCell = Common.sharingMemberRole[no].url;
    Common.restAddExtCellLinkRoleAPI(extCell, boxName, roleName).done(function (data) {
        if (!$("#sharingMemberCells #otherCellShare" + no).length) {
            $("#otherCellShare" + no).clone().appendTo('#sharingMemberCells');
        }
        let linksNo = $.inArray(roleName, Common.sharingMemberRole[no].roleList);
        if (linksNo < 0) {
            Common.sharingMemberRole[no].roleList.push(roleName);
        }
        obj.addClass('check-mark-left');
        let auth = i18next.t("Authority.label") + ":";
        let roleList = Common.sharingMemberRole[no].roleList;
        auth += getAppRoleAuthorityList(roleList);
        let id = obj.data("edit-id");
        $(id + " .user-description").text(auth);
    }).fail(function (data) {
        var res = JSON.parse(data.responseText);
        alert("An error has occurred.\n" + res.message.value);
    }).always(function () {
        // Enable click event
        obj.css("pointer-events", "auto");
    });
}
Common.deleteExtCellLink = function (obj) {
    let roleName = obj.data("role-name");
    let boxName = Common.getBoxName();
    let no = obj.data("edit-no");
    let extCell = Common.sharingMemberRole[no].url;
    Common.restDeleteExtCellLinkRoleAPI(extCell, boxName, roleName).done(function (data) {
        let linksNo = $.inArray(roleName, Common.sharingMemberRole[no].roleList);
        if (linksNo >= 0) {
            Common.sharingMemberRole[no].roleList.splice(linksNo, 1);
        }
        obj.removeClass('check-mark-left');
        let auth = i18next.t("Authority.label") + ":";
        let roleList = Common.sharingMemberRole[no].roleList;
        auth += getAppRoleAuthorityList(roleList);
        let id = obj.data("edit-id");
        $(id + " .user-description").text(auth);
    }).fail(function (data) {
        var res = JSON.parse(data.responseText);
        alert("An error has occurred.\n" + res.message.value);
    }).always(function () {
        // Enable click event
        obj.css("pointer-events", "auto");
    });
};
Common.execOtherApp = function(extUrl) {
    let childWindow = window.open('about:blank');
    let url = location.href;
    let urlMatch = url.match(/targetCell=(.+)$/);
    if (urlMatch) {
        let delStr = urlMatch[1];
        url = url.replace(delStr, "");
    } else {
        url = url + "&targetCell=";
    }
    url = url + extUrl;

    childWindow.location.href = url;
    childWindow = null;
}
Common.selectSharingRequestRole = function() {
    let selRoleName = getAuthorityAppRole($("#selectAuth").data("select-auth"));
    Common.loadContent("./templates/_list_template.html").done(function(data) {
        $('body > div.mySpinner').show();
        var out_html = $($.parseHTML(data));
        let id = Common.createSubContent(out_html);
        $(id + " main").empty();
        $(id + " .header-title").attr("data-i18n", "Authority.label").localize();
        $(id + " footer").hide();
        $(id + " .header-btn-right").hide();
        Common.getRoleList().done(function(data) {
            let eUl = $('<ul>', {
                class: 'slide-list hover-action',
                id: 'memberRoles'
            });
            $(id + " main").append($(eUl)).localize();
            let res = data.d.results;
            res.sort(function (val1, val2) {
                return (val1["_Box.Name"] > val2["_Box.Name"] ? 1 : -1);
            });
            for (var i in res) {
                let roleName = res[i].Name;
                let dispRoleName = getAppRoleAuthorityName(roleName);
                let boxName = res[i]["_Box.Name"];
                if (Common.getBoxName() == boxName) {
                    let markStyle = "";
                    if (roleName == selRoleName) {
                        markStyle = "check-mark-left";
                    }
                    let html = [
                        '<li class="pn-check-list check-position-l '+markStyle+'" data-role-name="'+roleName+'">',
                            '<div class="pn-list pn-list-no-arrow">',
                                '<div class="account-info">',
                                    '<div class="user-name">',
                                    '<img class="image-circle-small '+roleName+'-icon" style="margin-top:0px;" src="./img/role_default.png">',
                                        '<span>' + dispRoleName + '</span>',
                                    '</div>',
                                    '<div></div>',
                                '</div>',
                            '</div>',
                        '</li > '
                    ].join("");
                    $("#memberRoles").append(html);
                }
            }
            
            $('.pn-check-list').click(function (event) {
                //CASE: check list
                if ($(this).parents('#memberRoles').length != 0) {
                    let selAuth = getAppRoleAuthority($(this).data("role-name"));
                    $("#selectAuth").attr("data-i18n", "Authority." + selAuth).localize();
                    $("#selectAuth").data("select-auth", selAuth);
                    Common.backSubContent();
                }
            });
            $('body > div.mySpinner').hide();
        })
    }).fail(function(error) {
        console.log(error);
    });
}

/* side menu */
Common.approvalRel = function(extCell, uuid, msgId, callback) {
    Common.showConfirmDialog("msg.info.requestApproval", function() {
        Common.changeStatusMessageAPI(uuid, "approved").done(function() {
            $("#" + msgId).remove();
            var title = i18next.t("readResponseTitle");
            var body = i18next.t("readResponseApprovedBody");
            Common.sendMessageAPI(uuid, extCell, "message", title, body).done(function(data) {
                $("#modal-common").modal('hide');
                if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                    callback();
                }
            });
        }).fail(function(data) {
            Common.showWarningDialog("msg.error.failedChangeStatus", function(){
                $("#modal-common").modal('hide'); 
            });
        });
    });
};
Common.rejectionRel = function(extCell, uuid, msgId, callback) {
    Common.showConfirmDialog("msg.info.requestRejection", function() {
        Common.changeStatusMessageAPI(uuid, "rejected").done(function() {
            $("#" + msgId).remove();
            var title = i18next.t("readResponseTitle");
            var body = i18next.t("readResponseDeclinedBody");
            Common.sendMessageAPI(uuid, extCell, "message", title, body).done(function(data) {
                $("#modal-common").modal('hide');
                if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                    callback();
                }
            });
        }).fail(function(data) {
            Common.showWarningDialog("msg.error.failedChangeStatus", function(){
                $("#modal-common").modal('hide'); 
            });
        });
    });
};

/* util */
Common.startAnimation = function() {
    Common.displayMessageByKey("glossary:msg.info.syncingData");
    $('#updateIcon').prop('disabled', true);
    $('#updateIcon > i').addClass("fa-spin");
};
Common.stopAnimation = function() {
    Common.displayMessageByKey("glossary:msg.info.syncedData");
    $('#dispMsg').fadeOut(2000);
    $('#updateIcon').prop('disabled', false);
    $('#updateIcon > i').removeClass("fa-spin");
};
/*
 * Based on the passed value, we generate an image using jdenticon and return it in base64 format.
 * This function can not be used unless you load jdenticon.
 */
Common.getJdenticon = function (value) {
    var canvas = document.createElement("canvas");
    canvas.height = 172;
    canvas.width = 172;
    jdenticon.update(canvas, value);
    var icon_quality = 0.8;
    return canvas.toDataURL("image/jpeg", icon_quality);
}
Common.getProfileName = function(extUrl, callback, no) {
    let number = no;
    Common.getProfile(extUrl, function(profObj) {
        console.log(profObj.dispName);
        if ((typeof callback !== "undefined") && $.isFunction(callback)) {
            callback(extUrl, profObj, number);
        }
    });
};
/**
 * url : Get cellURL
 * callback : After acquiring, function to operate
 * paramObj : An argument object to be passed to callback
 **/
Common.getProfile = function(url, callback) {
    let profObj = {
        dispName: url,
        description: "",
        dispImage: Common.getJdenticon(url)
    }
    Common.getCell(url).done(function(cellObj) {
        profObj.dispName = cellObj.cell.name;
    }).fail(function(xmlObj) {
        if (xmlObj.status == "200" || xmlObj.status == "412") {
            profObj.dispName = Common.getCellNameFromUrl(url);
        } else {
            profObj.dispName = url;
        }
    }).always(function() {
        Common.getProfileLocalesAPI(url).done(function(data) {
            if (data.DisplayName) {
                profObj.dispName = data.DisplayName;
            }
            if (data.Description) {
                profObj.description = data.Description;
            }
            if (data.Image) {
                profObj.dispImage = data.Image;
            }
    
            if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                callback(profObj);
            }
        }).fail(function(error) {
            Common.getProfileDefaultAPI(url).done(function(data) {
                if (data.DisplayName) {
                    profObj.dispName = data.DisplayName;
                }
                if (data.Description) {
                    profObj.description = data.Description;
                }
                if (data.Image) {
                    profObj.dispImage = data.Image;
                }
            }).always(function() {
                if ((typeof callback !== "undefined") && $.isFunction(callback)) {
                    callback(profObj);
                }
            })
        });  
    })
};
Common.createSubContent = function(html) {
    let no = $(".subContent").length;
    if (no == 0) {
        $("#loadContent").show();
    }

    let aDiv = $("<div>", {
        id: "subContent" + no,
        class: "subContent subContent" + no,
        style: "z-index: " + (10 + no)
    }).append(html);
    
    $("#loadContent").append($(aDiv)).localize();
    Common.slideShow('.subContent' + no);
    return '.subContent' + no;
};
Common.backSubContent = function(allFlag) {
    let result = "";
    if (allFlag) {
        Common.slideHide(".subContent", "right", function() {
            $(".subContent").remove();
            $("#loadContent").hide();
        })
    } else {
        let no = $(".subContent").length - 1;
        Common.slideHide(".subContent" + no, "right", function() {
            $(".subContent" + no).remove();
            if (no <= 0) {
                $("#loadContent").hide();
            }
        });
        result = ".subContent" + (no - 1);
    }

    return result;
}
Common.showSpinner = function(cssSelector) {
    $(cssSelector + ' > div.mySpinner').show();
    $(cssSelector + ' > div.myHiddenDiv').hide();
};
Common.hideSpinner = function(cssSelector) {
    $(cssSelector + ' > div.mySpinner').hide();
    $(cssSelector + ' > div.myHiddenDiv').show();
};

/* API */
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

/*
 * Refresh access token for protected box which is accessible by the App.
 * cellUrl - user's cell URL
 */
Common.refreshProtectedBoxAccessToken = function(cellUrl) {
    let engineEndPoint = getRefreshTokenEngineEndPoint();
    return $.ajax({
        type: "POST",
        url: engineEndPoint,
        processData: true,
        dataType: 'json',
        data: {
            p_target: cellUrl,
            refresh_token: Common.getRefreshToken()
        },
        headers: {
            'Accept':'application/json',
            'content-type': 'application/x-www-form-urlencoded'
        }
    });
};

Common.getProtectedBoxAccessToken4ExtCell = function(cellUrl, extUrl) {
    let engineEndPoint = getProtectedBoxAccessToken4ExtCellEngineEndPoint();
    return $.ajax({
        type: "POST",
        url: engineEndPoint,
        processData: true,
        dataType: 'json',
        data: {
            user_url: cellUrl,
            p_target: extUrl,
            refresh_token: Common.getRefreshToken()
        },
        headers: {
            'Accept':'application/json',
            'content-type': 'application/x-www-form-urlencoded'
        }
    });
};

Common.getCell = function (cellUrl) {
    if (!cellUrl) cellUrl = "https";

    return $.ajax({
        type: "GET",
        url: cellUrl,
        headers: {
            'Accept': 'application/json'
        }
    });
};
Common.getBox = function (boxUrl, token) {
    return $.ajax({
        type: "GET",
        url: boxUrl,
        headers: {
            'Authorization':'Bearer ' + token,
            'Accept': 'application/json'
        }
    });
};
Common.loadContent = function(contentUrl) {
    return $.ajax({
        url: contentUrl,
        type: "GET",
        dataType: "html"
    });
}
Common.getProfileLocalesAPI = function(url) {
    return $.ajax({
        type: "GET",
        url: url + '__/locales/' + i18next.language + '/profile.json',
        dataType: 'json',
        headers: {'Accept':'application/json'}
    })
}
Common.getProfileDefaultAPI = function(url) {
    return $.ajax({
        type: "GET",
        url: url + '__/profile.json',
        dataType: 'json',
        headers: {'Accept':'application/json'}
    });
}
Common.getTranscellToken = function(extCellUrl, tempAAAT) {
    return $.ajax({
        type: "POST",
        url: Common.getCellUrl() + '__token',
        processData: true,
        dataType: 'json',
        data: {
            grant_type: "refresh_token",
            refresh_token: Common.getRefreshToken(),
            p_target: extCellUrl,
            client_id: Common.getAppCellUrl(),
            client_secret: tempAAAT
        },
        headers: {
            'Accept':'application/json',
            'content-type': 'application/x-www-form-urlencoded'
        }
    });
};
Common.getRoleList = function () {
    return $.ajax({
        type: "GET",
        url: Common.getCellUrl() + '__ctl/Role',
        headers: {
            'Authorization': 'Bearer ' + Common.getToken(),
            'Accept': 'application/json'
        }
    })
}
Common.getExtCell = function() {
    return $.ajax({
        type: "GET",
        url: Common.getCellUrl() + '__ctl/ExtCell',
        headers: {
            'Authorization':'Bearer ' + Common.getToken(),
            'Accept':'application/json'
        }
    });
};
Common.getExtCellRoleList = function (extUrl) {
    var extCellUrl = encodeURIComponent(extUrl);
    return $.ajax({
        type: "GET",
        url: Common.getCellUrl() + '__ctl/ExtCell(\'' + extCellUrl + '\')/$links/_Role',
        headers: {
            'Authorization': 'Bearer ' + Common.getToken()
        }
    })
};
Common.restAddExtCellLinkRoleAPI = function (extUrl, boxName, roleName) {
    var extCellUrl = encodeURIComponent(extUrl);
    var uri = Common.getCellUrl() + '__ctl/Role';
    if (!boxName) {
        uri += '(\'' + roleName + '\')';
    } else {
        uri += '(Name=\'' + roleName + '\',_Box\.Name=\'' + boxName + '\')';
    }
    var json = { "uri": uri };

    return $.ajax({
        type: "POST",
        url: Common.getCellUrl() + '__ctl/ExtCell(\'' + extCellUrl + '\')/$links/_Role',
        data: JSON.stringify(json),
        headers: {
            'Authorization': 'Bearer ' + Common.getToken(),
            'Accept': 'application/json'
        }
    });
};
Common.restDeleteExtCellLinkRoleAPI = function (extUrl, boxName, roleName) {
    var extCellUrl = encodeURIComponent(extUrl);
    var api = '__ctl/ExtCell(\'' + extCellUrl + '\')/$links/_Role';
    if (!boxName) {
        api += '(\'' + roleName + '\')';
    } else {
        api += '(Name=\'' + roleName + '\',_Box.Name=\'' + boxName + '\')';
    }

    return $.ajax({
        type: "DELETE",
        url: Common.getCellUrl() + api,
        headers: {
            'Authorization': 'Bearer ' + Common.getToken()
        }
    });
};
Common.deleteExtCellLinkRelation = function(extCell, relName) {
    var cellUrlCnv = encodeURIComponent(extCell);
    return $.ajax({
        type: "DELETE",
        url: Common.getCellUrl() + '__ctl/ExtCell(\'' + cellUrlCnv + '\')/$links/_Role(Name=\'' + relName + '\',_Box.Name=\'' + Common.getBoxName() + '\')',
        headers: {
            'Authorization':'Bearer ' + Common.getToken()
        }
    });
};
Common.getReceivedMessageAPI = function() {
    var filter = "";
    if (i18next.exists("glossary:readRequestTarget")) {
        filter = "$filter=startswith%28Title,%27" + encodeURIComponent(i18next.t("glossary:readRequestTarget")) + "%27%29&";
    }
    return $.ajax({
        type: "GET",
        url: Common.getCellUrl() + '__ctl/ReceivedMessage?'+filter+'$orderby=__published%20desc',
        headers: {
            'Authorization':'Bearer ' + Common.getToken(),
            'Accept':'application/json'
        }
    });
};
Common.changeStatusMessageAPI = function(uuid, command) {
    var data = {};
    data.Command = command;
    return $.ajax({
        type: "POST",
        url: Common.getCellUrl() + '__message/received/' + uuid,
        data: JSON.stringify(data),
        headers: {
            'Authorization':'Bearer ' + Common.getToken()
        }
    })
};
Common.getAppDataAPI = function(targetBoxUrl, token) {
    let requestInfo = $.extend(true,
        {
            type: 'GET',
            url: targetBoxUrl + getAppDataPath(),
            headers: {
                    'Authorization':'Bearer ' + token,
                    'Accept':'application/json'
            }
        },
        getAppRequestInfo()
    );

    return $.ajax(requestInfo);
};
/*
 * When the following conditions are satisfied, there is no need to include App URL when specifying the role/relation name.
 * 1. BoxBound must set to true
 * 2. Authorization token must be App authenticated token
 */
Common.sendMessageAPI = function(uuid, extCell, type, title, body, reqType, reqRel, reqRelTar) {
    var data = {};
    data.BoxBound = true;
    data.InReplyTo = uuid;
    data.To = extCell;
    data.ToRelation = null
    data.Type = type;
    data.Title = title;
    data.Body = body;
    data.Priority = 3;
    if (reqType) {
        data.RequestObjects = [];
        let objArray = {};
        objArray.RequestType = reqType;
        objArray.Name = reqRel;
        objArray.TargetUrl = reqRelTar;
        data.RequestObjects.push(objArray);
    }

    return $.ajax({
        type: "POST",
        url: Common.getCellUrl() + '__message/send',
        data: JSON.stringify(data),
        headers: {
            'Authorization':'Bearer ' + Common.getToken()
        }
    })
};