'use strict';
var Alexa = require('alexa-sdk');
var FB = require('facebook-node');
var util = require('util');

// Messages used for Alexa to tell the user
var repeatWelcomeMessage = "You can tell me to post 'something' or say 'read my feed'.";

var welcomeMessage = "Welcome to the Unofficial post to facebook skill, " + repeatWelcomeMessage;

var stopSkillMessage = "goodbye, see you next time!";

var helpText = "You can say things like read my feed, get top two posts from my feed, or post 'It's a beautiful day'. What would you like to do?";

var tryLaterText = "Please check if you have a connection to Facebook.com and if you have integrated a Facebook account with permission to post with this skill."

var noAccessToken = "There was a problem connecting to facebook, " + tryLaterText;

var accessToken = "";

var states = {
    COMMANDMODE: '_COMMANDMODE', // User is posting or reading feed
    CHATMODE: '_CHATMODE'  // Unimplemented: User is chatting with someone through FB messenger
};


var newSessionHandlers = {
    'NewSession': function() {
        
        this.handler.state = states.COMMANDMODE;
        
        // Access token is pass through from the session information
        accessToken = this.event.session.user.accessToken;
        
        // If we have an access token we can continue.
        if (accessToken) {
            FB.setAccessToken(accessToken);
            this.emit(':ask', welcomeMessage, repeatWelcomeMessage);
        }
        else {
            // If we dont have an access token, we close down the skill. 
            this.emit(':tell', noAccessToken, tryLaterText);
        }
    }
};


var commandHandlers = Alexa.CreateStateHandler(states.COMMANDMODE, {
    'NewSession': function () {this.emit('NewSession'); // Uses the handler in newSessionHandlers
    },

    // Read fb feed handler
    'readFeedIntent': function () {
        var alexa = this;

        // Again check if we have an access token
        if (accessToken) {
            // Call into FB module and get my feed
            FB.api("/me/feed", function (response) {
                if (response && !response.error) {
                    // If we have data
                    if (response.data) {
                        var output = "Here are your latest three posts ";
                        var max = 3;

                        // Take the top three posts and parse them to be read out by Alexa.
                        for (var i = 0; i < response.data.length; i++) {
                            if (i < max) {
                                output += "Post " + (i + 1) + " " + response.data[i].message + ". ";
                                //console.log("Date: " + (response.data[i].updated_time).toString());
                            }
                        }
                        alexa.emit(':ask', output+ ", What would you like to do next?",helpText);
                    } else {
                        // REPORT PROBLEM WITH PARSING DATA
                    }
                } else {
                    // Handle errors here.
                    console.log(response.error);
                }
            });
        } else {
            this.emit(':tell', noAccessToken, tryLaterText);
        }
    },
      // Write a post to Facebook feed handler.
    'writePostIntent': function () {

        var alexa = this;
        //console.log("The message:" + this);
        var msg = String(this.event.request.intent.slots.postText.value);

        // Check if we have access tokens.
        if (accessToken) {
            FB.api("/me/feed", "POST",
            {
                // Message to be posted
                "message": msg//"This is Alexa, please do something k thanks. Good luck!"
            }, function (response) {
                if (response && !response.error) {
                    // Alexa output for successful post
                    alexa.emit(':ask', "I posted ' "+ msg +" ' successfully. What would you like to do next?",helpText);
                } else {
                    console.log(response.error);
                    // Output for Alexa, when there is an error.
                    alexa.emit(':ask', "There was an error posting to your feed" + tryLaterText);
                }
            });
        }else{
            this.emit(':tell', noAccessToken, tryLaterText);
        }
    },
    'readNFeedIntent':function()
    {
        var alexa = this;
        //console.log("Breaks bfore max num call");
        console.log(JSON.stringify(this.event.request.intent));
        console.log("num = " + this.event.request.intent.slots.num.value);
        var maxNum = parseInt(this.event.request.intent.slots.num.value);
        if(accessToken){
        FB.api("/me/feed", function (response) {
                if (response && !response.error) {
                    // If we have data
                    if (response.data) {
                        var output = "Here are your " + maxNum.toString() + " latest posts, ";
                        // Take the top X posts and parse them to be read out by Alexa.
                        console.log(response.data);
                        for (var i = 0; i < response.data.length; i++) {
                            if (i < maxNum) {
                                output += "Post " + (i + 1) + " " + response.data[i].message + ". ";

                            }
                        }
                        alexa.emit(':ask', output + ". What would you like to do next?",helpText);
                    } else {
                        // REPORT PROBLEM WITH PARSING DATA
                    }
                } else {
                    // Handle errors here.
                    console.log(response.error);
                }
            });


    }else{
            this.emit(':tell', noAccessToken, tryLaterText);
        }
    },
    'goodbyeIntent': function()
    {
        this.emit(':tell', stopSkillMessage);
    },


    'AMAZON.CancelIntent': function () {
        // Triggered wheen user asks Alexa top cancel interaction
        this.emit(':tell', stopSkillMessage);
    },

    'AMAZON.StopIntent': function () {
        // Triggered when user asks Alexa to stop interaction
        this.emit(':tell', stopSkillMessage);
    },

    // Triggered wheen user asks Alexa for help
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', helpText, helpText);
    },

    // Triggered when no intent matches Alexa request
    'Unhandled': function () {
        this.emit(':ask', helpText, helpText);
    }
});


// Add handlers.
exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    
    alexa.registerHandlers(newSessionHandlers, commandHandlers);
    alexa.execute();
    //context.done();
};
