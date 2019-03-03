const store = new Vuex.Store({
    state: {
        running: false,

        connection: {
            url: "ws://127.0.0.1:8090",
            socket: null
        },

        terminal: {
            device: null,
            data: null
        },
        
        devices: {},

        gns: {
            login: {
                url: "http://127.0.0.1:3080/",
                name: "admin",
                pass: "aZG1DD8QSr55LfgnrM15kBPHXgIedTle3oaDZTmoYaRnsAJnMH5t1kWt3qzqDGii"
            }
        }
    },
    mutations: {
        RUNNING(state, running) {
            Vue.set(state, 'running', running)
        },
        CONNECTION(state, {socket, url}) {
            Vue.set(state, 'connection', {socket, url})
        },

        // TERMINAL
        TERMINAL_DEVICE(state, device) {
            Vue.set(state.terminal, 'device', device)
        },
        TERMINAL_DATA(state, data) {
            state.terminal.data += data;
        },
        TERMINAL_FLUSH_DATA(state) {
            Vue.set(state.terminal, 'data', "")
        },

        // DEVICES
        DEVICES(state, devices) {
            Vue.set(state, 'devices', devices)
        },

        // GNS
        GNS_LOGIN(state, {url, name, pass}) {
            Vue.set(state.gns, 'login', {url, name, pass})
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
        CONNECT({state, commit}, url) {
			if(state.connection.socket != null) {
				state.connection.socket.close()
            }
            
			commit('CONNECTION', {
                socket: io.connect(url),
                url
            });

			state.connection.socket.on("terminal_device", (device) => commit('TERMINAL_DEVICE', device));
            state.connection.socket.on("terminal_data", (data) => commit('TERMINAL_DATA', data));
            
			state.connection.socket.on("devices", (devices) => commit('DEVICES', devices));
			state.connection.socket.on("connect", () => commit('RUNNING', true));
			state.connection.socket.on("disconnect", () => commit('RUNNING', false));
        },
        EMIT({state}, {service, data}) {
			if(!state.running) {
                console.log("Can't emit, not running.")
                return
            }
            
			state.connection.socket.emit(service, data);
        },
        TERMINAL_SET({dispatch}, device) {
            dispatch('EMIT', {
                service: "terminal_set",
                data: device
            })
        },
        EXECUTE({dispatch}, input = null) {
            if(Array.isArray(input)) {
                for (const {cmds, to} of input) {
                    dispatch('EMIT', {
                        service: "execute",
                        data: {cmds, to}
                    })
                }
                return;
            }

            if(typeof input === 'object') {
                const {cmds, to} = input;
                dispatch('EMIT', {
                    service: "execute",
                    data: {cmds, to}
                })
                return;
            }

            dispatch('EMIT', {
                service: "execute",
                data: {
                    cmds: input,
                    to: null
                }
            })
        },
        DEVICE_ADD({dispatch}, data) {
            dispatch('EMIT', {
                service: "device_add",
                data
            })
        },
        DEVICE_REMOVE({dispatch}, id) {
            dispatch('EMIT', {
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

            return fetch(url).then((res) => res.json())
        }
    }
})
