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
    var input = '';
    var separator = {
        'login': '\r\n',
        'password': '\r\n',
        'message': ' ',
        'info': '\r\n',
        'fotoLength': ' '
    };

    this.socket.on('data', function(data) {
        var splitedData;
        input += data.toString();

        if (that.state === 'foto') {
            // TODO
        } else {
            while (true) {
                splitedData = input.split(separator[that.state]);
                if (splitedData.length === 1) {
                    break;
                }
                that.processInputPart(splitedData[0]);
                input = splitedData[1];
            }
        }
    });
};

Robot.prototype.processInputPart = function(data) {
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
