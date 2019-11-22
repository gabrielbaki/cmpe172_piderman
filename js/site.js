var controller = window.controller || {};

(function scopeWrapper($) {

var pd = {
    UserPoolId: 'us-west-2_Po4gQJ1mM',
    ClientId: '7ddhm1k0o7pggieroteoa7lr2b'
};

    var userPool = new AmazonCognitoIdentity.CognitoUserPool(pd);

    var tok = null;



    var apiClient = apigClientFactory.newClient();

    
    
    var mostRecentCom = null;
    controller.validate = function (redirectOnRec, redirectOnUnrec) {
        var cognitoUser = userPool.getCurrentUser();
        if (cognitoUser === null) {
            if (redirectOnUnrec) {
                window.location = '/';
            }
        } else {
            if (redirectOnRec) {
                window.location = '/history.html';
            }
        }
    };
    

    controller.signin = function () {
        var username = $('#username').val();
        var authenticationData = {
            Username: username,
            Password: $('#password').val()
        };

        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
        var userData = {
            Username: username,
            Pool: userPool
        };
        var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function () {
                window.location = '/history.html';
            },
            onFailure: function (err) {
                alert(err);
            }
        });
    };

    controller.signout = function () {
        var cognitoUser = userPool.getCurrentUser();
        cognitoUser.signOut();
        window.location = '/';
    };

    controller.getHistory = function () {
        controller.validationTok(function (tok) {
            apiClient.comsGet({}, null, {headers: {Authorization: tok}})
            .then(function (result) {
                 var currentUsername = userPool.getCurrentUser().getUsername();
                
                var arr = result.data;
                for (var i = 0, len = arr.length; i < len; i++) {
                    var otherUsers = [];
                    arr[i].usersInCom.forEach(function (user) {
                            otherUsers.push(user);
                    });

                    var last = '&nbsp;';
                    if (arr[i].last) {
                        last = moment(new Date(arr[i].last)).fromNow();
                    }

                    $('TBODY').append('<tr><td><a href="communication.html#' + arr[i].id + '">' + otherUsers.join(', ') + '</a></td><td>' + last + '</td></tr>');
                    
                }
                $('TBODY').append('<tr><td></td><td></td></tr>');
            });
        });
    };

    controller.getDiscussion = function () {
        var currentUsername = userPool.getCurrentUser().getUsername();
        controller.validationTok(function (tok) {
            apiClient.comsIdGet({id: location.hash.substring(1)}, null, {headers: {Authorization: tok}})
                .then(function (incom) {
                    var lastRendered = mostRecentCom === null ? 0 : mostRecentCom;
                    if((mostRecentCom === null && incom.data.last) || mostRecentCom < incom.data.last) {
                        mostRecentCom = incom.data.last;
                    } else {
                        return;
                    }
                
               var arr = incom.data.messages;
               for (var i = 0, len = arr.length; i < len; i++) {
                        if(arr[i].postTime > lastRendered) {
                            var panel = $('<div class="panel">');
                            if (arr[i].pusher !== currentUsername) {
                                panel.addClass('panel-info');
                                panel.append('<div class="panel-heading">' + arr[i].pusher + '</div>');
                            } else {
                                panel.addClass('panel-default');
                            }
                            var body = $('<div class="panel-body">').text(arr[i].message);
                            panel.append(body);
                            panel.append('<div class="panel-footer messageTime" data-time="' + arr[i].postTime + '">' + moment(arr[i].postTime).fromNow() + '</div>');

                            var row = $('<div class="row">');
                            var buffer = $('<div class="col-xs-4">');
                            var holder = $('<div class="col-xs-8">');
                            holder.append(panel);

                            if (arr[i].pusher !== currentUsername) {
                                row.append(holder);
                                row.append(buffer);
                            } else {
                                row.append(buffer);
                                row.append(holder);
                            }

                            $('#chat').append(row);
                        }
             
}
                    
                    window.scrollTo(0, document.body.scrollHeight);
                });
        });
    };

    controller.submit = function () {
        controller.validationTok(function(tok) {
            apiClient.comsIdPost({id: location.hash.substring(1)}, $('#message').val(), {headers: {Authorization: tok}})
                .then(function () {
                    $('#message').val('').focus();
                    controller.getDiscussion();
                });
        });
    };

    controller.getUsers = function () {
        controller.validationTok(function (tok) {
            apiClient.cognitousersGet({}, null, {headers: {Authorization: tok}})
                .then(function (result) {
                    result.data.forEach(function (name) {
                        var button = $('<button class="btn btn-secondary">Message</button>');
                        button.on('click', function() {
                            controller.newDiscussion(name);
                        });

                        var row = $('<tr>');
                        row.append('<td>' + name + '</td>');
                        var cell = $('<td>');
                        cell.append(button);
                        row.append(cell);
                        $('TBODY').append(row);
                    });
                    $('TBODY').append('<tr><td></td><td></td></tr>');
                });
        });
    };

    controller.newDiscussion = function (name) {
        apiClient.comsPost({}, [name], {headers: {Authorization: tok}})
            .then(function (result) {
                window.location = '/communication.html#' + result.data;
            });
    };

    controller.registerNewAccount = function () {
        var username = $('#username').val();
        var password = $('#password').val();
        var email = new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'email',
            Value: $('#email').val()
        });

        userPool.signUp(username, password, [email], null, function (err, result) {
            if (err) {
                alert(err);
            } else {
                window.location = '/verify.html#' + username;
            }
        });
    };

    controller.verify = function () {
        var username = location.hash.substring(1);
        var cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: username,
            Pool: userPool
        });
        cognitoUser.confirmRegistration($('#code').val(), true, function (err, results) {
            if (!err) {
                window.location = '/';
            } else {
                alert(err);
            }
        });
    };

    controller.resendCode = function () {
        var username = location.hash.substring(1);
        var cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: username,
            Pool: userPool
        });
        cognitoUser.resendConfirmationCode(function (err) {
            if (err) {
                alert(err);
            }
        })
    };

    controller.validationTok = function (callback) {
        if (tok === null) {
            var cognitoUser = userPool.getCurrentUser();
            if (cognitoUser !== null) {
                cognitoUser.getSession(function (err, session) {
                    if (err) {
                        window.location = '/';
                    }
                    tok = session.getIdToken().getJwtToken();
                    callback(tok);
                });
            }
        } else {
            callback(tok);
        }
    };

}(jQuery));