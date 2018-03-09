
let gmailObject;
let gmails;
let newDate;


//TODO: Find a non ugly way of doing this.
function initializeWorld() {
    //obtain emails from the background page
    gmailObject = chrome.extension.getBackgroundPage().gmailsToday;

    //this is to handle all edge cases
    //TODO: Find a better way to do this
    let isLoading = chrome.extension.getBackgroundPage().isLoading;
    let finishedLoading = chrome.extension.getBackgroundPage().finishedLoading;
    let isGmailsTodaySet = chrome.extension.getBackgroundPage().isGmailsTodaySet;

    if (finishedLoading) {
        gmails = gmailObject.emailObj;
        createWorld();
        return 0;
    }
    if (!isLoading && !finishedLoading && !isGmailsTodaySet) {
        let options = {
            thisMonthDay: ''
        }
        chrome.extension.getBackgroundPage().reinitializer(options);
        return 0;
    }
    $('#emailContainer').hide();
    $('#preloader').show();
}

//Hello World
function createWorld() {
    $('#preloader').hide();
    $('#emailContainer').show();
    sanitizeEmailObj();
    setupInbox();
    setupNavBar();
    triviaMessage();
    //..And there was light
}


//Email Object Hygiene Check
function sanitizeEmailObj() {
    for (let label in gmails) {
        let yearObj = gmails[label];
        for (let year in yearObj) {
            if (yearObj[year].length == 0) {
                delete yearObj[year];
            }
        }
        if (Object.keys(yearObj).length == 0) {
            delete gmails[label];
        }
    }
}

//Home Page Emails.
//TODO: Decide which category to show?
function setupInbox() {
    $('#messages').html(listEmails('INBOX'));
}

//Show Categories
//TODO: Sort them by importance?
function setupNavBar() {
    let = html = ''
    html += '<a class="navLabel" id="INBOX" href="#">Inbox ' + '(' + getEmailCount('INBOX') + ')</a><hr>';
    $('#navBar').html(html);
    for (let label in gmails) {
        let formattedLabel = formatLabel(label);
        formattedLabel === 'Inbox' ? undefined : formattedLabel;
        if (formattedLabel) {
            html += '<a class="navLabel" id="' + label + '" href="#">' + formatLabel(label) + ' (' + getEmailCount(label) + ')</a><hr>';
        }
    }
    $('#navBar').html(html);
}




//Email Listing Functions
//TODO: Write one instead of two functions
function listImportantMails(label) {
    const date = formatDate();
    let html = '';
    html += '<div id = "listHead"><input class="form-check-input" type="checkbox" value="' + label + '" id="importantCheck" checked><label id ="impText"><small>Show Important Only</small></label><span id="labelName">Category: <strong><mark><span class="badges">' + formatLabel(label) + '</span></mark></strong></span></div>';

    for (let year in gmails[label]) {
        const emailObj = gmails[label][year];
        let impEmails = [];
        for (let i in emailObj) {
            if (emailObj[i].labels.includes('IMPORTANT')) {
                impEmails.push(emailObj[i]);
            }
        }
        if (impEmails.length > 0) {
            html += '<br><p class="text-center h4"><strong><span class="badge">' + date + ' ' + year + '</span></strong></p><table class="table table-hover table-striped table-sm" id="emailList"><tbody>';
        }
        for (let i in impEmails) {
            html += '<tr id="' + impEmails[i].id + ' ' + year + ' ' + label + '"><td id="from">' + fromFormatter(impEmails[i].from)[0] + '</td><td id="subject">' + impEmails[i].subject + '</td></tr>';
        }
        html += '</tbody></table>';
    }


    return html;
}

function listEmails(label) {
    const date = formatDate();
    let html = '';
    html += '<div id = "listHead"><input class="form-check-input" type="checkbox" value="' + label + '" id="importantCheck"  ><label id ="impText"><small>Show Important Only</small></label><span id="labelName">Category: <strong><mark><span class="badges">' + formatLabel(label) + '</span></mark></strong></span></div>';
    for (let year in gmails[label]) {
        let emailObj = gmails[label][year];
        html += '<br><p class="text-center h4"><strong><span class="badge">' + date + ' ' + year + '</span></strong></p><table class="table table-hover table-striped table-sm" id="emailList"><tbody>';
        for (let i in emailObj) {
            html += '<tr id="' + emailObj[i].id + ' ' + year + ' ' + label + '"><td id="from">' + fromFormatter(emailObj[i].from)[0] + '</td><td id="subject">' + emailObj[i].subject + '</td></tr>';
        }
        html += '</tbody></table>';
    }
    return html;
}





//Show the email.
//TODO: Find a way to deal with attachments.
function showEmail(emailObj) {
    let html = '';
    const from = fromFormatter(emailObj.from).join(' ');
    const subject = emailObj.subject || '';
    const date = emailObj.date || '';
    const to = emailObj.to || '';
    const body = emailObj.body.trim() === '<div dir="ltr"><br></div>' ? '<samp>This message could not be read (possibly because it contains an attachment). Please click on "Open in Gmail" button at the top to open this email in Gmail.</samp>' : emailObj.body;
    html += '<div id="backDiv"><a class="btn btn-primary" role="button" id="backButton">Back</a><a class="btn btn-danger" role="button" id="gmailButton" href="https://mail.google.com/mail/u/0/#inbox/' + emailObj.id + '" target="_blank">Open In Gmail</a></div><table class="table table-bordered" id="emailView"><tbody><tr><th id="emailLabel">From</th><td>' + from + '</td></tr><tr><th id="emailLabel">To</th><td id="emailTo"><div style="overflow:auto; max-height:100px;">' + to + '</div></td></tr><tr><th id="emailLabel">Date</th><td>' + date + '</td></tr><tr><th id="emailLabel">Subject</th><td>' + subject + '</td></tr><tr><td colspan="2" id="emailBody">' + body + '</td></tbody></table>';

    $('#mailbox').hide();
    $('#message').html(html);
    $('#message').show();
}

function goBack() {
    $('#message').empty();
    $('#message').hide();
    $('#mailbox').show();
}





//TODO: Do I really want to show this information?
function triviaMessage() {
    const gname = gmailObject.displayName || '';
    const duration = gmailObject.duration > 0 ? gmailObject.duration : 0;
    const sentEmails = getEmailCount('SENT');
    const receivedEmails = getEmailCount('INBOX');
    let html = '';
    html = '<div id = "infoText">' + gname.split(' ')[0] + ', on <span id="sentCount">' + formatDate() + '</span> you received <span id="sentCount">' + receivedEmails;
    html += ' </span>' + checkGrammar(receivedEmails) + ' and sent <span id="sentCount">' + sentEmails + '</span> ' + checkGrammar(sentEmails) + ' in the last  <span id="sentCount">' + duration + ' years</span>.</div>';
    let yearObj = gmails['INBOX'];
    let currentYear = parseInt((new Date()).getFullYear());
    let recFullArr = [];
    let sentFullArr = [];
    for (let i = (currentYear - gmailObject.duration); i <= (currentYear); i++) {
        let recCount = getCountByYear(i, 'INBOX');
        let sentCount = getCountByYear(i, 'SENT');
        if (recCount > 0) {
            let recArr = [i.toString(), recCount];
            recFullArr.push(recArr);
        }
        if (sentCount > 0) {
            let sentArr = [i.toString(), getCountByYear(i, 'SENT')];
            sentFullArr.push(sentArr);
        }
    }
    $('#home').html(html);
}






//Grammar Nazi Functions
function checkGrammar(count) {
    return count != 1 ? 'emails' : 'email';
}

function cap(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function formatLabel(label) {
    switch (label) {
        case 'CATEGORY_PERSONAL': return 'Personal';
        case 'CATEGORY_FORUMS': return 'Forums';
        case 'CATEGORY_SOCIAL': return 'Social';
        case 'CATEGORY_UPDATES': return 'Updates';
        case 'CATEGORY_PROMOTIONS': return 'Promotions';
        case 'INBOX': return 'Inbox';
        case 'IMPORTANT': return undefined;
        case 'UNREAD': return undefined;
        default: return cap(label);
    }
}

function fromFormatter(from) {
    from = from || '';
    from = from.replace('<', '(');
    from = from.replace('>', ')');
    return from.split(' ');
}

function formatDate() {
    const date = new Date();
    const monthNames = [
        "January", "February", "March",
        "April", "May", "June", "July",
        "August", "September", "October",
        "November", "December"
    ];
    if (newDate) {
        let setDate = newDate.split('/');
        return setDate[1] + ' ' + monthNames[setDate[0] - 1];
    }
    const day = date.getDate();
    const monthIndex = date.getMonth();

    return day + ' ' + monthNames[monthIndex];
}




//Good at Math Functions
function getCountByYear(year, label) {
    year = year.toString();
    if (gmails[label] && gmails[label][year]) {
        return gmails[label][year].length;
    }
    else {
        return 0;
    }
}

function getEmailCount(label) {
    let yearObj = gmails[label];
    let count = 0;
    for (year in yearObj) {
        count += yearObj[year].length;
    }
    return count;
}



//Stuff happens here
$(document).ready(function () {

    //NOTE: If something unexpected breaks, the page is going to load forever.
    //TODO: Do more error handling.
    $('#emailContainer').hide();
    $('#preloader').show();

    //Check if User has authorised me. 
    //TODO: Check how to fix the weird 401 unauthorized issue with Gmail API
    chrome.identity.getAuthToken({ 'interactive': false }, function (token) {
        if (chrome.runtime.lastError) {
            $('#emailContainer').hide();
            $('#preloader').hide();
            $('#authMessage').show();
        } else {
            initializeWorld();
        }
    });


    //NOTE: This is a horrible way of doing what you are doing.
    //TODO: Use better variable names in this function.
    chrome.extension.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.thatDay) {
                //Gmails On That Day
                gmailObject = chrome.extension.getBackgroundPage().gmails;
                gmails = gmailObject.emailObj;
            }
            else if (request.thisDay) {
                //Gmails Today
                gmailObject = chrome.extension.getBackgroundPage().gmailsToday;
                gmails = gmailObject.emailObj;
            }
            //"LET THERE BE LIGHT! AGAINN!!" 
            createWorld();
        }
    );

    //Event Capturers. 
    //TODO: Insert jQuery appreciation comment here
    $("body").on("click", "tr", function () {
        const id = this.id.split(' ');
        const year = id[1];
        const mid = id[0];
        const label = id[2];
        const emailObj = gmails[label][year];
        for (let i in emailObj) {
            if (emailObj[i].id === mid) {
                showEmail(emailObj[i])
            }
        }

        //0_0
        window.scroll(0, 0);
    });

    $("body").on("click", "a#backButton", function () {
        $('#message').empty();
        $('#message').hide();
        $('#mailbox').show();
    });

    $("body").on("click", "a#viewEmailsButton", function () {
        $('#message').empty();
        $('#home').hide();
        $('#emailContainer').show();
    });

    $("body").on("click", "a#setNewDate", function () {
        const month = $('#month').val();
        const day = $('#day').val();
        if (day && month) {
            const date = month + '/' + day;
            newDate = date;
            chrome.extension.sendMessage({ msg: "reboot", thisMonthDay: date });
            $('#emailContainer').hide();
            $('#preloader').show();
        }

    });

    $("body").on("click", "a#anotherDay", function () {
        if ($('#dateSelector').is(":visible")) {
            $('#dateSelector').hide();
        }
        else {
            $('#dateSelector').show();
        }
    });

    $("body").on("click", "a.navLabel", function () {
        $('#messages').empty();
        $('#messages').html(listEmails(this.id));
    });

    $("body").on("click", "a#authorizeGmail", function () {
        chrome.extension.getBackgroundPage().getAuthTokenInteractive();
    });

    $("body").on("click", "input#importantCheck", function () {
        if ($(this).is(":checked")) {
            $('#messages').empty();
            $('#messages').html(listImportantMails($(this).val()));
        }
        else {
            $('#messages').empty();
            $('#messages').html(listEmails($(this).val()));
        }
    });

    $('#importantCheck').change(function () {
        if ($(this).is(":checked")) {
            $('#messages').empty();
            $('#messages').html(listImportantMails($(this).val()));
        }
        else {
            $('#messages').empty();
            $('#messages').html(listEmails($(this).val()));
        }
    });

});

