var OPTIONS_LENGTH = 6;
var NUM_QUESTIONS = 10;
var NUM_CHANCES = 1;
var FBModel;
var LeaderModel;
var APP_ID = 543510825740884

window.fbAsyncInit = function() {
    // init the FB JS SDK
    FB.init({
	appId      : ''+APP_ID,                    // App ID from the app dashboard
	status     : true,                                 // Check Facebook Login status
	xfbml      : true                                  // Look for social plugins on the page
    });

    FBModel.checkIfLoggedIn(LeaderModel.initialize);
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
var FQL_PICS_SCORE = "SELECT id, url FROM profile_pic WHERE width = 200 AND height = 200 AND id=";

var FQL_STATUS1 = "SELECT uid,message FROM status WHERE uid = ";
var FQL_STATUS2 = " LIMIT 10";

var LeaderBoardKoModel = function(){
    var self = this;
    self.leaders = ko.observableArray();
    self.fLoading = ko.observable(true);
    self.users = {};
    self.initialize = function(){
	console.log('print');
	//var query_params = {query0: FQL_FRIENDS, query1: FQL_SCORES, query2: FQL_PICS_SCORE};
	FB.api("/"+APP_ID+"/scores", function(response){
	    var users = response.data;
	    users.sort(function(a,b){
		return b.score - a.score;
	    });
	    var numToShow = Math.min(users.length, 10);
	    var query_params = {};
	    for(var i=0;i<numToShow;i++){
		debugger;
		var user = users[i].user;
		var id = user.id;
		query_params["query"+i]=FQL_PICS_SCORE+id;
		var friend_obj = {'name' : user.name, 'score' : users[i].score};
		self.users[id] = friend_obj;
	    }
	    FB.api({method: 'fql.multiquery', queries: query_params}, function(friends) {
		_.each(friends,function(r){
		    var friend  = r.fql_result_set[0];
		    var friend_obj = self.users[friend.id];
		    friend_obj['pic_square'] = friend.url;
		    self.leaders.push(friend_obj);
		});
		self.fLoading(false);
	    });
	});
    };
    self.returnToGame = function(){
	window.location.href='/';
    }
};


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
    self.fHighScoreChanged = ko.observable(false);

    self.sMessage = ko.observable();
    self.oActualFriend;
    self.sActualName = ko.observable();
    self.nScore = ko.observable(0);
    self.nHighScore = ko.observable(0);
    self.fHighScoreInitialized = ko.observable(false);
    self.nIncorrect = ko.observable(0);
    self.items = [];
    self.idxCurrItem=0;
    self.allFriends = [];
    self.friendOptions = ko.observableArray();
    self.friendsMap = {};
    self.numQuestions = ko.observable(NUM_QUESTIONS);

    self.checkIfLoggedIn = function(callback){
	var default_func = function(response) {
	    self.fCheckedIfLoggedIn(true);
	    self.fLoggedIn(response.status === 'connected');
	};
	var cback = callback ? callback : default_func;
	FB.getLoginStatus(cback);
    };

    self.normalLogin = function(response) {
	if (response.authResponse) {
	    self.fLoggedIn(true);
	} else {
	    console.log('User cancelled login or did not fully authorize.');
	}
    };

    self.FBLogin = function(publish){
	var params = publish ? {scope: 'read_stream,publish_actions'} : {scope: 'read_stream'};
	var callBack = publish ? self.sendPost : self.normalLogin;
	FB.login(callBack, params);
    };

    self.getHighScore = function(){
	FB.api("/me/scores",function (response) {
	    if (response && !response.error) {
		self.fHighScoreInitialized(true);
		if(response.data.length){
		    self.nHighScore(response.data[0].score);
		}
		else{
		    self.nHighScore(0);
		}
		self.initItemsAndFriends();
	    }
	}
	      );
    };

    self.startGame = function(){
	self.idxCurrItem = 0;
	self.nIncorrect(0);
	self.nScore(0);
	self.fHighScoreChanged(false);
	self.fScorePosted(false);
	self.fGameOver(false);
	self.fSeeNext(false);
	self.fLoading(true);
	if(!self.fHighScoreInitialized()){
	    self.getHighScore();
	} else {
	    self.initItemsAndFriends();
	}
    };

    self.initItemsAndFriends = function(){
	if(self.allFriends.length){
	    self.gatherItems();
	} else {
	    self.collectFriends();	
	}
    };

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
    };

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
	    // All the underscore.js
	    var non_empty_responses = _.filter(response, function(r){
		return r.fql_result_set.length;
	    });
	    var random_entries = _.map(non_empty_responses, function(r){
		var result_set = r.fql_result_set;
		var randomIndex = parseInt(Math.random() * result_set.length);
		return result_set[randomIndex]; 
	    });
	    var good_messages = _.filter(random_entries, function(r){
		return r.message;
	    });
	    for (var i=0; i<good_messages.length; i++){
		var message_obj = {};
		message_obj['id'] = good_messages[i].uid;
		message_obj['message'] = good_messages[i].message;
		self.items[i] = message_obj;
	    }
	    self.askFirstQuestion();
	});
    };

    self.askFirstQuestion = function(){
	self.fLoading(false);
	self.fInit(true);
	self.ask(self.idxCurrItem);
    };

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
    };

    self.generateFriendOptions = function(){
	self.friendOptions.removeAll();
	self.oActualFriend['fCorrectNotSelected'] = ko.observable(false);
	self.oActualFriend['fIncorrectSelected'] = ko.observable(false);
	self.oActualFriend['fCorrectSelected'] = ko.observable(false);
	self.friendOptions.push(self.oActualFriend);
	while(self.friendOptions().length < OPTIONS_LENGTH){
	    var friendObj = self.allFriends[parseInt(Math.random() * self.allFriends.length)];
	    var fTaken = false;
	    for (var i=0; i<self.friendOptions().length;i++){
		if(self.friendOptions()[i].name === friendObj.name){
		    fTaken = true;
		    continue;
		}
	    }
	    if(fTaken) continue;
	    friendObj['fCorrectNotSelected'] = ko.observable(false);
	    friendObj['fIncorrectSelected'] = ko.observable(false);
	    friendObj['fCorrectSelected'] = ko.observable(false);
	    self.friendOptions().push(friendObj);
	}
	self.friendOptions.sort(function(left, right){ 
	    return left.name == right.name ? 0 : (left.name < right.name ? -1 : 1) 
	})
    };

    self.nextQuestion = function(){
	self.idxCurrItem++;
	self.ask(self.idxCurrItem);
    };

    self.checkName = function(data){
	var sInputName = data.name;
	if(self.fCheckingName()) return;
	self.fCheckingName(true);
	if(sInputName.toLowerCase() === self.sActualName().toLowerCase()){
	    self.oActualFriend['fCorrectSelected'](true);
	    self.nScore(self.nScore()+1);
	    self.fCorrect(true);
	    if(self.nScore()>self.nHighScore()){
		self.fHighScoreChanged(true);
		self.nHighScore(self.nScore());
	    }
	} else {
	    data['fIncorrectSelected'](true);
	    self.oActualFriend['fCorrectNotSelected'](true);
	    self.nIncorrect(self.nIncorrect()+1);
	    self.fCorrect(false);
	    if(self.nIncorrect() >= NUM_CHANCES){
		self.fGameOver(true);
		if(self.fHighScoreChanged()){
		    FB.api("/me/scores","POST",{"score": self.nScore()}, function(response){
			console.log(response);
		    });
		}
	    }
	}
	self.fQuestionShowing(false);
	self.fSeeNext(true);
    };

    // When the user presses the button to see the next question
    self.seeNext = function(){
	self.fSeeNext(false);
	self.nextQuestion();
    };

    self.postScore = function(){
	// Function will make a call 
	self.FBLogin(true);
    };

    self.sendPost = function(){
	var postMessage = 'I scored a '+self.nScore()+' on Says Who! Give it a try too!';
	console.log(document.URL+'images/lane.png');
	var obj = {
	    method: 'feed',
	    link: document.URL,
	    picture: document.URL+'images/lane.png',
	    name: 'Says Who',
	    caption: 'Who well do you know your friends?',
	    description: postMessage
	};
	FB.ui(obj, function(r){console.log(r);});
    };

    self.leaderBoard = function(){
	self.showDialog('#dialog');
    };

    self.showDialog = function(id){
	$(id).dialog({
	    modal: true
	}).dialog('open');
    };

};

$(window).ready(function(){
    FBModel = new FBKoModel();
    LeaderModel = new LeaderBoardKoModel();
    ko.applyBindings(FBModel, $('#binder')[0]);
    ko.applyBindings(LeaderModel, $('#leaderBinder')[0]);
});