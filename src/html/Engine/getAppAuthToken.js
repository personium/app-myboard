// Login
function(request){
    var rootUrl = "***";
    var appCellName = "***";
    var appCellUrl = [ rootUrl, appCellName ].join("/");

    var refererUrl = request["headers"]["referer"];
    if (refererUrl.indexOf(appCellUrl) != 0) {
        return {
            status : 500,
            headers : {"Content-Type":"application/json"},
            body: [{"code": "500", "message": "Cross-domain request not allowed."}]
        };
    }

    var bodyAsString = request["input"].readAll();
    if (bodyAsString === "") {
        return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: [{"code": "400", "message": "Request body is empty."}]
        };
    }
    var params = dc.util.queryParse(bodyAsString);

    if (!params.p_target) {
        return {
            status : 400,
            headers : {"Content-Type":"application/json"},
            body: [{"code": "400", "message": "Required paramter [p_target] missing."}]
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
            body: [{"code": "500", "message": e}]
        };
    }


    // Return App Token
    return {
        status: 200,
        headers: {"Content-Type":"application/json"},
        body: [JSON.stringify(ret)]
    };
}
