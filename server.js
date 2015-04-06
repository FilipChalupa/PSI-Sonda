var net = require('net');
var coolors = require('coolors');
var Robot = require('./robot');
var robots = [];

console.log(coolors('\n\nSonda 1.0.0\nby Filip Chalupa <chalufil@fit.cvut.cz>\n\n', 'gray'));

/**
 * Gets a port number from the first parameter.
 */
var port = parseInt(process.argv[2], 10);

/**
 * Validates the port number. Allowed range is 3000 to 3999.
 */
if (isNaN(port) || port < 3000 || port > 3999) {
    console.error(coolors('Error:', 'red'), 'Wrong port! Use number from range 3000 to 3999 as first parameter.');
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
    console.log(coolors('Info:', 'green'), 'Server is running at port: ' + port + '\n');
});
