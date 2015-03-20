var Robot = function(socket) {
    this.id = Robot.id++;
    this.socket = socket;
    this.name = '';
    this.password = '';
    this.timeout = false;

    this.state = 'login';
    this.fotoLength;

    this.log('Robot connected.');

    this.addListeners();

    this.setConnectionTimeout();

    this.log('Waiting for name.');
    this.sendMessage('LOGIN');
};

Robot.id = 1;

Robot.MESSAGE = {
    'LOGIN':         '200 LOGIN',
    'PASSWORD':      '201 PASSWORD',
    'OK':            '202 OK',
    'BAD_CHECKSUM':  '300 BAD CHECKSUM',
    'LOGIN_FAILED':  '500 LOGIN FAILED',
    'SYNTAX_ERROR':  '501 SYNTAX ERROR',
    'TIMEOUT':       '502 TIMEOUT',
};

Robot.prototype.log = function(message) {
    var name = (this.name.length === 0)?'':' ' + this.name;
    console.log('[' + this.id + name + ']\t' + message);
};

Robot.prototype.sendMessage = function(type) {
    try {
        this.socket.write(Robot.MESSAGE[type] + '\r\n');
    } catch (e) {}
};

Robot.prototype.addListeners = function() {
    var that = this;

    this.socket.on('end', function() {
        that.log('Robot disconnected.');
        clearTimeout(that.timeout);
    });
    this.processData();
};

Robot.prototype.processData = function() {
    var that = this;
    var input = new Buffer(0, 'hex');
    var separator = {
        'login': [13, 10], // \r\n
        'password': [13, 10],
        'message': [32], // space
        'info': [13, 10],
        'fotoLength': [32]
    };

    this.socket.on('data', function(data) {
        input = Buffer.concat([input, new Buffer(data, 'hex')]);
        console.log('HEX: ' + input[0] + ' ' + input[1] + ' ' + input[2] + ' ' + input[3]);

        console.log(input.toString());

        if (that.state === 'foto') {
            // TODO
        } else {
            while (true) {
                var len = input.length - separator[that.state].length + 1;
                var sepI = 0;
                var match = false;
                for (var i = 0; i < len; i++) {
                    if (input[i] === separator[that.state][sepI]) {
                        match = true;
                        for (var ii = 1; ii < separator[that.state].length; ii++) {
                            i++;
                            if (input[i] !== separator[that.state][ii]) {
                                match = false;
                            }
                        }
                        if (match === true) {
                            that.processInputStringPart(input.slice(0, i - separator[that.state].length + 1).toString());
                            input = input.slice(i + 1);
                            break;
                        }
                    }
                };
                if (match === false) {
                    break;
                }
            }
        }
    });
};

Robot.prototype.processInputStringPart = function(data) {
    switch (this.state) {
        case 'login':
            this.name = data;
            this.log('Waiting for password.');
            this.sendMessage('PASSWORD');
            this.state = 'password';
            break;
        case 'password':
            this.password = data;
            if (this.validateCredentials() === true) {
                this.sendMessage('OK');
                this.log('Waiting for message.');
                this.state = 'message';
            }
            break;
        case 'message':
            if (data === 'INFO') {
                this.state = 'info';
            } else if (data === 'FOTO') {
                this.state = 'fotoLength';
            } else {
                this.log('Syntax error.');
                this.closeConnection('SYNTAX_ERROR');
            }
            break;
        case 'info':
            this.log('INFO: ' + data);
            this.state = 'message';
            break;
        case 'fotoLength':
            this.fotoLength = parseInt(data, 10);
            if (isNaN(this.fotoLength)) {
                this.log('Syntax error.');
                this.closeConnection('SYNTAX_ERROR');
            }
            this.state = 'foto';
            break;
        default:
            this.log('Something went wrong.');
    }
};

Robot.prototype.setConnectionTimeout = function() {
    var that = this;
    this.timeout = setTimeout(function() {
        that.log('Connection timeout.');
        that.closeConnection('TIMEOUT');
    }, 45000);
};

Robot.prototype.closeConnection = function(type) {
    this.sendMessage(type);
    this.socket.end();
};

Robot.prototype.validateCredentials = function() {
    var sum = 0;
    var i = this.name.length;
    while (i--) {
        sum += this.name.charCodeAt(i);
    }

    if (parseInt(this.password, 10) === sum && this.name.substr(0, 5) === 'Robot') {
        this.log('Robot verified.');
        return true;
    } else {
        this.log('Wrong credentials.');
        this.closeConnection('LOGIN_FAILED');
    }
    return false;
};

module.exports = Robot;
