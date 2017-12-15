// Login
function(request){
  var rootUrl = "https://demo.personium.io";
  var appCellName = "app-myboard";
  
  var bodyAsString = request["input"].readAll();
  if (bodyAsString === "") {
      return {
             status : 200,
             headers : {"Content-Type":"application/json"},
             body : ['-2']
      };
  }
  var params = dc.util.queryParse(bodyAsString);

  if (!params.p_target) {
      return {
             status : 200,
             headers : {"Content-Type":"application/json"},
             body : ['-2']
      };
  }

  // Get App Token
  var appCellAuthInfo = {
      "cellUrl": [ rootUrl, appCellName ].join("/"),
      "userId": "***",
      "password": "***"
  };
    var appCell = dc.as(appCellAuthInfo).cell(params.p_target);
  var ret = appCell.getToken();

  // Return App Token
  return {
    status: 200,
    headers: {"Content-Type":"application/json"},
    body: [JSON.stringify(ret)]
  };
}
