# MyBoard App  
An sample app that runs on the [HomeApp](http://personium.io/demo/home-app/).  
It allows the data subject to edit it's and view other's notice board.  

[![MyBoard on YouTube](https://i.ytimg.com/vi/X_djQih94tU/1.jpg)](https://youtu.be/X_djQih94tU)  

## Installation  
Perform the following procedures by someone with admin permission of the target Personium Unit.  

### Prepare target App Cell  
Perform the following in the target Personium Unit.  

1. Download the [snapshot](https://app-myboard.appdev.personium.io/__/app-myboard-clone.zip) of the MyBoard App from the Personium Community.  
1. Import the snapshot to the target App Cell of the target Personium Unit.  
1. Create new user accounts or modify passwords for the newly target App Cell.  

### Set up target App Cell  
Perform the following in the target App Cell.  

1. Use the target App Cell's URL for the schema URL of the app Box.  
Export the app Box and upload the app Box to the main folder of the target App Cell.  
1. Use the target App Cell's URL in launch.json in the main Box.  
1. Use the target App Cell's URL and proper app authentication info in the Personium Engine.  

        __/html/Engine/__src/acc_info.js  

## Instructions on modifying this app and building your own  
You are free to use this app as base and write your own.  Basically, we reuse files that contain the "common" in their file names for all other apps. And then we edit the following constants/functions to match our needs.  

1. MyBoard is running on the following URL.  

		const APP_URL = "https://demo.personium.io/app-myboard/";

1. All the JSON files inside locales/en.  

		getNamesapces = function() {
		    return ['common', 'glossary'];
		};

1. Relation defined bar/00_meta/10_relations.json  

		getAppReadRole = function() {
		    return 'MyBoardReader';
		}

1. Location where MyBoard app stores the notice board information.  

		getAppDataPath = function() {
		    return 'MyBoardBox/my-board.json';
		}

1. AJAX option for getting data.  

		getAppRequestInfo = function() {
		    ...
		}

1. After i18next has prepare all the necessary information, it will call the following function which configure and render your app.  

		additionalCallback = function() {
			...
		}

1. When the app encounter an error which prevent it from working properly, it will display a warning dialog to notify the user to close the browser window.  
Before the dialog is displayed, your might want to hide some GUI components so that the user will not accidentally click on it.   

		irrecoverableErrorHandler = function() {
			...
		}

1. After you click the warning dialog's "OK" button, you might want to clean up your browser session before closing the window.  

		cleanUpData = function() {
			...
		}
