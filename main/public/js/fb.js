var OPTIONS_LENGTH = 5;
var NUM_QUESTIONS = 7;

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
var FQL_FRIENDS = "SELECT name, uid, pic FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1=me())";

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
    self.fScorePosted = ko.observable(false);

    self.sInputName = ko.observable();
    self.sMessage = ko.observable();
    self.oActualFriend;
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
	self.fScorePosted(false);
	self.fGameOver(false);
	self.fLoading(true);
	if(self.allItems){
		self.initQuestions();
	}
	else{
		self.gatherItemsFromAPI();	
	}
    }

    // When the user hits 'Play Game!'
    self.gatherItemsFromAPI = function(){
		var query_params = {query0: FQL1, query1: FQL_FRIENDS};
	    FB.api({method: 'fql.multiquery', queries: query_params}, function(response) {
		// filter out items with empty messages
		self.allItems = _.filter(response[0].fql_result_set, function(item){
		    if(item.message){
			// Get rid of anything that has Birthday or birthday or any other -irthday in there
			return item.message.indexOf('irthday') === -1
		    }
		    return false;
		});
		_.each(response[1].fql_result_set, function(friend){
			self.allFriends = response[1].fql_result_set;
			var friendObj = {
				name: friend.name,
				pic: friend.pic
			}
		    self.friendsMap[friend.uid] = friendObj;
		});
		self.initQuestions();
	    });
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

    self.ask = function(){
	if(self.idxCurrItem == self.items.length){
	    self.fGameOver(true);
	    return;
	}
	var item = self.items[self.idxCurrItem];
	var type = item.type;
	self.oActualFriend = self.friendsMap[item.actor_id]
	self.sActualName(self.oActualFriend.name);
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

    self.generateFriendOptions = function(){
	self.friendOptions.removeAll();
	while(self.friendOptions().length < OPTIONS_LENGTH){
	    var friendObj = self.allFriends[parseInt(Math.random() * self.allFriends.length)];
	    if(self.friendOptions().indexOf(friendObj.name) === -1){
		self.friendOptions().push(friendObj);
	    }
	}
	self.friendOptions.push(self.oActualFriend);
	self.friendOptions.sort();
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

    self.postScore = function(){
    	var postMessage = 'I scored a '+self.nScore()+'! Give it a try too!';
	var params = {message: postMessage};
	FB.api("me/feed", 'post', params, function(response) {
	    if (!response || response.error){
		console.log(response.error.message);
	    }
	    else{
		self.fScorePosted(true);
	    }
	});
    }
}