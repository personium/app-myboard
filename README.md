# MyBoard App  
An sample app that runs on the [HomeApp](http://personium.io/demo/home-app/).  
It allows the data subject to edit it's and view other's notice board.  

## Installation  
TBD  

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
