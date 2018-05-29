exports.accInfo = (function() {
    /*
     * Begin of your Personium app configurations
     */
    var rootUrl = '***'; // for example: https://demo.personium.io
    var appCellName = '***'; // for example: app-minimal
    var appUserId = '***';
    var appUserPass = '***';
    /*
     * End of your Personium app configurations
     */


    /*
     * Don't modify anything from here on
     */
    var accInfo = {};
    var appCellUrl = [ rootUrl, appCellName, '' ].join('/'); // always with ending slash
    accInfo.APP_CELL_URL = appCellUrl;
    accInfo.APP_CELL_ADMIN_INFO = {
        cellUrl: appCellName,
        userId: appUserId,
        password: appUserPass 
    };      

    return accInfo;
}());
