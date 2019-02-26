'use strict'

var Telnet = require('telnet-client')

 /*
// display server response
connection.on("data", function(data){
	process.stdout.write(''+data);
});

connection.on('ready', function(prompt) {
  connection.send("sh ip int br\r\n")
})
 
connection.on('timeout', function() {
  console.log('socket timeout!')
  //connection.end()
})
 
connection.on('close', function() {
  console.log('connection closed')
})

var stdin = process.openStdin();
stdin.addListener("data", function(d) {
	
	connection.send(d.toString())
	
});
*/

var port = process.argv[2] || 8090;
var http = require("http").createServer();
var io = require("socket.io")(http);

http.listen(port, function () {
  console.log("Starting server on port %s", port);
});

var routers = {};
function NewRouter(name, host, port){
    var connection = new Telnet()
    connection.connect({
        host,
        port,
        shellPrompt: '#',
        timeout: 500,  ors: '\r\n',
        waitfor: '\n'
    })
    
    connection.on("data", function(data){
        io.to(name).emit("data", ''+data);
    });

    connection.on('error', function(error) {
        routers[name].status = 'error';
        UpdateRotuer();
    })

    connection.on('ready', function(prompt) {
        routers[name].status = 'ready';
        UpdateRotuer();
    })

    routers[name] = {
        connection,
        host,
        port,
        status: 'waiting...'
    };
    UpdateRotuer();
}

function RemoveRotuer(name){
    if(name in routers) {
        routers[name].connection.end();
        delete routers[name];
    }
    UpdateRotuer();
}
function UpdateRotuer(){
    var obj = {};
    for (const router in routers) {
        if (routers.hasOwnProperty(router)) {
            var {name, host, port, status} = routers[router];
            obj[router] = {name, host, port, status}
        }
    }
    io.sockets.emit("routers", obj);
}
function GetRotuer(name, running = false){
    if(!(name in routers)) {
        return null;
    }

    var router = routers[name];
    if(router.status !== 'ready') {
        return null;
    }
    
    return router;
}

NewRouter("R1", "127.0.0.1", 5000);


io.sockets.on("connection", function(socket) {
    console.log("New connection!");
    
    var selected_router = null;
    socket.on('room', function(room) {
        if (selected_router != null) {
            socket.leave(selected_router);
        }
        
        if (room != null) {
            socket.join(room);
        }
        selected_router = room;
    });

    // Routers
    socket.emit("routers", routers);
	
	socket.on("add_router", ({name, host, port}) => {
		NewRouter(name, host, port);
	});
	socket.on("remove_router", (name) => {
		RemoveRotuer(name);
	});
	socket.on("get_routers", () => {
        UpdateRotuer();
    });
    
    // Data
	socket.on("data", function({data, to}) {
        var data = (''+data).replace(/[\r\n]+/, '\r').trim()+'\r';

        // Get all
        if (!to) to = Object.keys(routers);

        // Get specific
        for (var name of to) {
            var router = GetRotuer(name, true);
            if(router) {
                router.connection.send(data)
            }
        }
	});
	
	socket.on("disconnect", function() {
        console.log("Got disconnect!");
        
        if (selected_router != null) {
            socket.leave(selected_router);
        }
	});
});