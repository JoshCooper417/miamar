window.fbAsyncInit = function() {
    // init the FB JS SDK
    FB.init({
	appId      : '543510825740884',                    // App ID from the app dashboard
	status     : true,                                 // Check Facebook Login status
	xfbml      : true                                  // Look for social plugins on the page
    });

    // Additional initialization code such as adding Event Listeners goes here
};

// Load the SDK asynchronously
(function(){
    // If we've already installed the SDK, we're done
    if (document.getElementById('facebook-jssdk')) {return;}

    // Get the first script element, which we'll use to find the parent node
    var firstScriptElement = document.getElementsByTagName('script')[0];

    // Create a new script element and set its id
    var facebookJS = document.createElement('script'); 
    facebookJS.id = 'facebook-jssdk';

    // Set the new script's source to the source of the Facebook JS SDK
    facebookJS.src = '//connect.facebook.net/en_US/all.js';

    // Insert the Facebook JS SDK into the DOM
    firstScriptElement.parentNode.insertBefore(facebookJS, firstScriptElement);
}());

var FBKoModel = function(){
    var self = this;
    self.fLoggedIn = ko.observable(false);
    self.fStatusShowing = ko.observable(false);
    self.fLinkShowing = ko.observable(false);
    self.sInputName = ko.observable();
    self.sMessage = ko.observable();
    self.sActualName = '';
    self.nScore = ko.observable(0);
    self.fInit = ko.observable(false);
    self.fSeeNext = ko.observable(false);
    self.fCorrect = ko.observable();
    self.items;
    self.i=0;
    self.fGameOver = ko.observable(false);

    self.FBLogin=function(){
	FB.login(function(response) {
	    if (response.authResponse) {
		console.log('Welcome!  Fetching your information.... ');
		FB.api('/me', function(response) {
		    console.log('Good to see you, ' + response.name + '.');
		});
		self.fLoggedIn(true);
	    } else {
		console.log('User cancelled login or did not fully authorize.');
	    }
	}, {scope: 'email,read_stream'});
    }

    self.DoStuff=function(){
	FB.api('/me/home', function(response) {
	    self.fInit(true);
	    self.items = response.data;
	    self.ask(self.i);
	});
    }

    self.ask = function(){
	if(self.i == self.items.length){
	    self.fGameOver(true);
	    return;
	}
	var item = self.items[self.i];
	var type = item.type;
	self.sActualName = item.from.name;
	if(type === 'status'){
	    if(item.story){
		self.terminate();
		return;
	    }
	    self.sMessage('\n\n'+item.message);
	    self.fStatusShowing(true);
	}
	else if (type === 'link'){
	    var message = item.message || item.description;
	    self.sMessage('\n\n'+message);
	    self.fLinkShowing(true);
	}
	else{
	    self.terminate();
	}
    }
    self.terminate = function(){
	    self.i++;
	    self.ask(self.i);
    }
    self.checkName = function(){
	self.fSeeNext(true);
	if(self.sInputName().toLowerCase() === self.sActualName.toLowerCase()){
	    self.nScore(self.nScore()+1);
	    self.fCorrect(true);
	}
	else{
	    self.fCorrect(false);
	}
	self.fLinkShowing(false);
	self.fStatusShowing(false);
	self.sInputName('');
    }
    self.seeNext = function(){
	self.fSeeNext(false);
	self.terminate();
    }
}


$(window).load(function(){
    var FBModel = new FBKoModel();
    ko.applyBindings(FBModel, $('#binder')[0]);
});