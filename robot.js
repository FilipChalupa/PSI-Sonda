var coolors = require('coolors');

/**
 * Creates a new Robot.
 * @class
 */
var Robot = function(socket) {
    this.id = Robot.id++;
    this.socket = socket;
    this.name = '';
    this.password = '';

    /** setTimeout reference */
    this.timeout = false;

    /** Robot's current state */
    this.state = 'login';

    this.log('Robot connected.', 'info');

    this.addListeners();

    this.setConnectionTimeout();

    this.log('Waiting for name.', 'info');
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

/**
 * Writes message to console with Robot's id.
 * @param {string} message Message to be written.
 * @function log
 */
Robot.prototype.log = function(message, type) {
    var color;
    var out = console.log;

    switch (type) {
        case 'info':
            color = 'gray';
            break;
        case 'error':
            color = 'red';
            out = console.error
            break;
        case 'data':
            color = 'cyan';
            break;
    }

    out(coolors('[' + this.id + ']', {text: color, background: 'black', inverse: true}), coolors(message, color));
};

/**
 * Sends predefined message over network to a client associated with the Robot.
 * @param {string} type Key from Robot.MESSAGE.
 * @function sendMessage
 */
Robot.prototype.sendMessage = function(type) {
    try {
        this.socket.write(Robot.MESSAGE[type] + '\r\n');
    } catch (e) {}
};

/**
 * Adds listeners for incoming data.
 * @function addListeners
 */
Robot.prototype.addListeners = function() {
    var that = this;

    this.socket.on('end', function() {
        that.log('Robot disconnected.', 'info');
        that.state = false;
        clearTimeout(that.timeout);
    });
    this.processData();
};

/**
 * Resolves incoming data.
 * @function processData
 */
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
            /** Processes photo data. */
            if (input.length >= fotoLength) {
                foto = input.slice(0, fotoLength);
                input = input.slice(fotoLength);
                that.state = 'fotoChecksum';
                return true;
            }
        } else if (that.state === 'fotoChecksum') {
            /** Processes 4 bytes of photo data checksum. */
            if (input.length >= 4) {
                var checksum = 0;
                for (var i = 0; i < foto.length; i++) {
                    checksum += foto[i];
                }
                if (input.readUInt32BE(0) === checksum) {
                    // TODO: Save photo
                    that.log('Photo received.', 'info');
                    that.sendMessage('OK');
                } else {
                    that.log('Bad photo checksum.', 'error');
                    that.sendMessage('BAD CHECKSUM');
                }
                fotoLength = 0;
                input = input.slice(4);
                that.state = 'message';
                that.log('Waiting for message.', 'info');
                return true;
            }
        } else if (that.state === 'message') {
            /** Processes whether next incoming data will be part of INFO or FOTO. */
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
            /** Processes photo length. */
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
            /** Processes rest (name, password, INFO text). */
            var len = input.length - separator.length + 1;
            var sepI = 0;
            var match = false;
            for (var x = 0; x < len; x++) {
                if (input[x] === separator[sepI]) {
                    match = true;
                    for (var ii = 1; ii < separator.length; ii++) {
                        x++;
                        if (input[x] !== separator[ii]) {
                            match = false;
                        }
                    }
                    if (match === true) {
                        that.processInputStringPart(input.slice(0, x - separator.length + 1));
                        input = input.slice(x + 1);
                        return true;
                    }
                }
            }
        }
        return false;
    };

    this.socket.on('data', function(data) {
        input = Buffer.concat([input, new Buffer(data, 'hex')]);
        while(processBuffer()) {}
    });
};

/**
 * Resolves some complete messages.
 * @param {string | Buffer} data Key from Robot.MESSAGE.
 * @function processInputStringPart
 */
Robot.prototype.processInputStringPart = function(data) {
    if (this.state !== 'login') {
        data = data.toString();
    }
    switch (this.state) {
        case 'login':
            this.name = data;
            this.log('Robot name: ' + (this.name.length < 50 ? this.name.toString() : this.name.slice(0, 47).toString() + '...'), 'data');
            this.log('Waiting for password.', 'info');
            this.sendMessage('PASSWORD');
            this.state = 'password';
            break;
        case 'password':
            this.password = data;
            if (this.validateCredentials() === true) {
                this.sendMessage('OK');
                this.log('Waiting for message.', 'info');
                this.state = 'message';
            }
            break;
        case 'info':
            this.log('INFO: ' + (data.length < 50 ? data : data.slice(0, 47) + '...'), 'data');
            this.sendMessage('OK');
            this.log('Waiting for message.', 'info');
            this.state = 'message';
            break;
        default:
            this.log('Something went wrong.', 'error');
    }
};

/**
 * Sets connection timeout to 45 seconds.
 * @function setConnectionTimeout
 */
Robot.prototype.setConnectionTimeout = function() {
    var that = this;
    this.timeout = setTimeout(function() {
        that.closeConnection('TIMEOUT');
    }, 45000);
};

/**
 * Closes connection with the client and sends error message.
 * @param {string} type Key from Robot.MESSAGE.
 * @function closeConnection
 */
Robot.prototype.closeConnection = function(type) {
    this.log('ERROR: ' + type + '!', 'error');
    this.state = false;
    this.sendMessage(type);
    this.socket.end();
};

/**
 * Validates name and password combination.
 * @function validateCredentials
 */
Robot.prototype.validateCredentials = function() {
    var sum = 0;
    var i = this.name.length;
    while (i--) {
        sum += this.name[i];
    }

    if (parseInt(this.password, 10) === sum && this.name.toString().substr(0, 5) === 'Robot') {
        this.log('Robot verified.', 'info');
        return true;
    } else {
        this.closeConnection('LOGIN FAILED');
    }
    return false;
};

module.exports = Robot;
