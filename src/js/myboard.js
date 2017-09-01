var mb = {};

mb.msgData = null;

const APP_URL = "https://demo.personium.io/app-myboard/";

// Please add file names (with file extension) 
getNamesapces = function(){
    return ['common', 'glossary'];
};

additionalCallback = function() {
    Common.appendCommonDialog();

    Common.setAppCellUrl();

    Common.setAccessData();

    if (!Common.checkParam()) {
        // cannot do anything to recover
        // display a dialog and close the app.
        return;
    };

    mb.getMyBoardAPI(Common.getTargetUrl(), Common.accessData.token).done(function(data) {
        mb.msgData = JSON.parse(data);
        if (mb.msgData.message !== undefined) {
            mb.msgData.message = mb.msgData.message.replace(/<br>/g, "\n");
        }
        $('.write_board').append(mb.msgData.message);
        $('.disp_board').css("display", "block");
        if (Common.notMe()) {
            $("#exeEditer")
                .prop("disabled", true)
                .hide();
        }

        Common.setIdleTime();

        if (!Common.notMe()) {
            // 閲覧許可状況(外部セル)
            mb.getOtherAllowedCells();
            // 閲覧許可状況
            mb.getAllowedCellList();
            // 通知
            mb.getReceiveMessage();
        }
    });

    $('#exeEditer').on('click', function () {
        $("#txtEditMyBoard").val($("#txtMyBoard").val());
        $('#modal-edit-myboard').modal('show');
    });

    $('#b-edit-myboard-ok').on('click', function () {
        mb.myboardReg();
    });

    $('#bExtMyBoard').on('click', function () {
        var value = $("#otherAllowedCells option:selected").val();
        var childWindow = window.open('about:blank');
        $.ajax({
            type: "GET",
            url: Common.getAppCellUrl() + "__/launch.json",
            headers: {
                'Authorization':'Bearer ' + Common.accessData.token,
                'Accept':'application/json'
            }
        }).done(function(data) {
            var launchObj = data.personal;
            var launch = launchObj.web;
            var target = value + Common.getBoxName();
            mb.getTargetToken(value).done(function(extData) {
                var url = launch;
                url += '#target=' + target;
                url += '&token=' + extData.access_token;
                url += '&ref=' + extData.refresh_token;
                url += '&expires=' + extData.expires_in;
                url += '&refexpires=' + extData.refresh_token_expires_in;
                url += '&fromCell=' + Common.getCellName();
                childWindow.location.href = url;
                childWindow = null;
            });
        }).fail(function(data) {
            childWindow.close();
            childWindow = null;
        });
    });

    $('#bSendAllowed').on('click', function () {
        var value = $("#requestCells option:selected").val();
        var title = i18next.t("common.readRequestTitle");
        var body = i18next.t("common.readRequestBody");
        //var reqRel = value + "__relation/__/MyBoardReader";
        var reqRel = [
            Common.getAppCellUrl(),
            "__relation/__/MyBoardReader"
        ].join("");
        mb.sendMessageAPI(null, value, "req.relation.build", title, body, reqRel, Common.getCellUrl()).done(function(data) {
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
};

irrecoverableErrorHandler = function() {
    $("#collapse-id").empty();
    $("#exeEditer").prop("disabled", true);
};

mb.getOtherAllowedCells = function() {
    mb.getExtCell().done(function(json) {
        var objSel = document.getElementById("otherAllowedCells");
        if (objSel.hasChildNodes()) {
          while (objSel.childNodes.length > 0) {
            objSel.removeChild(objSel.firstChild);
          }
        }
        objSel = document.getElementById("requestCells");
        if (objSel.hasChildNodes()) {
          while (objSel.childNodes.length > 0) {
            objSel.removeChild(objSel.firstChild);
          }
        }

        var results = json.d.results;
        if (results.length > 0) {
            results.sort(function(val1, val2) {
              return (val1.Url < val2.Url ? 1 : -1);
            })

            for (var i in results) {
                var url = results[i].Url;
                mb.dispOtherAllowedCells(url);
            }
        }
    });
};

mb.dispOtherAllowedCells = function(extUrl) {
    mb.getProfile(extUrl).done(function(data) {
        var dispName = Common.getCellNameFromUrl(extUrl);
        if (data !== null) {
            dispName = data.DisplayName;
        }
        mb.checkOtherAllowedCells(extUrl, dispName)
    }).fail(function() {
        var dispName = Common.getCellNameFromUrl(extUrl);
        mb.checkOtherAllowedCells(extUrl, dispName)
    });
};

mb.checkOtherAllowedCells = function(extUrl, dispName) {
    mb.getTargetToken(extUrl).done(function(extData) {
        mb.getMyBoardAPI(extUrl + Common.getBoxName(), extData.access_token).done(function(data) {
            mb.appendOtherAllowedCells(extUrl, dispName);
        }).fail(function(data) {
            // Insufficient access privileges
            if (data.status === 403) {
                mb.appendRequestCells(extUrl, dispName);
            }
        });
    });
};

mb.appendOtherAllowedCells = function(extUrl, dispName) {
    $("#otherAllowedCells").append('<option value="' + extUrl + '">' + dispName + '</option>');
    $("#bExtMyBoard").prop("disabled", false);
};

mb.appendRequestCells = function(extUrl, dispName) {
    $("#requestCells").append('<option value="' + extUrl + '">' + dispName + '</option>');
    $("#bSendAllowed").prop("disabled", false);
};

mb.getAllowedCellList = function() {
    $.ajax({
        type: "GET",
        url: Common.getCellUrl() + '__ctl/Relation(Name=\'MyBoardReader\',_Box\.Name=\'' + Common.getBoxName() + '\')/$links/_ExtCell',
        headers: {
            'Authorization':'Bearer ' + Common.accessData.token,
            'Accept':'application/json'
        }
    }).done(function(data) {
        mb.dispAllowedCellList(data);
    });
};

mb.dispAllowedCellList = function(json) {
    $("#allowedCellList").empty();
    var results = json.d.results;
    if (results.length > 0) {
        results.sort(function(val1, val2) {
          return (val1.uri < val2.uri ? 1 : -1);
        })

        for (var i in results) {
          var uri = results[i].uri;
          var matchUrl = uri.match(/\(\'(.+)\'\)/);
          var extUrl = matchUrl[1];

          mb.dispAllowedCellListAfter(extUrl, i);
        }
    }
};

mb.dispAllowedCellListAfter = function(extUrl, no) {
    mb.getProfile(extUrl).done(function(data) {
        var dispName = Common.getCellNameFromUrl(extUrl);
        if (data !== null) {
            dispName = data.DisplayName;
        }
        mb.appendAllowedCellList(extUrl, dispName, no)
    }).fail(function() {
        var dispName = Common.getCellNameFromUrl(extUrl);
        mb.appendAllowedCellList(extUrl, dispName, no)
    });
};

mb.appendAllowedCellList = function(extUrl, dispName, no) {
    var tempDom = [
        '<tr id="deleteExtCellRel', no, '">',
            '<td class="paddingTd">', dispName + '</td>',
            '<td><button data-i18n="btn.release" onClick="mb.notAllowedCell(\'' + extUrl + '\', ' + no + ')">', '</button></td>',
        '</tr>'].join("");
    $("#allowedCellList")
        .append(tempDom)
        .localize();
};

mb.notAllowedCell = function(extUrl, no) {
    mb.deleteExtCellLinkRelation(extUrl, 'MyBoardReader').done(function() {
        $("#deleteExtCellRel" + no).remove();
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
                    html += '<td width="10%"><button onClick="mb.approvalRel(\'' + fromCell + '\', \'' + uuid + '\', \'recMsgParent' + i + '\');">'+ i18next.t("btn.approve") + '</button></td>';
                    html += '<td width="10%"><button onClick="mb.rejectionRel(\'' + fromCell + '\', \'' + uuid + '\', \'recMsgParent' + i + '\');">'+ i18next.t("btn.decline") + '</button></td>';
                    html += '</tr></table>';
                }
                html += '</div></div></div>';

                $("#messageList").append(html);
            }
        }
    });
};

mb.approvalRel = function(extCell, uuid, msgId) {
    mb.changeStatusMessageAPI(uuid, "approved").done(function() {
        $("#" + msgId).remove();
        mb.getAllowedCellList();
        var title = i18next.t("common.readResponseTitle");
        var body = i18next.t("common.readResponseApprovedBody");
        mb.sendMessageAPI(uuid, extCell, "message", title, body);
    });
};

mb.rejectionRel = function(extCell, uuid, msgId) {
    mb.changeStatusMessageAPI(uuid, "rejected").done(function() {
        $("#" + msgId).remove();
        mb.getAllowedCellList();
        var title = i18next.t("common.readResponseTitle");
        var body = i18next.t("common.readResponseDeclinedBody");
        mb.sendMessageAPI(uuid, extCell, "message", title, body);
    });
};

mb.getMyBoardAPI = function(targetCell, token) {
    return $.ajax({
        type: "GET",
        url: targetCell + '/MyBoardBox/my-board.json',
        dataType: "text",
        headers: {
            'Authorization':'Bearer ' + token
        }
    });
};

mb.myboardReg = function() {
    var strTxt = $("#txtEditMyBoard").val();
    mb.msgData.message = strTxt.replace(/\n/g, "<br>");
    json = {
             "message" : mb.msgData.message
    };
    $.ajax({
        type: "PUT",
        url: Common.getTargetUrl() + '/MyBoardBox/my-board.json',
        data: JSON.stringify(json),
        dataType: 'json',
        headers: {
            'Authorization':'Bearer ' + Common.accessData.token,
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

mb.getProfile = function(url) {
    return $.ajax({
	type: "GET",
	url: url + '__/profile.json',
	dataType: 'json',
        headers: {'Accept':'application/json'}
    })
};

mb.getTargetToken = function(extCellUrl) {
  return $.ajax({
                type: "POST",
                url: Common.getCellUrl() + '__token',
                processData: true,
		dataType: 'json',
                data: {
                        grant_type: "refresh_token",
                        refresh_token: Common.accessData.refToken,
                        p_target: extCellUrl
                },
		headers: {'Accept':'application/json'}
         });
};

mb.getExtCell = function() {
  return $.ajax({
                type: "GET",
                url: Common.getCellUrl() + '__ctl/ExtCell',
                headers: {
                    'Authorization':'Bearer ' + Common.accessData.token,
                    'Accept':'application/json'
                }
  });
};

mb.getReceivedMessageAPI = function() {
  return $.ajax({
                type: "GET",
                url: Common.getCellUrl() + '__ctl/ReceivedMessage?$filter=startswith%28Title,%27MyBoard%27%29&$orderby=__published%20desc',
                headers: {
                    'Authorization':'Bearer ' + Common.accessData.token,
                    'Accept':'application/json'
                }
  });
};

mb.changeStatusMessageAPI = function(uuid, command) {
    var data = {};
    data.Command = command;
    return $.ajax({
            type: "POST",
            url: Common.getCellUrl() + '__message/received/' + uuid,
            data: JSON.stringify(data),
            headers: {
                    'Authorization':'Bearer ' + Common.accessData.token
            }
    })
};

mb.deleteExtCellLinkRelation = function(extCell, relName) {
    var urlArray = extCell.split("/");
    var hProt = urlArray[0].substring(0, urlArray[0].length - 1);
    var fqdn = urlArray[2];
    var cellName = urlArray[3];
    return $.ajax({
            type: "DELETE",
            url: Common.getCellUrl() + '__ctl/ExtCell(\'' + hProt + '%3A%2F%2F' + fqdn + '%2F' + cellName + '%2F\')/$links/_Relation(Name=\'' + relName + '\',_Box.Name=\'' + Common.getBoxName() + '\')',
            headers: {
              'Authorization':'Bearer ' + Common.accessData.token
            }
    });
};

mb.sendMessageAPI = function(uuid, extCell, type, title, body, reqRel, reqRelTar) {
    var data = {};
    data.BoxBound = true;
    data.InReplyTo = uuid;
    data.To = extCell;
    data.ToRelation = null
    data.Type = type;
    data.Title = title;
    data.Body = body;
    data.Priority = 3;
    if (reqRel) {
        data.RequestRelation = reqRel;
    }
    if (reqRelTar) {
        data.RequestRelationTarget = reqRelTar;
    }

    return $.ajax({
            type: "POST",
            url: Common.getCellUrl() + '__message/send',
            data: JSON.stringify(data),
            headers: {
                    'Authorization':'Bearer ' + Common.accessData.token
            }
    })
};
