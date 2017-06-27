var mb = {};

mb.target = null;
mb.cellUrl = null;
mb.token = null;
mb.refToken = null;
mb.expires = null;
mb.refExpires = null;

mb.msgData = null;

mb.IDLE_TIMEOUT =  3600000;
mb.LASTACTIVITY = new Date().getTime();

mb.getName = function(path) {
  var collectionName = path;
  var recordsCount = 0;
  if (collectionName != undefined) {
          recordsCount = collectionName.length;
          var lastIndex = collectionName.lastIndexOf("/");
          if (recordsCount - lastIndex === 1) {
                  collectionName = path.substring(0, recordsCount - 1);
                  recordsCount = collectionName.length;
                  lastIndex = collectionName.lastIndexOf("/");
          }
          collectionName = path.substring(lastIndex + 1, recordsCount);
  }
  return collectionName;
};

$(document).ready(function() {
    var appUrlMatch = location.href.split("#");
    var appUrlSplit = appUrlMatch[0].split("/");
    mb.appUrl = appUrlSplit[0] + "//" + appUrlSplit[2] + "/" + appUrlSplit[3] + "/";
    if (appUrlSplit[0].indexOf("file:") == 0) {
        mb.appUrl = "https://demo.personium.io/app-myboard/";
    }

    var hash = location.hash.substring(1);
    var params = hash.split("&");
    for (var i in params) {
        var param = params[i].split("=");
        var id = param[0];
        switch (id) {
            case "target":
                mb.target = param[1];
                var urlSplit = param[1].split("/");
                mb.cellUrl = urlSplit[0] + "//" + urlSplit[2] + "/" + urlSplit[3] + "/";
                var split = mb.target.split("/");
                mb.boxName = split[split.length - 1];
            case "token":
                mb.token = param[1];
            case "ref":
                mb.refToken = param[1];
            case "expires":
                mb.expires = param[1];
            case "refexpires":
                mb.refExpires = param[1];
        }
    }

    if (mb.checkParam()) {
        mb.getMyBoardAPI(mb.target, mb.token).done(function(data) {
            mb.msgData = JSON.parse(data);
            if (mb.msgData.message !== undefined) {
                mb.msgData.message = mb.msgData.message.replace(/<br>/g, "\n");
            }
            $('.write_board').append(mb.msgData.message);
            $('.disp_board').css("display", "block");
            //mb.setIdleTime();

            
            // 閲覧許可状況(外部セル)
            mb.getOtherAllowedCells();
            // 閲覧許可状況
            mb.getAllowedCellList();
            // 通知
            mb.getReceiveMessage();
        });
    }

    $('#b-session-relogin-ok').on('click', function () {
        open(location, '_self').close();
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
        if (value == undefined || value === "") {
            $("#popupSendAllowedErrorMsg").html('対象セルを選択して下さい。');
        } else {
             var childWindow = window.open('about:blank');
             $.ajax({
                 type: "GET",
                 url: mb.appUrl + "__/launch.json",
                 headers: {
                     'Authorization':'Bearer ' + mb.token,
                     'Accept':'application/json'
                 }
             }).done(function(data) {
                 var launchObj = data.personal;
                 var launch = launchObj.web;
                 var target = value + mb.boxName;
                 mb.getTargetToken(value).done(function(extData) {
                     var url = launch;
                     url += '#target=' + target;
                     url += '&token=' + extData.access_token;
                     url += '&ref=' + extData.refresh_token;
                     url += '&expires=' + extData.expires_in;
                     url += '&refexpires=' + extData.refresh_token_expires_in;
                     childWindow.location.href = url;
                     childWindow = null;
                 });
             }).fail(function(data) {
                 childWindow.close();
                 childWindow = null;
             });
        }
    });

    $('#bSendAllowed').on('click', function () {
        var value = $("#requestCells option:selected").val();
        if (value == undefined || value === "") {
            $("#popupSendAllowedErrorMsg").html('対象セルを選択して下さい。');
        } else {
            var title = "MyBoard_閲覧許可依頼";
            var body = "MyBoardの閲覧許可をお願いします。";
            //var reqRel = value + "__relation/__/MyBoardReader";
            var reqRel = "https://demo.personium.io/app-myboard/__relation/__/MyBoardReader";
            mb.sendMessageAPI(null, value, "req.relation.build", title, body, reqRel, mb.cellUrl).done(function(data) {
                $("#popupSendAllowedErrorMsg").html('メッセージを送信しました。');
            }).fail(function(data) {
                $("#popupSendAllowedErrorMsg").html('メッセージの送信に失敗しました。');
            });
        }
    });

    $("#extCellMyBoard").on('show.bs.collapse', function() {
        $("#sendAllowedMessage").removeClass('in');
        $("#sendAllowedMessage").attr("aria-expanded", false);
        $("#listAllowed").removeClass('in');
        $("#listAllowed").attr("aria-expanded", false);
        $("#receiveMessage").removeClass('in');
        $("#receiveMessage").attr("aria-expanded", false);
    });
    $("#sendAllowedMessage").on('show.bs.collapse', function() {
        $("#extCellMyBoard").removeClass('in');
        $("#extCellMyBoard").attr("aria-expanded", false);
        $("#listAllowed").removeClass('in');
        $("#listAllowed").attr("aria-expanded", false);
        $("#receiveMessage").removeClass('in');
        $("#receiveMessage").attr("aria-expanded", false);
        $("#popupSendAllowedErrorMsg").html('');
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
});

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
        var dispName = mb.getName(extUrl);
        if (data !== null) {
            dispName = data.DisplayName;
        }
        mb.checkOtherAllowedCells(extUrl, dispName)
    }).fail(function() {
        var dispName = mb.getName(extUrl);
        mb.checkOtherAllowedCells(extUrl, dispName)
    });
};

mb.checkOtherAllowedCells = function(extUrl, dispName) {
    mb.getTargetToken(extUrl).done(function(extData) {
        mb.getMyBoardAPI(extUrl + mb.boxName, extData.access_token).done(function(data) {
            mb.appendOtherAllowedCells(extUrl, dispName);
        }).fail(function(data) {
            if (data.status !== 404) {
                mb.appendRequestCells(extUrl, dispName);
            }
        });
    });
};

mb.appendOtherAllowedCells = function(extUrl, dispName) {
    $("#otherAllowedCells").append('<option value="' + extUrl + '">' + dispName + '</option>');
};

mb.appendRequestCells = function(extUrl, dispName) {
    $("#requestCells").append('<option value="' + extUrl + '">' + dispName + '</option>');
};

mb.getAllowedCellList = function() {
    $.ajax({
        type: "GET",
        url: mb.cellUrl + '__ctl/Relation(Name=\'MyBoardReader\',_Box\.Name=\'' + mb.boxName + '\')/$links/_ExtCell',
        headers: {
            'Authorization':'Bearer ' + mb.token,
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
        var dispName = mb.getName(extUrl);
        if (data !== null) {
            dispName = data.DisplayName;
        }
        mb.appendAllowedCellList(extUrl, dispName, no)
    }).fail(function() {
        var dispName = mb.getName(extUrl);
        mb.appendAllowedCellList(extUrl, dispName, no)
    });
};

mb.appendAllowedCellList = function(extUrl, dispName, no) {
    $("#allowedCellList").append('<tr id="deleteExtCellRel' + no + '"><td class="paddingTd">' + dispName + '</td><td><button onClick="mb.notAllowedCell(\'' + extUrl + '\', ' + no + ')">解除</button></td></tr>');
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
                var html = '<div class="panel panel-default" id="recMsgParent' + i + '"><div class="panel-heading"><h4 class="panel-title accordion-togle"><a data-toggle="collapse" data-parent="#accordion" href="#recMsg' + i + '" class="allToggle collapsed">' + mb.getName(fromCell) + ':[' + title + ']</a></h4></div><div id="recMsg' + i + '" class="panel-collapse collapse"><div class="panel-body">';
                if (results[i].Type === "message") {
                    html += '<table class="display-table"><tr><td width="80%">' + body + '</td></tr></table>';
                } else {
                    html += '<table class="display-table"><tr><td width="80%">' + body + '</td>';
                    html += '<td width="10%"><button onClick="mb.approvalRel(\'' + fromCell + '\', \'' + uuid + '\', \'recMsgParent' + i + '\');">承諾</button></td>';
                    html += '<td width="10%"><button onClick="mb.rejectionRel(\'' + fromCell + '\', \'' + uuid + '\', \'recMsgParent' + i + '\');">拒否</button></td>';
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
        var title = "MyBoard_登録依頼返信";
        var body = "承認しました。";
        mb.sendMessageAPI(uuid, extCell, "message", title, body);
    });
};

mb.rejectionRel = function(extCell, uuid, msgId) {
    mb.changeStatusMessageAPI(uuid, "rejected").done(function() {
        $("#" + msgId).remove();
        mb.getAllowedCellList();
        var title = "MyBoard_登録依頼返信";
        var body = "拒否しました。";
        mb.sendMessageAPI(uuid, extCell, "message", title, body);
    });
};

mb.checkParam = function() {
    var msg = "";
    if (mb.target === null) {
        msg = '対象セルが設定されていません。';
    } else if (mb.token === null) {
        msg = 'トークンが設定されていません。';
    } else if (mb.refToken === null) {
        msg = 'リフレッシュトークンが設定されていません。';
    } else if (mb.expires === null) {
        msg = 'トークンの有効期限が設定されていません。';
    } else if (mb.refExpires === null) {
        msg = 'リフレッシュトークンの有効期限が設定されていません。';
    }

    if (msg.length > 0) {
        $('#errorMsg').html(msg);
        $('#errorMsg').css("display", "block");
        return false;
    }

    return true;
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
        url: mb.target + '/MyBoardBox/my-board.json',
        data: JSON.stringify(json),
        dataType: 'json',
        headers: {
            'Authorization':'Bearer ' + mb.token,
            'Accept':'application/json'
        }
    }).done(function() {
        //$('.write_board').html(mb.msgData.message);
        //$('#errorMsg').html("保存しました。");
        //$('#errorMsg').css("display", "block");
        $("#txtMyBoard").val(strTxt);
        $('#modal-edit-myboard').modal('hide');
    }).fail(function(data) {
        var status = data.status;
        if (status == 403) {
            $('#errorMsg').html("書込み権限がありません。");
        } else {
            $('#errorMsg').html("書込みに失敗しました。");
        }
        $('#errorMsg').css("display", "block");
        $('#modal-edit-myboard').modal('hide');
    });
};

// This method checks idle time
mb.setIdleTime = function() {
    mb.refreshTokenAPI().done(function(data) {
        mb.token = data.access_token;
        mb.refToken = data.refresh_token;
        mb.expires = data.expires_in;
        mb.refExpires = data.refresh_token_expires_in;
    }).fail(function(data) {
        $("#collapse-id").empty();
        $("#exeEditer").prop("disabled", true);
    });

    setInterval(mb.checkIdleTime, 3300000);
    document.onclick = function() {
      mb.LASTACTIVITY = new Date().getTime();
    };
    document.onmousemove = function() {
      mb.LASTACTIVITY = new Date().getTime();
    };
    document.onkeypress = function() {
      mb.LASTACTIVITY = new Date().getTime();
    };
}
mb.checkIdleTime = function() {
  if (new Date().getTime() > mb.LASTACTIVITY + mb.IDLE_TIMEOUT) {
    $('#modal-session-expired').modal('show');
  } else {
      mb.refreshToken();
  }
};

mb.refreshToken = function() {
    mb.refreshTokenAPI().done(function(data) {
        mb.token = data.access_token;
        mb.refToken = data.refresh_token;
        mb.expires = data.expires_in;
        mb.refExpires = data.refresh_token_expires_in;
    });
};

mb.refreshTokenAPI = function() {
    return $.ajax({
        type: "POST",
        url: mb.cellUrl + '__token',
        processData: true,
        dataType: 'json',
        data: {
               grant_type: "refresh_token",
               refresh_token: mb.refToken
        },
        headers: {'Accept':'application/json'}
    })
}

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
                url: mb.cellUrl + '__token',
                processData: true,
		dataType: 'json',
                data: {
                        grant_type: "refresh_token",
                        refresh_token: mb.refToken,
                        p_target: extCellUrl
                },
		headers: {'Accept':'application/json'}
         });
};

mb.getExtCell = function() {
  return $.ajax({
                type: "GET",
                url: mb.cellUrl + '__ctl/ExtCell',
                headers: {
                    'Authorization':'Bearer ' + mb.token,
                    'Accept':'application/json'
                }
  });
};

mb.getReceivedMessageAPI = function() {
  return $.ajax({
                type: "GET",
                url: mb.cellUrl + '__ctl/ReceivedMessage?$filter=startswith%28Title,%27MyBoard%27%29&$orderby=__published%20desc',
                headers: {
                    'Authorization':'Bearer ' + mb.token,
                    'Accept':'application/json'
                }
  });
};

mb.changeStatusMessageAPI = function(uuid, command) {
    var data = {};
    data.Command = command;
    return $.ajax({
            type: "POST",
            url: mb.cellUrl + '__message/received/' + uuid,
            data: JSON.stringify(data),
            headers: {
                    'Authorization':'Bearer ' + mb.token
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
            url: mb.cellUrl + '__ctl/ExtCell(\'' + hProt + '%3A%2F%2F' + fqdn + '%2F' + cellName + '%2F\')/$links/_Relation(Name=\'' + relName + '\',_Box.Name=\'' + mb.boxName + '\')',
            headers: {
              'Authorization':'Bearer ' + mb.token
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
            url: mb.cellUrl + '__message/send',
            data: JSON.stringify(data),
            headers: {
                    'Authorization':'Bearer ' + mb.token
            }
    })
};