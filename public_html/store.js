const store = new Vuex.Store({
    state: {
        workspace: 'default',

        running: false,

        connection: {
            url: "ws://127.0.0.1:8090",
            socket: null,
            auto: false
        },

        terminal: {
            device: null,
            data: null,
            ignore_special_chars: true
        },
        
        devices: {},

        gns: {
            connection: {
                url: "http://127.0.0.1:3080/",
                name: "admin",
                pass: "",
                project_id: "",
                auto: false
            },
            compute: false,

            ports: {},
            links: {},
            
            projects: false,

            project: false,
            project_nodes: [],
            project_links: []
        },

        configs: {
            running_config: null
        }
    },
    mutations: {
        SET_WORKSPACE(state, workspace = null) {
            Vue.set(state, 'workspace', workspace || 'default')
        },

        // GLOBAL
        RUNNING(state, running) {
            Vue.set(state, 'running', running)
        },
        CONNECTION(state, connection) {
            for (const key in connection) {
                if (connection.hasOwnProperty(key) && state.connection.hasOwnProperty(key) && state.connection[key] != connection[key]) {
                    Vue.set(state.connection, key, connection[key]);
                }
            }

            localStorage.setItem('connection', JSON.stringify({
                url: state.connection.url,
                auto: state.connection.auto
            }));
        },

        // TERMINAL
        TERMINAL_DEVICE(state, device) {
            Vue.set(state.terminal, 'device', device)
        },
        TERMINAL_DATA(state, data) {
            if(state.terminal.ignore_special_chars){
                state.terminal.data += data;
                return;
            }
            
            var str = String(data);
            for (var i = 0; i < str.length; i++) {
                if(str.charCodeAt(i) == 8) {
                    state.terminal.data = state.terminal.data.slice(0, -1);
                } else {
                    state.terminal.data += str.charAt(i);
                }
            }
        },
        TERMINAL_FLUSH_DATA(state) {
            Vue.set(state.terminal, 'data', "")
        },

        // DEVICES
        DEVICES(state, devices) {
            Vue.set(state, 'devices', devices);
        },
        DEVICE_STATUS(state, {device, status}) {
            if(device in state.devices)
            state.devices[device].status = status;
        },

        // GNS
        GNS_CONNECTION(state, connection) {
            for (const key in connection) {
                if (connection.hasOwnProperty(key) && state.gns.connection.hasOwnProperty(key) && state.gns.connection[key] != connection[key]) {
                    Vue.set(state.gns.connection, key, connection[key]);
                }
            }
            
            localStorage.setItem('gns_connection', JSON.stringify(state.gns.connection));
        },
        GNS_PUT(state, {key, data}) {
            Vue.set(state.gns, key, data)
        },

        // CONFIGS
        SET_CONFIG(state, {type, device, data}) {
            if(typeof type === 'undefined' || type === null) {
                Vue.set(state, 'configs', data)
            } else if(typeof device === 'undefined' || device === null) {
                Vue.set(state.configs, type, data)
            } else {
                Vue.set(state.configs[type], device, data)
            }
        }
    },
    getters: {
        http_url(state){
            return state.connection.url
                .replace(/^ws(s?)\:\/\//, "http$1://")
                .replace(/\/$/, "");
        },
        gns_ws_url(state){
            return state.gns.connection.url
                .replace(/^http(s?)\:\/\//, "ws$1://" + state.gns.connection.name + ":" + state.gns.connection.pass + "@")
                .replace(/\/$/, "");
        },
		is_running_config(state){
			return state.configs.running_config !== null && Object.keys(state.configs.running_config).length != 0
		},
        gns_nodes(state) {
            var nodes = {};

            // NODES
            for(var key in state.gns.project_nodes) {
                let node = state.gns.project_nodes[key];

                nodes[node.node_id] = {
                    gns: node
                };
            }
            
            // LINKS
            var node_ports = {};
            for(var link of state.gns.project_links) {
                let node0 = link.nodes[0];
                let node1 = link.nodes[1];

                node_ports[node0.node_id+"_"+node0.adapter_number+"_"+node0.port_number] = { link, node: nodes[node1.node_id] }
                node_ports[node1.node_id+"_"+node1.adapter_number+"_"+node1.port_number] = { link, node: nodes[node0.node_id] }
            }

            // NODES
            for(var node_id in nodes) {
                let node = nodes[node_id];

                let links = []
                for(var index in node.gns.ports) {
                    let port = node.gns.ports[index]
                    let key = node_id+"_"+port.adapter_number+"_"+port.port_number;

                    if(key in node_ports) {
                        links.push({
                            port,
                            ...node_ports[key]
                        })
                    }
                }
                
                let configs = {};
                for(const key in state.configs) {
                    if (node.gns.name in state.configs[key]) {
                        configs[key] = state.configs[key][node.gns.name]
                    }
                }
                
                node.links = links
                node.configs = configs
            }
            
            return nodes;
        }
    },
    actions: {
        // GLOBAL
        INIT({commit, dispatch}){
            if(localStorage.getItem('connection')) {
                var data = JSON.parse(localStorage.getItem('connection'));
                commit('CONNECTION', data)

                if(data.auto) {
                    dispatch('CONNECT');
                }
            }
            
            if(localStorage.getItem('gns_connection')) {
                var data = JSON.parse(localStorage.getItem('gns_connection'));
                commit('GNS_CONNECTION', data)

                if(data.auto) {
                    dispatch('GNS_PROJECTS')
                    .then(() => {
                        if(data.project_id) {
                            return dispatch('GNS_CONNECT', data.project_id)
                        }
                    })
                    .then(() => {}, () => {})
                }
            }
        },
        CONNECT({state, commit}, url = null) {
			if(state.connection.socket != null) {
				state.connection.socket.close()
            }
            
            if (url == null) {
                url = state.connection.url;
            }

			commit('CONNECTION', {
                socket: io.connect(url),
                url
            });

			state.connection.socket.on("terminal_device", (device) => commit('TERMINAL_DEVICE', device));
            state.connection.socket.on("terminal_data", (data) => commit('TERMINAL_DATA', data));
            
            state.connection.socket.on("configs", (data) => commit('SET_CONFIG', {data}));

			state.connection.socket.on("devices", (devices) => commit('DEVICES', devices));
			state.connection.socket.on("device_status", ({device, status}) => commit('DEVICE_STATUS', {device, status}));
			state.connection.socket.on("connect", () => commit('RUNNING', true));
			state.connection.socket.on("disconnect", () => commit('RUNNING', false));
        },
        EMIT({state}, {service, data}) {
			if(!state.running) {
                console.log("Can't emit, not running.")
                return null
            }
            
			return state.connection.socket.emit(service, data);
        },

        // TERMINAL
        TERMINAL_SET({dispatch}, device) {
            return dispatch('EMIT', {
                service: "terminal_set",
                data: device
            })
        },

        // DEVICES
        EXECUTE({dispatch}, input = null) {
            if(Array.isArray(input)) {
                return (async function(){
                    for (const {cmds, to} of input) {
                        await dispatch('EMIT', {
                            service: "execute",
                            data: {cmds, to}
                        })
                    }
                }())
            }

            if(typeof input === 'object') {
                const {cmds, to} = input;
                return dispatch('EMIT', {
                    service: "execute",
                    data: {cmds, to}
                })
            }

            return dispatch('EMIT', {
                service: "execute",
                data: {
                    cmds: input,
                    to: null
                }
            })
        },
        DEVICES_PUT({dispatch}, data) {
            return dispatch('EMIT', {
                service: "devices_put",
                data
            })
        },
        DEVICE_ADD({dispatch}, data) {
            return dispatch('EMIT', {
                service: "device_add",
                data
            })
        },
        DEVICE_REMOVE({dispatch}, id) {
            return dispatch('EMIT', {
                service: "device_remove",
                data: id
            })
        },

        // GNS
        GNS_API({state, getters}, path) {
            var url = new URL(getters.http_url + "/gns_api")
            
            url.search = new URLSearchParams({
                url: state.gns.connection.url.replace(/\/$/, "") + path,
                username: state.gns.connection.name,
                password: state.gns.connection.pass
            })

            return fetch(url)
            .then(function(response) {
                if (!response.ok) throw Error(response.statusText);
                return response;
            }).then((res) => res.json())
        },
        GNS_PROJECTS({dispatch, commit}) {
            commit("GNS_PUT", {
                key: 'projects',
                data: false
            });

            return dispatch("GNS_API", "/v2/projects").then((projects) => {
                if(projects.error === true) {
                    throw new Error(projects.message)
                }

                commit("GNS_PUT", {
                    key: 'projects',
                    data: projects.data
                });

                return projects;
            })
        },
        GNS_CONNECT({commit, state, dispatch, getters}, project_id) {
            commit("GNS_CONNECTION", { project_id });
            commit("GNS_PUT", {
                key: 'project',
                data: state.gns.projects.find(p => p.project_id == project_id)
            });

            // GET NODES & LINKS
            return Promise.all([
                dispatch("GNS_API", "/v2/projects/" + project_id + "/nodes"),
                dispatch("GNS_API", "/v2/projects/" + project_id + "/links")
            ]).then((responses) => {
                // Catch errors
                for (const res of responses) {
                    if(res.error === true) {
                        throw new Error(res.message)
                    }
                }
                                
                var socket = new WebSocket(getters.gns_ws_url + "/v2/projects/" + project_id + "/notifications/ws");
                socket.onopen = function (event) {
                    console.log("Connected");
                };

                socket.onmessage = function (resp) {
                    var data = JSON.parse(resp.data);
                    switch(data.action) {
                        case "ping":
                        case "compute.updated":
                            commit("GNS_PUT", {
                                key: 'compute',
                                data: {
                                    memory_usage_percent: data.event.memory_usage_percent,
                                    cpu_usage_percent: data.event.cpu_usage_percent
                                }
                            });
                            break;

                        case "node.created":
                            commit("GNS_PUT", {
                                key: 'project_nodes',
                                data: [ ...state.gns.project_nodes, data.event ]
                            });
                            break;

                        case "node.updated":
                            var { event } = data;
                            var new_nodes = state.gns.project_nodes.map(x =>{
                                if(x.node_id == event.node_id) {
                                    return event;
                                }
                                return x;
                            });
                            commit("GNS_PUT", {
                                key: 'project_nodes',
                                data: new_nodes
                            });
                            break;

                        case "node.deleted":
                            commit("GNS_PUT", {
                                key: 'project_nodes',
                                data: state.gns.project_nodes.filter(x => x.node_id != data.event.node_id)
                            });
                            break;

                        case "link.created":
                            commit("GNS_PUT", {
                                key: 'project_links',
                                data: [ ...state.gns.project_links, data.event ]
                            });
                            break;

                        case "link.updated":
                            var { event } = data;
                            var new_links = state.gns.project_links.map(x =>{
                                if(x.link_id == event.link_id) {
                                    return event;
                                }
                                return x;
                            });
                            commit("GNS_PUT", {
                                key: 'project_links',
                                data: new_links
                            });
                            break;
                            
                        case "link.deleted":
                            commit("GNS_PUT", {
                                key: 'project_links',
                                data: state.gns.project_links.filter(x => x.link_id != data.event.link_id)
                            });
                            break;
                        
                        case "project.updated":
                            commit("GNS_PUT", {
                                key: 'project',
                                data: data.event
                            });
                            break;
                    }
                    console.log(data);
                };
                state.gns.socket = socket;

                var project_nodes = responses[0].data;
                var project_links = responses[1].data;

                commit("GNS_PUT", {
                    key: 'project_nodes',
                    data: project_nodes
                });

                commit("GNS_PUT", {
                    key: 'project_links',
                    data: project_links
                });
                
                // DEVICES & PORTS
                var devs = [];
                var ports = {};
                
                var node_ports = {};
                for(var node of project_nodes) {
                    if (node.console_type == "telnet") {
                        devs.push({
                            name: node.name,
                            host: node.console_host,
                            port: node.console
                        })

                        ports[node.name] = node.ports.map(port => {
                            return port.short_name;
                        })

                        node_ports[node.node_id] = {};
                        for (const port of node.ports) {
                            node_ports[node.node_id][port.adapter_number + "_" + port.port_number] =  {
                                port: port.name,
                                device: node.name
                            };
                        }
                    }
                }
                commit("GNS_PUT", {
                    key: 'ports',
                    data: ports
                });

                // LINKS
                var links = [];
                for(var link of project_links) {
                    var nodes = link.nodes.map(node => {
                        return node_ports[node.node_id][node.adapter_number + "_" + node.port_number];
                    })

                    links.push(nodes);
                }
                commit("GNS_PUT", {
                    key: 'links',
                    data: links
                });

                return dispatch("DEVICES_PUT", devs);
            })
        },
        GNS_DISCONNECT({commit}) {
            commit("GNS_CONNECTION", { project_id: null, auto: false });
            commit("GNS_PUT", {
                key: 'project',
                data: false
            });
        },

        // CONFIGS
        CONFIGS({commit, getters}, {action, type, device}) {
            var url = getters.http_url + "/configs/";
            if(typeof type === 'undefined' || type === null) {
                url += action;
            } else if(typeof device === 'undefined' || device === null) {
                url += action+"/"+type;
            } else {
                url += action+"/"+type+"/"+device;
            }

            return fetch(url)
                .then(function(response) {
                    if (!response.ok) throw Error(response.statusText);
                    return response;
                })
                .then((res) => res.json())
                .then((data) => {
                    commit('SET_CONFIG', {type, device, data})
                })
        }
    }
})
