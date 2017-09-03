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
 mb.approvalRel = function(extCell, uuid, msgId) {
    mb.changeStatusMessageAPI(uuid, "approved").done(function() {
        $("#" + msgId).remove();
        mb.getAllowedCellList();
        var title = i18next.t("readResponseTitle");
        var body = i18next.t("readResponseApprovedBody");
        mb.sendMessageAPI(uuid, extCell, "message", title, body);
    });
};

mb.rejectionRel = function(extCell, uuid, msgId) {
    mb.changeStatusMessageAPI(uuid, "rejected").done(function() {
        $("#" + msgId).remove();
        mb.getAllowedCellList();
        var title = i18next.t("readResponseTitle");
        var body = i18next.t("readResponseDeclinedBody");
        mb.sendMessageAPI(uuid, extCell, "message", title, body);
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
            'Authorization':'Bearer ' + Common.getToken()
        }
    })
};

mb.getAllowedCellList = function() {
    let extCellUrl = [
        Common.getCellUrl(),
        '__ctl/Relation(Name=\'',
        getAppReadRelation(),
        '\',_Box\.Name=\'',
        Common.getBoxName(),
        '\')/$links/_ExtCell'
    ].join("");

    $.ajax({
        type: "GET",
        url: extCellUrl,
        headers: {
            'Authorization':'Bearer ' + Common.getToken(),
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
    $("#allowedCellList")
        .append('<tr id="deleteExtCellRel' + no + '"><td class="paddingTd">' + dispName + '</td><td><button onClick="mb.notAllowedCell(this)" data-ext-url="' + extUrl + '"data-i18n="btn.release">' + '</button></td></tr>')
        .localize();
};

mb.notAllowedCell = function(aDom) {
    let extUrl = $(aDom).data("extUrl");
    mb.deleteExtCellLinkRelation(extUrl, getAppReadRelation()).done(function() {
        $(aDom).closest("tr").remove();
    });
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
            'Authorization':'Bearer ' + Common.getToken()
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
            'Authorization':'Bearer ' + Common.getToken()
        }
    })
};