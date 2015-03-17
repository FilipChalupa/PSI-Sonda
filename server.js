var net = require('net');
var Robot = require('./robot');


var port = parseInt(process.argv[2], 10);

if (isNaN(port) || port < 3000 || port > 3999) {
    console.log('Error:\tWrong port! Use number from range 3000 to 3999.');
    port = 3000;
}

var server = net.createServer(function(socket) {
    new Robot(socket);
});

server.listen(port, function() {
    console.log('Info:\tServer is running at port: ' + port + '\n');
});
