var OPTIONS_LENGTH = 5;
var NUM_QUESTIONS = 10;
var NUM_CHANCES = 3;
var FBModel;

window.fbAsyncInit = function() {
    // init the FB JS SDK
    FB.init({
	appId      : '543510825740884',                    // App ID from the app dashboard
	status     : true,                                 // Check Facebook Login status
	xfbml      : true                                  // Look for social plugins on the page
    });

    FBModel.checkIfLoggedIn();
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

var FQL_FRIENDS = "SELECT name, uid FROM user WHERE uid IN (SELECT uid2 FROM friend WHERE uid1=me())";
var FQL_PICS = "SELECT id, url FROM profile_pic WHERE id IN (SELECT uid from #query1) AND width = 200 AND height = 200";

var FQL_STATUS1 = "SELECT uid,message FROM status WHERE uid = ";
var FQL_STATUS2 = " LIMIT 1";

var FBKoModel = function(){
    var self = this;
    self.fLoading = ko.observable(false);
    self.fCheckedIfLoggedIn = ko.observable(false);
    self.fLoggedIn = ko.observable(false);
    self.fQuestionShowing = ko.observable(false);
    self.fSeeNext = ko.observable(false);
    self.fCorrect = ko.observable();
    self.fGameOver = ko.observable(false);
    self.fInit = ko.observable(false);
    self.fScorePosted = ko.observable(false);
    self.fCheckingName = ko.observable(false);

    self.sMessage = ko.observable();
    self.oActualFriend;
    self.sActualName = ko.observable();
    self.nScore = ko.observable(0);
    self.nIncorrect = ko.observable(0);
    self.items = new Array();
    self.idxCurrItem=0;
    self.allFriends = new Array();
    self.friendOptions = ko.observableArray();
    self.friendsMap = {};
    self.numQuestions = ko.observable(NUM_QUESTIONS);

    self.checkIfLoggedIn = function(){
	FB.getLoginStatus(function(response) {
	    self.fCheckedIfLoggedIn(true);
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
	self.nIncorrect(0);
	self.nScore(0);
	self.fScorePosted(false);
	self.fGameOver(false);
	self.fSeeNext(false);
	self.fLoading(true);
	if(self.allFriends.length){
	    self.gatherItems();
	}
	else{
	    self.collectFriends();	
	}
    }

    // When the user hits 'Play Game!'
    self.collectFriends = function(){
	var query_params = {query1: FQL_FRIENDS, query2: FQL_PICS};
	FB.api({method: 'fql.multiquery', queries: query_params}, function(response) {
	    self.allFriends = response[0].fql_result_set;
	    _.each(response[0].fql_result_set, function(friend){
		self.friendsMap[friend.uid] = friend;
	    });
	    // Add pic urls
	    _.each(response[1].fql_result_set, function(pic){
		self.friendsMap[pic.id].pic_square = pic.url;
	    });
	    self.gatherItems();
	});
    }

    self.gatherItems = function(){
	var friendIDs = new Array();
	for (var i=0; i<OPTIONS_LENGTH;i++){
	    friendIDs[i] = self.allFriends[parseInt(Math.random() * self.allFriends.length)].uid;
	}
	var params = {};
	for (var i=0; i<friendIDs.length;i++){
	    var queryID = 'query'+i;
	    var query = FQL_STATUS1 + friendIDs[i] + FQL_STATUS2;
	    params[queryID] = query;
	}
	FB.api({method: 'fql.multiquery', queries: params}, function(response){
	    var good_responses = _.filter(response,function(r){
		if(r.fql_result_set.length){
		    return r.fql_result_set[0].message;
		};
		return false;
	    });
	    for (var i=0; i<good_responses.length; i++){
		var message_obj = {};
		message_obj['id'] = good_responses[i].fql_result_set[0].uid;
		message_obj['message'] = good_responses[i].fql_result_set[0].message;
		self.items[i] = message_obj;
	    }
	    self.askFirstQuestion();
	});
    }

    self.askFirstQuestion = function(){
	self.fLoading(false);
	self.fInit(true);
	self.ask(self.idxCurrItem);
    }

    self.ask = function(){
	self.fCheckingName(false);
	if(self.idxCurrItem == self.items.length){
	    self.idxCurrItem = 0;
	    self.fLoading(true);
	    self.gatherItems();
	} else {
	    var item = self.items[self.idxCurrItem];
	    self.oActualFriend = self.friendsMap[item.id]
	    self.sActualName(self.oActualFriend.name);
	    self.generateFriendOptions();
	    self.sMessage(item.message);
	    self.fQuestionShowing(true);
	}
    }

    self.generateFriendOptions = function(){
	self.friendOptions.removeAll();
	while(self.friendOptions().length < OPTIONS_LENGTH){
	    var friendObj = self.allFriends[parseInt(Math.random() * self.allFriends.length)];
	    for (var i=0; i<self.friendOptions().length;i++){
		if(self.friendOptions()[i].name === friendObj.name) continue;
	    }
	    friendObj['fCorrectNotSelected'] = ko.observable(false);
	    friendObj['fIncorrectSelected'] = ko.observable(false);
	    friendObj['fCorrectSelected'] = ko.observable(false);
	    if(friendObj.name != self.sActualName()){
		self.friendOptions().push(friendObj);
	    }
	}
	self.oActualFriend['fCorrectNotSelected'] = ko.observable(false);
	self.oActualFriend['fIncorrectSelected'] = ko.observable(false);
	self.oActualFriend['fCorrectSelected'] = ko.observable(false);
	self.friendOptions.push(self.oActualFriend);
	self.friendOptions.sort(function(left, right){ 
	    return left.name == right.name ? 0 : (left.name < right.name ? -1 : 1) 
	})
    }

    self.nextQuestion = function(){
	self.idxCurrItem++;
	self.ask(self.idxCurrItem);
    }

    self.checkName = function(data){
	var sInputName = data.name;
	self.fCheckingName(true);
	if(sInputName.toLowerCase() === self.sActualName().toLowerCase()){
	    self.oActualFriend['fCorrectSelected'](true);
	    self.nScore(self.nScore()+1);
	    self.fCorrect(true);
	}
	else{
	    data['fIncorrectSelected'](true);
	    self.oActualFriend['fCorrectNotSelected'](true);
	    self.nIncorrect(self.nIncorrect()+1);
	    self.fCorrect(false);
	    if(self.nIncorrect() >= NUM_CHANCES){
		self.fGameOver(true);
	    }
	}
	self.fQuestionShowing(false);
	self.fSeeNext(true);
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

$(window).ready(function(){
    FBModel = new FBKoModel();
    ko.applyBindings(FBModel, $('#binder')[0]);
});