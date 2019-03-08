const store = new Vuex.Store({
    state: {
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
            ports: {},
            links: {},
            
            projects: false,

            project: false,
            project_nodes: [],
            project_links: []
        },

        configs: {
            running_config: {}
        }
    },
    mutations: {
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
        GNS_CONNECT({commit, state, dispatch}, project_id) {
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
