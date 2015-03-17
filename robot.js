var Robot = function(socket) {
    this.id = Robot.id++;
    this.socket = socket;
    this.name = '';
    this.password = '';
    this.timeout = false;
    this.inputBuffer = '';
    this.processBuffer = '';
    this.seprarator = '\r\n';

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
    this.socket.on('data', function(data) {
        this.inputBuffer += data.toString();
        that.read();
    });
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
    } else {
        this.log('Wrong credentials.');
        this.closeConnection('LOGIN_FAILED');
    }
};

Robot.prototype.read = function() {
    this.processBuffer += this.dataBuffer[0];
    this.dataBuffer = this.dataBuffer.substr(1);

    if (this.seprarator !== false) {
        if (this.processBuffer.substr(-2) === this.separator) {

        }
    }


    if (this.inputBuffer.length > 0) {
        this.read();
    }
};

/*

Robot.prototype.loginManager = function(data) {
    var length = data.length;
    for (var i = 0; i < length; i++) {
        if (data[i] === '\n' && this.name.slice(-1) === '\r') {
            this.name = this.name.substr(0, this.name.length - 1);
            this.log('Waiting for password.');
            this.sendMessage('PASSWORD');
            this.incomingDataManager = this.passwordManager;
            this.incomingDataManager(data.substr(i + 1));
            break;
        } else {
            this.name += data[i];
        }
    }
};

Robot.prototype.passwordManager = function(data) {
    var length = data.length;
    for (var i = 0; i < length; i++) {
        if (data[i] === '\n' && this.password.slice(-1) === '\r') {
            this.password = this.password.substr(0, this.password.length - 1);
            this.validateCredentials();
            this.sendMessage('OK');
            this.incomingDataManager = this.messageTypeManager;
            this.incomingDataManager(data.substr(i + 1));
            break;
        } else {
            this.password += data[i];
        }
    }
};

Robot.prototype.messageTypeManager = function(data) {
    console.log('Reading message type');
    //this.incomingDataManager(data);
};

Robot.prototype.infoManager = function(data) {
    console.log('Reading info');
    //this.incomingDataManager(data);
};

Robot.prototype.fileManager = function(data) {
    console.log('Reading file');
    //this.incomingDataManager(data);
};
*/

module.exports = Robot;







