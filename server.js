var net = require('net');
var Robot = require('./robot');
var robots = [];

/**
 * Gets a port number from the first parameter.
 */
var port = parseInt(process.argv[2], 10);

/**
 * Validates the port number. Allowed range is 3000 to 3999.
 */
if (isNaN(port) || port < 3000 || port > 3999) {
    console.log('Error:\tWrong port! Use number from range 3000 to 3999.');
    port = 3000;
}

/**
 * Creates server a new Robot instance for each connected client.
 */
var server = net.createServer(function(socket) {
    robots.push(new Robot(socket));
});

/**
 * Sets server to listen at the port.
 */
server.listen(port, function() {
    console.log('Info:\tServer is running at port: ' + port + '\n');
});
