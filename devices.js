var net = require('net')

module.exports = function(io) {
    var devices = {};

    this.add = function(name, host, port){
        var params = {host, port};
        var connection = net.createConnection(params);
        
        connection.on("data", (data) => {
            io.to(name).emit("terminal_data", ''+data);
        });

        connection.on('error', (error) => {
            !devices[name] || (devices[name].status = 'error');
            this.advertise();
        })

        connection.on('close', () => {
            !devices[name] || (devices[name].status = 'closed');
            this.advertise();
        })

        connection.on('ready', () => {
            connection.write('\r\n')
            !devices[name] || (devices[name].status = 'ready');
            this.advertise();
        })

        devices[name] = {
            connection,
            params,
            host,
            port,
            status: 'waiting...'
        };

        return connection;
    }

    this.remove = function(name){
        if(name in devices) {
            return new Promise(resolve => {
                devices[name].connection.end()
                delete devices[name];
                resolve()
            })
        }
    }

    this.advertise = function(socket = null){
        var obj = {};
        for (const device in devices) {
            if (devices.hasOwnProperty(device)) {
                var {name, host, port, status} = devices[device];
                obj[device] = {name, host, port, status}
            }
        }

        if(socket === null) {
            io.sockets.emit("devices", obj);
        } else {
            socket.emit("devices", obj);
        }
    }

    this.by_name = function(name, running = false){
        if(!(name in devices)) {
            return null;
        }

        var device = devices[name];
        if(running && device.status !== 'ready') {
            return null;
        }
        
        return device;
    }

    this.put = async function(input){
        // Remove all
        for(var name in devices) {
            await this.remove(name)
        }
        
        for(var dev of input) {
            var {name, host, port} = dev;
            this.add(name, host, port);
        }
    }

    this.get_names = function(){
        return Object.keys(devices);
    }

    this.execute = function(deivce_name, cmd){
        return new Promise((resolve, reject) => {
            let device = this.by_name(deivce_name, true);
            if(!device) {
                reject("device "+deivce_name+" not found");
                return ;
            }

            device.connection.write(String(cmd).trim()+'\r\n');
            
            let response = "";
            let timeout = null;
            function unsubscribe(multiplier = 1) {
                clearInterval(timeout);
                timeout = setTimeout(() => {
                    // Paginate?
                    if(response.endsWith("\r\n --More-- ")) {
                        device.connection.write(Buffer.from('20', 'hex'))
                        unsubscribe()
                        return;
                    }

                    if(response.endsWith("Building configuration...\r\n")) {
                        unsubscribe(5)
                        return;
                    }

                    device.connection.removeListener("data", handler);
                    resolve(response);
                }, 300*multiplier)
            }
            
            unsubscribe();
            let handler = function(data) {
                var str = String(data);
                for (var i = 0; i < str.length; i++) {
                    if(str.charCodeAt(i) == 8) {
                        response = response.slice(0, -1);
                    } else {
                        response += str.charAt(i);
                    }
                }

                unsubscribe();
            };

            device.connection.on("data", handler);
        })
    }

    return this;
}
