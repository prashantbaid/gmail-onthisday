//TODO:Find a better way to share vars
//sharable global variables
var gmails = {};
var gmailsToday = {};
var finishedLoading = false;
var isLoading = false;
var isGmailsTodaySet = false;

//global variables
let labelObj = {};
let countdown = 0;
let thisMonthDay = '';
let emailCount = 0;


function beginWorld() {
    setBadgeNoAuth();
    getAuthTokenSilent();
}


//Most important function in the file.
function getAuthToken(options) {
    chrome.identity.getAuthToken({ 'interactive': options.interactive }, options.callback);
}


//Identity API Call Functions. Love the interactive:false option.
function getAuthTokenSilent() {
    getAuthToken({
        'interactive': false,
        'callback': getAuthTokenSilentCallback,
    });
}

function getAuthTokenSilentCallback(token) {
    if (chrome.runtime.lastError) {
        showAuthNotification();
    } else {
        getLabels(token);
        getProfile(token);
    }
}

function getAuthTokenInteractive() {
    getAuthToken({
        'interactive': true,
        'callback': getAuthTokenInteractiveCallback,
    });
}

function getAuthTokenInteractiveCallback(token) {
    if (chrome.runtime.lastError) {
        showAuthNotification();
    } else {
        getLabels(token);
        getProfile(token);
        isLoading = true;
    }
}




//TODO: Use jQuery?
function get(options) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            options.callback(JSON.parse(xhr.responseText), options);
        } else {
        }
    };
    xhr.open("GET", options.url, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + options.token);
    xhr.send();
}





//Google API Call Functions and their callbacks.


//Get Labels
function getLabels(token) {
    get({
        'url': 'https://www.googleapis.com/gmail/v1/users/me/labels',
        'callback': getLabelsCallback,
        'token': token
    });
}
function getLabelsCallback(data, options) {
    for (let index in data.labels) {
        labelObj[data.labels[index].name] = {};
    }
    getEmailCountByYear(options.token);
}



//Get Profile
function getProfile(token) {
    get({
        'url': 'https://www.googleapis.com/plus/v1/people/me',
        'callback': getProfileCallback,
        'token': token,
    });
}
function getProfileCallback(person) {
    var options = {
        'displayName': person.displayName,
        'imageUrl': person.image.url + '0',
    };
    gmails.displayName = person.displayName;
    showProfileNotification(options);
}


//Call /messages in a loop by keep decrementing a year from current year until there are no more messages to get.
//Since there is no way to get oldest email from any gmail api, this had to be done.
//TODO: Find a better way to find the oldest email. 
//Still proud of this hack.
function getEmailCountByYear(token, date) {
    thisMonthDay = thisMonthDay || getDate(new Date());
    let lastYear = (new Date()).getFullYear() - countdown++;
    date = lastYear + '/' + thisMonthDay;

    get({
        'url': 'https://www.googleapis.com/gmail/v1/users/me/messages?q=older:' + date,
        'callback': emailCountCallback,
        'token': token,
        'year': lastYear
    });

}

//TODO: Find a non ugly way of doing what I am doing here.
function emailCountCallback(response, options) {
    if (response.resultSizeEstimate == 0) {
        gmails.duration = parseInt((new Date()).getFullYear()) - parseInt(options.year) - 1;
        //NOTE: this does not mean there are no active calls.
        //TODO: Revisit the logic to ensure there are no active AJAX calls.
        finishedLoading = true;
        isLoading = false;
        //Ugh, this is really ugly
        if (thisMonthDay === getDate(new Date())) {
            setBadgeCount(emailCount);
            gmailsToday = JSON.parse(JSON.stringify(gmails));
            isGmailsTodaySet = true;
            chrome.extension.sendMessage({ thisDay: finishedLoading });
        } else {
            chrome.extension.sendMessage({ thatDay: finishedLoading });
        }
        console.log('World Created');
        //..And there was light.
    }
    else {
        initilizeYearArr(options.year);
        getMessageList(options.token, options.year);

    }
}



//Get list of Message Ids
function getMessageList(token, year) {
    let currentYear = (new Date()).getFullYear();
    let after = year + '/' + thisMonthDay || getDate(new Date());
    let before = year + '/' + getDate((new Date(new Date(after).getTime())).setDate(new Date(after).getDate() + 1));
    get({
        'url': 'https://www.googleapis.com/gmail/v1/users/me/messages?q=after:' + after + ' before:' + before + '',
        'callback': getMessageListCallback,
        'token': token,
        'year': year
    });
}

function getMessageListCallback(response, options) {
    for (let i in response.messages) {
        getMessage(response.messages[i].id, options);
    }
    getEmailCountByYear(options.token);
}

//Get Message Object
function getMessage(mid, options) {
    emailCount++;
    get({
        'url': 'https://www.googleapis.com/gmail/v1/users/me/messages/' + mid,
        'callback': getMessageCallback,
        'token': options.token,
        'year': options.year
    });
}

function getMessageCallback(data, options) {
    beautifyEmails(data, options.year)
}


//Real Shit Happens Here!!
//Proud of dynamic handling of labels and the structure of final email object.
function beautifyEmails(email, year) {
    //TODO: Sort out variable naming.
    let json = email;
    let final = {
        id: json.id,
        labels: json.labelIds,
        snippet: json.snippet,
        mimeType: json.payload && json.payload.mimeType
    }
    let parts = json.payload && json.payload.parts || [];
    let headers = json.payload && json.payload.headers;
    if (headers) {
        for (let i in headers) {
            switch (headers[i].name) {
                case 'Subject': final.subject = headers[i].value; break;
                case 'From': final.from = headers[i].value; break;
                case 'To': final.to = headers[i].value; break;
                case 'Date': final.date = headers[i].value; break;
            }

        }
    }
    //traverse all parts to get all of the payload. Thanks StackOverflow!
    while (parts.length) {
        var part = parts.shift();
        if (part.parts) {
            parts = parts.concat(part.parts);
        }

        if (part.mimeType === 'text/html') {
            final.body = part.body && part.body.data && decodeURIComponent(escape(atob(part.body.data.replace(/\-/g, '+').replace(/\_/g, '/'))));
        }
    }

    if (final.mimeType === 'text/html' || final.mimeType === 'text/plain') {
        final.body = json.payload.body && json.payload.body.data && decodeURIComponent(escape(atob(json.payload.body.data.replace(/\-/g, '+').replace(/\_/g, '/'))));
    }

    if (final.labels.includes('CHAT')) {
        final.body = json.payload.body && json.payload.body && decodeURIComponent(escape(atob(json.payload.body.data.replace(/\-/g, '+').replace(/\_/g, '/'))));;
        final.subject = json.snippet;
    }

    //TODO: Show a friendlier message.
    if (!final.body) {
        final.body = '<samp>This message could not be read (possibly because it contains an attachment). Please click on "Open in Gmail" button at the top to open this email.</samp>';
    }

    let labels = json.labelIds;
    for (let label in labelObj) {
        if (labels.includes(label)) {
            labelObj[label][year].push(final);

        }
    }

    gmails.emailObj = labelObj;

}



//Initializations and Reinitializations.
function initilizeYearArr(year) {
    for (let label in labelObj) {
        labelObj[label][year] = [];
    }
}

function reinitializer(options) {
    thisMonthDay = options.thisMonthDay;
    countdown = 0;
    finishedLoading = false;
    emailCount = 0;
    getAuthTokenSilent();
}



//Will I ever be good at dates? (no pun)
function getDate(time) {
    const currentTime = new Date(time);
    const month = currentTime.getMonth() + 1;
    const day = currentTime.getDate();
    return month + "/" + day
}




//Show Notification Functions
//TODO: This will ask for additional notification permission. Do I really want to annoy users?
function createBasicNotification(options) {
    var notificationOptions = {
        'type': 'basic',
        'iconUrl': options.iconUrl,
        'title': options.title,
        'message': options.message,
        'isClickable': true,
    };
    chrome.notifications.create(options.id, notificationOptions, function (notificationId) { });
}

function showAuthNotification() {
    var options = {
        'id': 'start-auth',
        'iconUrl': 'img/logog.png',
        'title': 'On This Day, That Year | Gmail',
        'message': 'Click here to authorize access to Gmail',
    };
    createBasicNotification(options);
}

function showProfileNotification(profile) {
    var options = {
        'id': 'show-profile',
        'iconUrl': profile.imageUrl,
        'title': 'Welcome ' + profile.displayName,
        'message': 'On This Day, That Year | Gmail is now active',
    };
    createBasicNotification(options);
}

function clearNotification(notificationId) {
    chrome.notifications.clear(notificationId, function (wasCleared) { });
}




//Show Badge Functions
//TODO: Decide if badge is really needed in this extension? 
function setBadgeNoAuth() {
    setBadge({
        'text': '?',
        'color': '#9E9E9E',
        'title': 'Click to authorize Gmail',
    });
}

function setBadge(options) {
    chrome.browserAction.setBadgeText({ 'text': options.text });
    chrome.browserAction.setBadgeBackgroundColor({ 'color': options.color });
    chrome.browserAction.setTitle({ 'title': options.title });
}

function setBadgeCount(count) {
    var color = '#9E9E9E';
    var title = 'No Mails On This Day';
    if (count > 0) {
        color = '#666';
        title = count + ' Mails On This Day';
    }
    setBadge({
        'text': count + '', // Cast count int to string.
        'color': color,
        'title': title,
    });
}




//Listener Functions
function onAlarm(alarm) {
    if (alarm.name === 'update-mails') {
        let options = {
            thisMonthDay: ''
        }
        gmailsToday = {};
        isGmailsTodaySet = false;
        reinitializer(options);
    }
}

function onMessage(request, sender, sendResponse) {
    if (request.msg === 'reboot') {
        let options = {
            thisMonthDay: request.thisMonthDay
        }
        reinitializer(options);
    }
}

function notificationClicked(notificationId) {
    // User clicked on notification to start auth flow.
    if (notificationId === 'start-auth') {
        getAuthTokenInteractive();
    }
    clearNotification(notificationId);
}



//Register Listeners
chrome.extension.onMessage.addListener(onMessage);
chrome.notifications.onClicked.addListener(notificationClicked);
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.alarms.create('update-mails', { 'when': (new Date()).setHours(24, 0, 0, 0), 'periodInMinutes': 1440 });



//"LET THERE BE LIGHT!" 
beginWorld();
