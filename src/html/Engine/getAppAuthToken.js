// Login
function(request){
    try {
        personium.validateRequestMethod(["POST"], request);
    
        personium.verifyOrigin(request);

        var params = personium.parseBodyAsQuery(request);
        // verify parameter information
        personium.setAllowedKeys(['p_target']);
        personium.setRequiredKeys(['p_target']);
        personium.validateKeys(params);

        var appToken = personium.getAppToken(params.p_target);
        return personium.createResponse(200, appToken);
    } catch (e) {
        return personium.createErrorResponse(e);
    }
}

var personium = require("personium").personium;
