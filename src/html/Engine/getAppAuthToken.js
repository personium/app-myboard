// Login
function(request){
    var rootUrl = "***";
    var appCellName = "***";
    var appCellUrl = [ rootUrl, appCellName ].join("/");

    var refererUrl = request["headers"]["referer"];
    /*
     * Usually only your App's URL is enough.
     * However, if you can allow other Apps to call your function to get Authentication Token.
     */
    var refererUrlList = [appCellUrl];
    var urlAllowed = false;
    for (i = 0; i < refererUrlList.length; i++) {
        if (!refererUrl && refererUrl.indexOf(refererUrlList[i]) == 0) {
            urlAllowed = true;
            break;
        }
    }
    if (!urlAllowed) {
        return {
            status : 500,
            headers : {"Content-Type":"application/json"},
            body: [JSON.stringify({"code": "500", "message": "Cross-domain request not allowed."})]
        };
    }

    var bodyAsString = request["input"].readAll();
    if (bodyAsString === "") {
        return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: [JSON.stringify({"code": "400", "message": "Request body is empty."})]
        };
    }
    var params = dc.util.queryParse(bodyAsString);

    if (!params.p_target) {
        return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: [JSON.stringify({"code": "400", "message": "Required paramter [p_target] missing."})]
        };
    }

    // Get App Token
    var appCellAuthInfo = {
        "cellUrl": appCellUrl,
        "userId": "***",
        "password": "***"
    };
    var ret;
    try {
        var appCell = dc.as(appCellAuthInfo).cell(params.p_target);
        ret = appCell.getToken();
    } catch (e) {
        return {
            status: 500,
            headers: {"Content-Type":"application/json"},
            body: [JSON.stringify({"code": "500", "message": e})]
        };
    }


    // Return App Token
    return {
        status: 200,
        headers: {"Content-Type":"application/json"},
        body: [JSON.stringify(ret)]
    };
}
