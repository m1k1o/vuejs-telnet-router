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
            login: {
                url: "http://127.0.0.1:3080/",
                name: "admin",
                pass: ""
            },
            ports: {},
            links: {},
            
            project: {},
            project_nodes: {},
            project_links: {}
        },

        configs: {
            running_config: {}
        }
    },
    mutations: {
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
            state.devices[device].status = status;
        },

        // GNS
        GNS_LOGIN(state, login) {
            Vue.set(state.gns, 'login', login)
            localStorage.setItem('gns_login', JSON.stringify(login));
        },

        GNS_PUT(state, {key, data}) {
            Vue.set(state.gns, key, data)
        },

        // Configs
        SET_CONFIG(state, {type, device, data}) {
            if(typeof type === 'undefined' || type === null) {
                Vue.set(state, 'configs', data)
            } else if(typeof device === 'undefined' || device === null) {
                Vue.set(state.configs, type, data)
            } else {
                Vue.set(state.configs[type], device, data)
            }
        },
    },
    getters: {
        http_url(state){
            return state.connection.url
                .replace(/^ws(s?)\:\/\//, "http$1://")
                .replace(/\/$/, "");
        }
    },
    actions: {
        INIT({commit, dispatch}){
            if(localStorage.getItem('connection')) {
                var data = JSON.parse(localStorage.getItem('connection'));
                commit('CONNECTION', data)

                if(data.auto) {
                    dispatch('CONNECT');
                }
            }
            
            if(localStorage.getItem('gns_login')) {
                var {url, name, pass} = JSON.parse(localStorage.getItem('gns_login'));
                commit('GNS_LOGIN', {url, name, pass})
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
        TERMINAL_SET({dispatch}, device) {
            return dispatch('EMIT', {
                service: "terminal_set",
                data: device
            })
        },
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
        GNS_API({state, getters}, path) {
            var url = new URL(getters.http_url + "/gns_api")
            
            url.search = new URLSearchParams({
                url: state.gns.login.url.replace(/\/$/, "") + path,
                username: state.gns.login.name,
                password: state.gns.login.pass
            })

            return fetch(url)
            .then(function(response) {
                if (!response.ok) throw Error(response.statusText);
                return response;
            }).then((res) => res.json())
        },

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
