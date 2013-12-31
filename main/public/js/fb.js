var OPTIONS_LENGTH = 5;
var NUM_QUESTIONS = 10;

window.fbAsyncInit = function() {
    // init the FB JS SDK
    FB.init({
	appId      : '543510825740884',                    // App ID from the app dashboard
	status     : true,                                 // Check Facebook Login status
	xfbml      : true                                  // Look for social plugins on the page
    });

    var FBModel = new FBKoModel();
    FBModel.checkIfLoggedIn();
    ko.applyBindings(FBModel, $('#binder')[0]);

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

var FQL1 = "SELECT type, actor_id, message FROM stream WHERE type < 81 AND source_id IN "
		+ "(SELECT uid2 FROM friend WHERE uid1 = me()) LIMIT 120";
var FQL2 = "SELECT name, uid FROM user WHERE uid IN (SELECT actor_id FROM #query1)";

var FBKoModel = function(){
    var self = this;
    self.fLoading = ko.observable(false);
    self.fLoggedIn = ko.observable(false);
    self.fStatusShowing = ko.observable(false);
    self.fLinkShowing = ko.observable(false);
    self.fSeeNext = ko.observable(false);
    self.fCorrect = ko.observable();
    self.fGameOver = ko.observable(false);
    self.fInit = ko.observable(false);

    self.sInputName = ko.observable();
    self.sMessage = ko.observable();
    self.sActualName = ko.observable();
    self.nScore = ko.observable(0);
    self.items = new Array();
    self.allItems;
    self.idxCurrItem=0;
    self.allFriends = new Array();
    self.friendOptions = ko.observableArray();
    self.friendsMap = {};
    self.numQuestions = ko.observable(NUM_QUESTIONS);
    
    self.fQuestionShowing = ko.computed(function(){
	return self.fStatusShowing() || self.fLinkShowing();
    });

    self.checkIfLoggedIn = function(){
	FB.getLoginStatus(function(response) {
	    self.fLoggedIn(response.status === 'connected');
	});
    }

    self.FBLogin=function(){
	FB.login(function(response) {
	    if (response.authResponse) {
		self.fLoggedIn(true);
	    } else {
		console.log('User cancelled login or did not fully authorize.');
	    }
	}, {scope: 'email,read_stream,publish_actions'});
    }


    self.startGame=function(){
	self.idxCurrItem = 0;
	self.nScore(0);
	self.fGameOver(false);
	self.fLoading(true);
	if (!self.allFriends.length){
	    FB.api('/me/friends', function(friends) {
		self.allFriends = friends.data;
		self.gatherItemsFromAPI();
	    });
	} else{
	    self.gatherItemsFromAPI();
	}
    }

    // When the user hits 'Play Game!'
    self.gatherItemsFromAPI = function(){
	if(self.allItems){
	    self.initQuestions();
	} else {
	    FB.api({method: 'fql.multiquery', queries: {query1: FQL1, query2: FQL2}}, function(response) {
		// filter out items with empty messages
		self.allItems = _.filter(response[0].fql_result_set, function(item){
			if(item.message){
				// Get rid of anything that has Birthday or birthday or any other -irthday in there
				return item.message.indexOf('irthday') === -1
			}
			return false;
		});
		_.each(response[1].fql_result_set, function(friend){
		    self.friendsMap[friend.uid] = friend.name;
		});
		self.initQuestions();
	    });}
    }

    self.initQuestions = function(){
	self.fLoading(false);
	self.fInit(true);
	self.allItems = _.shuffle(self.allItems);
	for (var i=0; i<self.numQuestions();i++){
	    self.items[i] = self.allItems[i];
	}
	self.ask(self.idxCurrItem);
    }

    self.generateFriendOptions = function(){
	self.friendOptions.removeAll();
	while(self.friendOptions().length < OPTIONS_LENGTH){
	    var friend = self.allFriends[parseInt(Math.random() * self.allFriends.length)];
	    var name = friend.name;
	    if(self.friendOptions().indexOf(name) === -1){
		self.friendOptions().push(name);
	    }
	}
	self.friendOptions.push(self.sActualName());
	self.friendOptions.sort();
    }

    self.ask = function(){
	if(self.idxCurrItem == self.items.length){
	    self.fGameOver(true);
	    return;
	}
	var item = self.items[self.idxCurrItem];
	var type = item.type;
	self.sActualName(self.friendsMap[item.actor_id]);
	self.generateFriendOptions();

	if(type === '56' || type === '46'){
	    if(item.story){
		self.nextQuestion();
		return;
	    }
	    self.sMessage(item.message);
	    self.fStatusShowing(true);
	}
	else if (type === '80'){
	    var message = item.message || item.description;
	    self.sMessage(message);
	    self.fLinkShowing(true);
	}
	else{
	    self.nextQuestion();
	}
    }

    self.nextQuestion = function(){
	self.idxCurrItem++;
	self.ask(self.idxCurrItem);
    }

    self.checkName = function(){
	self.fLinkShowing(false);
	self.fStatusShowing(false);
	self.fSeeNext(true);
	if(self.sInputName().toLowerCase() === self.sActualName().toLowerCase()){
	    self.nScore(self.nScore()+1);
	    self.fCorrect(true);
	}
	else{
	    self.fCorrect(false);
	}
	self.sInputName('');
    }

    // When the user presses the button to see the next question
    self.seeNext = function(){
	self.fSeeNext(false);
	self.nextQuestion();
    }
}