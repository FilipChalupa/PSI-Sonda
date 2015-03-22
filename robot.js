var Robot = function(socket) {
    this.id = Robot.id++;
    this.socket = socket;
    this.name = '';
    this.password = '';
    this.timeout = false;

    this.state = 'login';

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
    'BAD CHECKSUM':  '300 BAD CHECKSUM',
    'LOGIN FAILED':  '500 LOGIN FAILED',
    'SYNTAX ERROR':  '501 SYNTAX ERROR',
    'TIMEOUT':       '502 TIMEOUT',
};

Robot.prototype.log = function(message) {
    console.log('[' + this.id + ']\t' + message);
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
        that.state = false;
        clearTimeout(that.timeout);
    });
    this.processData();
};

Robot.prototype.processData = function() {
    var that = this;
    var input = new Buffer(0, 'hex');
    var separator = [13, 10]; // \r\n
    var foto;
    var fotoLength = 0;

    var processBuffer = function() {
        if (that.state === false) {
            return false;
        }

        if (that.state === 'foto') {
            if (input.length >= fotoLength) {
                foto = input.slice(0, fotoLength);
                input = input.slice(fotoLength);
                that.state = 'fotoChecksum'
                return true;
            }
        } else if (that.state === 'fotoChecksum') {
            if (input.length >= 4) {
                var checksum = 0;
                for (var i = 0; i < foto.length; i++) {
                    checksum += foto[i];
                }
                if (input.readUInt32BE(0) === checksum) {
                    // Save photo
                    that.log('Photo received.');
                    that.sendMessage('OK');
                    that.log('Waiting for message.');
                } else {
                    that.sendMessage('BAD CHECKSUM');
                }
                fotoLength = 0;
                input = input.slice(4);
                that.state = 'message';
                return true;
            }
        } else if (that.state === 'message') {
            var checkPart = (input.length > 5 ? input.slice(0, 5) : input).toString();
            if (checkPart !== 'INFO '.substr(0, checkPart.length) && checkPart !== 'FOTO '.substr(0, checkPart.length)) {
                that.closeConnection('SYNTAX ERROR');
            } else {
                if (input.length >= 5) {
                    if (checkPart === 'INFO ') {
                        that.state = 'info';
                    } else {
                        that.state = 'fotoLength';
                    }
                    input = input.slice(5);
                    return true;
                }
            }
        } else if (that.state === 'fotoLength') {
            while (input.length > 0) {
                if (input[0] >= 48 && input[0] <= 57) {
                    fotoLength = fotoLength * 10 + (input[0] - 48);
                    input = input.slice(1);
                } else if (input[0] === 32 && fotoLength > 0) {
                    that.state = 'foto';
                    input = input.slice(1);
                    return true;
                } else {
                    that.closeConnection('SYNTAX ERROR');
                    break;
                }
            }
        } else {
            var len = input.length - separator.length + 1;
            var sepI = 0;
            var match = false;
            for (var i = 0; i < len; i++) {
                if (input[i] === separator[sepI]) {
                    match = true;
                    for (var ii = 1; ii < separator.length; ii++) {
                        i++;
                        if (input[i] !== separator[ii]) {
                            match = false;
                        }
                    }
                    if (match === true) {
                        that.processInputStringPart(input.slice(0, i - separator.length + 1));
                        input = input.slice(i + 1);
                        return true;
                    }
                }
            };
        }
        return false;
    };

    this.socket.on('data', function(data) {
        input = Buffer.concat([input, new Buffer(data, 'hex')]);
        //that.log('IN: '+input.toString());
        while(processBuffer()) {}
    });
};

Robot.prototype.processInputStringPart = function(data) {
    if (this.state !== 'login') {
        data = data.toString();
    }
    switch (this.state) {
        case 'login':
            this.name = data;
            this.log('Robot name: ' + (this.name.length < 50 ? this.name.toString() : this.name.slice(0, 47).toString() + '...'));
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
        case 'info':
            this.log('INFO: ' + (data.length < 50 ? data : data.slice(0, 47) + '...'));
            this.sendMessage('OK');
            this.log('Waiting for message.');
            this.state = 'message';
            break;
        default:
            this.log('Something went wrong.');
    }
};

Robot.prototype.setConnectionTimeout = function() {
    var that = this;
    this.timeout = setTimeout(function() {
        that.closeConnection('TIMEOUT');
    }, 45000);
};

Robot.prototype.closeConnection = function(type) {
    this.log('ERROR: ' + type + '!');
    this.state = false;
    this.sendMessage(type);
    this.socket.end();
};

Robot.prototype.validateCredentials = function() {
    var sum = 0;
    var i = this.name.length;
    while (i--) {
        sum += this.name[i]
    }

    if (parseInt(this.password, 10) === sum && this.name.toString().substr(0, 5) === 'Robot') {
        this.log('Robot verified.');
        return true;
    } else {
        this.closeConnection('LOGIN FAILED');
    }
    return false;
};

module.exports = Robot;
