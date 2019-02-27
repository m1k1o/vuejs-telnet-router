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
    var params = {
        host,
        port,
        shellPrompt: '#',
        timeout: 500,
        ors: '\r\n',
        waitfor: '\n'
    };
    
    connection.on("data", function(data){
        io.to(name).emit("data", ''+data);
    });

    connection.on('error', function(error) {
        routers[name].status = 'error';
        UpdateRotuers();
    })

    connection.on('close', function() {
        routers[name].status = 'closed';
        UpdateRotuers();
    })

    connection.on('ready', function(prompt) {
        routers[name].status = 'ready';
        UpdateRotuers();
    })

    routers[name] = {
        connection,
        params,
        host,
        port,
        status: 'waiting...'
    };

    return connection.connect(params);
}

function RemoveRotuer(name){
    if(name in routers) {
        return routers[name].connection.end().then(() => {
            delete routers[name];
        })
    }
}
function UpdateRotuers(){
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
    if(running && router.status !== 'ready') {
        return null;
    }
    
    return router;
}

/*
function RestartRouters() {
    for (const router in routers) {
        var {host, port} = routers[router];

        var promise = RemoveRotuer(router);
        if(promise) {
            promise.then(() => {
                NewRouter(router, host, port);
            })
        }
    }
}
*/

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
    UpdateRotuers();
	
	socket.on("add_router", ({name, host, port}) => {
		NewRouter(name, host, port);
        UpdateRotuers();
	});
	socket.on("remove_router", (name) => {
		RemoveRotuer(name);
        UpdateRotuers();
	});
	socket.on("get_routers", () => {
        UpdateRotuers();
    });
    /*
	socket.on("restart_routers", () => {
        RestartRouters();
        UpdateRotuers();
    });
    */
    
    // Data
	socket.on("data", function({data, to}) {
        var cmds = (''+data).split('\n');
        
        // Get all
        if (!to) to = Object.keys(routers);

        // Get specific
        for (var name of to) {
            var router = GetRotuer(name, true);
            if(router) {
                for (var cmd of cmds) {
                    router.connection.send(cmd.trim()+'\r\n');
                }
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