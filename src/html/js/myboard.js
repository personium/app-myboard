var mb = {};

mb.msgData = null;

const APP_URL = "https://demo.personium.io/app-myboard/";

getEngineEndPoint = function() {
    return Common.getAppCellUrl() + "__/html/Engine/getAppAuthToken";
};

getStartOAuth2EngineEndPoint = function() {
    return Common.getAppCellUrl() + "__/html/Engine/start_oauth2";
};

getNamesapces = function() {
    return ['common', 'glossary'];
};

getAppRole = function() {
    // Currently we only allow role with read permission.
    return 'MyBoardViewer';
};

getAppDataPath = function() {
    return 'MyBoardBox/my-board.json';
};

/*
 * To be combine with the default hash to produce the following:
 * {
 *     type: 'GET',
 *     dataType: 'text',
 *     url: targetCell + getAppDataPath(),
 *     headers: {
 *         'Authorization':'Bearer ' + token,
 *     }
 *  }
 */
getAppRequestInfo = function() {
    return {
        dataType: 'text'
    };
};

getAppRole = function(auth) {
    if (auth == "read") {
        // Currently we only allow role with read permission.
        return 'CalendarViewer';
    }
};

getAuthorityAppRole = function(auth) {
    let result = auth;
    switch (auth) {
        case "owner":
            result = "MyBoardOwner";
            break;
        case "editor":
            result = "MyBoardEditor";
            break;
        case "viewer":
            result = "MyBoardViewer";
            break;
    }

    return result;
}

getAppRoleAuthority = function(roleName) {
    let result = roleName;
    switch (roleName) {
        case "MyBoardOwner":
            result = "owner";
            break;
        case "MyBoardEditor":
            result = "editor";
            break;
        case "MyBoardViewer":
            result = "viewer";
            break;
    }

    return result;
}
getAppRoleAuthorityName = function(roleName) {
    let result = roleName;
    switch (roleName) {
        case "MyBoardOwner":
            result = i18next.t("Authority.owner");
            break;
        case "MyBoardEditor":
            result = i18next.t("Authority.editor");
            break;
        case "MyBoardViewer":
            result = i18next.t("Authority.viewer");
            break;
    }

    return result;
}

getAppRoleAuthorityList = function(roleList) {
    let result = "";
    for (var i = 0; i < roleList.length; i++) {
        result += getAppRoleAuthorityName(roleList[i]) + ", ";
    }
    result = result.slice(0,-2);
    return result;
}

additionalCallback = function() {
    mb.displayOwnBoardMessage();

    Common.Drawer_Menu();

    Common.setRefreshTimer();

    Common.getProfileName(Common.getTargetCellUrl(), Common.displayMyDisplayName);

    if (Common.getTargetCellUrl() !== Common.getCellUrl()) {
        $("#other_btn").hide();
        $(".menu-list").addClass("disable-field");
    }

    $('#txtMyBoard').on('click', function () {
        Common.getAppDataAPI(Common.getBoxUrl(), Common.getToken()).done(function(data) {
            var msgData = JSON.parse(data);
            if (msgData.locked && msgData.locked !== "" && msgData.locked !== Common.getCellUrl()) {
                // Messages that can not be edited because it is being edited
                let msg_key = "glossary:modalDialog.updatingMyBoard.msg";
                Common.showWarningDialog(msg_key, function() {
                    $('#modal-common').modal('hide');
                });
                $("#modal-common .modal-body")
                .attr('data-i18n', '[html]' + msg_key).localize({name: msgData.locked});
            } else {
                // Editable
                if (mb.msgData.message !== msgData.message) {
                    // When the currently displayed message is old, a confirmation message for updating is displayed
                    Common.showConfirmDialog("glossary:modalDialog.updateMyBoard.msg", function() {
                        $('#txtMyBoard').val(msgData.message);
                        mb.msgData.message = msgData.message
                        $('#modal-common').modal('hide');
                        mb.removeReadOnly(msgData.message);
                    }, function() {
                        $('#modal-common').modal('hide');
                        mb.removeReadOnly(msgData.message);
                    });
                } else {
                    // Remove readonly
                    mb.removeReadOnly(msgData.message);
                }
            }
        });
    });

    $('#edit_btn').on('click', function () {
        mb.myboardReg();
    });

    $('#bReadAnotherCell').on('click', function () {
        var toCellUrl = $("#otherAllowedCells option:selected").val();
        mb.displayAnotherBoardMessage(toCellUrl);
    });

    $('#bSendAllowed').on('click', function () {
        var value = $("#requestCells option:selected").val();
        var title = i18next.t("readRequestTitle");
        var body = i18next.t("readRequestBody");
        var reqRel = getAppRole();
        Common.sendMessageAPI(null, value, "request", title, body, "role.add", reqRel, Common.getCellUrl()).done(function(data) {
            $("#popupSendAllowedErrorMsg").html(i18next.t("msg.info.messageSent"));
        }).fail(function(data) {
            $("#popupSendAllowedErrorMsg").html(i18next.t("msg.error.failedToSendMessage"));
        });
    });

    $("#extCellMyBoard").on('show.bs.collapse', function() {
        $("#sendAllowedMessage").removeClass('in');
        $("#sendAllowedMessage").attr("aria-expanded", false);
        $("#listAllowed").removeClass('in');
        $("#listAllowed").attr("aria-expanded", false);
        $("#receiveMessage").removeClass('in');
        $("#receiveMessage").attr("aria-expanded", false);
        $("#popupReadAllowedErrorMsg").empty();
    });
    $("#sendAllowedMessage").on('show.bs.collapse', function() {
        $("#extCellMyBoard").removeClass('in');
        $("#extCellMyBoard").attr("aria-expanded", false);
        $("#listAllowed").removeClass('in');
        $("#listAllowed").attr("aria-expanded", false);
        $("#receiveMessage").removeClass('in');
        $("#receiveMessage").attr("aria-expanded", false);
        $("#popupSendAllowedErrorMsg").empty();
    });
    $("#listAllowed").on('show.bs.collapse', function() {
        $("#sendAllowedMessage").removeClass('in');
        $("#sendAllowedMessage").attr("aria-expanded", false);
        $("#extCellMyBoard").removeClass('in');
        $("#extCellMyBoard").attr("aria-expanded", false);
        $("#receiveMessage").removeClass('in');
        $("#receiveMessage").attr("aria-expanded", false);
    });
    $("#receiveMessage").on('show.bs.collapse', function() {
        $("#sendAllowedMessage").removeClass('in');
        $("#sendAllowedMessage").attr("aria-expanded", false);
        $("#listAllowed").removeClass('in');
        $("#listAllowed").attr("aria-expanded", false);
        $("#extCellMyBoard").removeClass('in');
        $("#extCellMyBoard").attr("aria-expanded", false);
    });

    Common.hideSpinner("body");
};

mb.removeReadOnly = function(message) {
    mb.registerMyBoardAPI(Common.getCellUrl(), message).done(function() {
        $('#txtMyBoard').attr('readonly',false);
        // To reflect changes to the editable state, specify the focus again.
        $('#txtMyBoard').blur();
        $('#txtMyBoard').focus();

        // Switch the browsing button of the other person on the upper right to the save button
        $("#other_btn").hide();
        $("#edit_btn").show();
    }).fail(function() {

        Common.displayMessageByKey("glossary:msg.error.noWritePermission");
    });
}

mb.grantReadOnly = function() {
    $('#txtMyBoard').attr('readonly',true);
    $('#txtMyBoard').blur();

    // Switch the browsing button of the other person on the upper right to the save button
    $("#other_btn").show();
    $("#edit_btn").hide();
}

irrecoverableErrorHandler = function() {
    $("#collapse-id").empty();
    $("#exeEditer").prop("disabled", true);
};

mb.displayOwnBoardMessage = function() {
    let cellUrl = Common.getCellUrl();
    let boxUrl = Common.getBoxUrl();
    let token = Common.getToken();
    Common.showSpinner(".main_box");
    mb.displayBoardMessage(cellUrl, boxUrl, token); // AJAX
};

mb.displayAnotherBoardMessage = function(toCellUrl) {
    Common.showSpinner(".main_box");
        
    $.when(Common.getTranscellToken(toCellUrl), Common.getAppAuthToken(toCellUrl))
        .done(function(result1, result2) {
            let tempTCAT = result1[0].access_token; // Transcell Access Token
            let tempAAAT = result2[0].access_token; // App Authentication Access Token
            Common.perpareToCellInfo(toCellUrl, tempTCAT, tempAAAT, function(cellUrl, boxUrl, token) {
                let notMe = true;
                mb.displayBoardMessage(cellUrl, boxUrl, token, notMe); // AJAX
            });
        })
        .fail(function(){
            Common.hideSpinner(".main_box");
        });
};

mb.displayBoardMessage = function(cellUrl, boxUrl, token, notMe) {
    Common.getAppDataAPI(boxUrl, token).done(function(data) {
        mb.msgData = JSON.parse(data);
        if (mb.msgData.message !== undefined) {
            mb.msgData.message = mb.msgData.message.replace(/<br>/g, "\n");
        }
        let title;
        if (notMe) {
            title = 'glossary:board.Yours';
        } else {
            title = 'glossary:board.Mine';
        }
        Common.getProfileName(cellUrl, function(url, name){ 
            $("#boardTitle")
                .attr('data-i18n', title)
                .localize({
                    name: name
                });
        });
        $('.write_board').val(mb.msgData.message);
        $('.disp_board').css("display", "block");
        if (notMe) {
            $("#exeEditer")
                .prop("disabled", true)
                .hide();
        } else {
            $("#exeEditer")
                .prop("disabled", false)
                .show();
        }
    }).always(function() {
        Common.hideSpinner(".main_box");
    });
};

mb.getReceiveMessage = function() {
    $("#messageList").empty();
    mb.getReceivedMessageAPI().done(function(data) {
        var results = data.d.results;
        for (var i in results) {
            mb.createMessageList(results[i], i);
        }
    });
};

mb.createMessageList = function(result, no) {
    var title = result.Title;
    var body = result.Body;
    var fromCell = result.From;
    var uuid = result.__id;

    if (result.Status !== "approved" && result.Status !== "rejected") {
        let dispName = "";
        Common.getCell(fromCell).done(function(cellObj){
            dispName = cellObj.cell.name;
        }).fail(function(xmlObj) {
            if (xmlObj.status == "200") {
                dispName = Common.getCellNameFromUrl(fromCell);
            } else {
                dispName = fromCell;
            }
        }).always(function(){
            var html = '<div class="panel panel-default" id="recMsgParent' + no + '"><div class="panel-heading"><h4 class="panel-title accordion-togle"><a data-toggle="collapse" data-parent="#accordion" href="#recMsg' + no + '" class="allToggle collapsed">' + dispName + ':[' + title + ']</a></h4></div><div id="recMsg' + no + '" class="panel-collapse collapse"><div class="panel-body">';
            if (result.Type === "message") {
                html += '<table class="display-table"><tr><td width="80%">' + body + '</td></tr></table>';
            } else {
                html += '<table class="display-table"><tr><td width="80%">' + body + '</td>';
                html += '<td width="10%"><button onClick="Common.approvalRel(\'' + fromCell + '\', \'' + uuid + '\', \'recMsgParent' + no + '\', mb.approvalCallback);">'+ i18next.t("btn.approve") + '</button></td>';
                html += '<td width="10%"><button onClick="Common.rejectionRel(\'' + fromCell + '\', \'' + uuid + '\', \'recMsgParent' + no + '\', mb.rejectionCallback);">'+ i18next.t("btn.decline") + '</button></td>';
                html += '</tr></table>';
            }
            html += '</div></div></div>';
    
            $("#messageList").append(html);
        });
    }
}

mb.approvalCallback = function() {
    Common.getAllowedCellList(getAppRole());
};

mb.rejectionCallback = function() {
    Common.getAllowedCellList(getAppRole());
};


mb.myboardReg = function() {
    var strTxt = $("#txtMyBoard").val();
    mb.msgData.message = strTxt.replace(/\n/g, "<br>");
    mb.registerMyBoardAPI("", mb.msgData.message).done(function() {
        $("#txtMyBoard").val(strTxt);
        mb.grantReadOnly();
    }).fail(function(data) {
        var status = data.status;
        if (status == 403) {
            Common.displayMessageByKey("glossary:msg.error.noWritePermission");
        } else {
            Common.displayMessageByKey("glossary:msg.error.failedToWrite");
        }
    });
};

mb.registerMyBoardAPI = function(locked, message) {
    json = {
        "locked" : locked,
        "message" : message
    };
    return $.ajax({
        type: "PUT",
        url: Common.getBoxUrl() + 'MyBoardBox/my-board.json',
        data: JSON.stringify(json),
        dataType: 'json',
        headers: {
            'Authorization':'Bearer ' + Common.getToken(),
            'Accept':'application/json'
        }
    });
}

mb.getReceivedMessageAPI = function() {
    return $.ajax({
        type: "GET",
        url: Common.getCellUrl() + '__ctl/ReceivedMessage?$filter=startswith%28Title,%27MyBoard%27%29&$orderby=__published%20desc',
        headers: {
            'Authorization':'Bearer ' + Common.getToken(),
            'Accept':'application/json'
        }
    });
};
