var mb = {};

mb.msgData = null;

const APP_URL = "https://demo.personium.io/app-myboard/";
const APP_BOX_NAME = 'io_personium_demo_app-myboard';

getEngineEndPoint = function() {
    return Common.getAppCellUrl() + "__/html/Engine/getAppAuthToken";
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

additionalCallback = function() {
    mb.displayOwnBoardMessage();

    Common.setIdleTime();

    // 閲覧許可状況(外部セル)
    Common.getOtherAllowedCells();
    // 閲覧許可状況
    Common.getAllowedCellList(getAppRole());
    // 通知
    mb.getReceiveMessage();

    $('#exeEditer').on('click', function () {
        $("#txtEditMyBoard").val($("#txtMyBoard").val());
        $('#modal-edit-myboard').modal('show');
    });

    $('#b-edit-myboard-ok').on('click', function () {
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

    $('body > div.mySpinner').hide();
    $('body > div.myHiddenDiv').show();
};

irrecoverableErrorHandler = function() {
    $("#collapse-id").empty();
    $("#exeEditer").prop("disabled", true);
};

mb.displayOwnBoardMessage = function() {
    let cellUrl = Common.getCellUrl();
    let boxUrl = Common.getBoxUrl();
    let token = Common.getToken();
    $('.main_box > div.mySpinner').show();
    $('.main_box > div.myHiddenDiv').hide();
    mb.displayBoardMessage(cellUrl, boxUrl, token); // AJAX
};

mb.displayAnotherBoardMessage = function(toCellUrl) {
    $('.main_box > div.mySpinner').show();
    $('.main_box > div.myHiddenDiv').hide();
        
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
            $('.main_box > div.mySpinner').hide();
            $('.main_box > div.myHiddenDiv').show();
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
        $('.main_box > div.mySpinner').hide();
        $('.main_box > div.myHiddenDiv').show();
    });
};

mb.getReceiveMessage = function() {
    $("#messageList").empty();
    mb.getReceivedMessageAPI().done(function(data) {
        var results = data.d.results;
        for (var i in results) {
            var title = results[i].Title;
            var body = results[i].Body;
            var fromCell = results[i].From;
            var uuid = results[i].__id;

            if (results[i].Status !== "approved" && results[i].Status !== "rejected") {
                var html = '<div class="panel panel-default" id="recMsgParent' + i + '"><div class="panel-heading"><h4 class="panel-title accordion-togle"><a data-toggle="collapse" data-parent="#accordion" href="#recMsg' + i + '" class="allToggle collapsed">' + Common.getCellNameFromUrl(fromCell) + ':[' + title + ']</a></h4></div><div id="recMsg' + i + '" class="panel-collapse collapse"><div class="panel-body">';
                if (results[i].Type === "message") {
                    html += '<table class="display-table"><tr><td width="80%">' + body + '</td></tr></table>';
                } else {
                    html += '<table class="display-table"><tr><td width="80%">' + body + '</td>';
                    html += '<td width="10%"><button onClick="Common.approvalRel(\'' + fromCell + '\', \'' + uuid + '\', \'recMsgParent' + i + '\');">'+ i18next.t("btn.approve") + '</button></td>';
                    html += '<td width="10%"><button onClick="Common.rejectionRel(\'' + fromCell + '\', \'' + uuid + '\', \'recMsgParent' + i + '\');">'+ i18next.t("btn.decline") + '</button></td>';
                    html += '</tr></table>';
                }
                html += '</div></div></div>';

                $("#messageList").append(html);
            }
        }
    });
};

mb.approvalCallback = function() {
    Common.getAllowedCellList(getAppRole());
};

mb.rejectionCallback = function() {
    Common.getAllowedCellList(getAppRole());
};


mb.myboardReg = function() {
    var strTxt = $("#txtEditMyBoard").val();
    mb.msgData.message = strTxt.replace(/\n/g, "<br>");
    json = {
        "message" : mb.msgData.message
    };
    $.ajax({
        type: "PUT",
        url: Common.getBoxUrl() + 'MyBoardBox/my-board.json',
        data: JSON.stringify(json),
        dataType: 'json',
        headers: {
            'Authorization':'Bearer ' + Common.getToken(),
            'Accept':'application/json'
        }
    }).done(function() {
        $("#txtMyBoard").val(strTxt);
        $('#modal-edit-myboard').modal('hide');
    }).fail(function(data) {
        var status = data.status;
        if (status == 403) {
            Common.displayMessageByKey("glossary:msg.error.noWritePermission");
        } else {
            Common.displayMessageByKey("glossary:msg.error.failedToWrite");
        }
        $('#modal-edit-myboard').modal('hide');
    });
};

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
