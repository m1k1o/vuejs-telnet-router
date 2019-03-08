Vue.component('devices', {
    data: () => ({
        input: "",

        new_device_modal: false,
        configs_modal: false,
        gns_load_modal: false
    }),
    template: `
        <div>
            <ul v-for="(device, name) in devices">
                <li>
                    <button @click="Remove(name)">X</button>
                    {{ name }} @ {{ device.host }}:{{ device.port }} ({{ device.status }})
                </li>
            </ul>

            <div class="mb-2">
                <button @click="new_device_modal = true">+ Add Device</button>
                <button @click="AutoAdd()">+ Auto Add</button>
                <button @click="configs_modal = true">Configs</button>
                <button @click="gns_load_modal = true">+ Load from GNS</button>
            </div>

            <device_modal
                :opened="new_device_modal"
                @closed="new_device_modal = false"
            />

            <configs_modal
                :opened="configs_modal"
                @closed="configs_modal = false"
            />

            <gns_load_modal
                :opened="gns_load_modal"
                @closed="gns_load_modal = false"
            />
        </div>
    `,
	computed: {
		devices() {
			return this.$store.state.devices;
		},
		configs() {
			return this.$store.state.configs;
		},
    },
    methods: {
        AutoAdd(total = null) {
            // Prompt?
            if(total == null) {
                total = prompt("How many devices do you wish to add?", "5");
                if (total == null) {
                    return;
                }
            }

            for(var i = 0; i < total; i++) {
                this.$store.dispatch("DEVICE_ADD", {
                    name: "R"+(i+1),
                    host: "127.0.0.1",
                    port: "500"+i
                });
            }
        },
		Remove(id) {
			this.$store.dispatch("DEVICE_REMOVE", id)
        },
    },
    components: {
        'device_modal': {
            props: ['opened'],
            watch: { 
                opened: function(newVal, oldVal) {
                    if(!oldVal && newVal) {
                        this.Open();
                    }
                    
                    if(oldVal && !newVal) {
                        this.Close();
                    }
                }
            },
            data: () => ({
                visible: false,
                data: {}
            }),
            template: `
                <modal v-if="visible" v-on:close="Close()">
                    <div slot="header">
                        <h1 class="mb-3"> + Add Device </h1>
                    </div>
                    <div slot="body" class="form-horizontal">
                        <div class="form-group row">
                            <label class="col-sm-4 col-form-label">Name</label>
                            <div class="col-sm-8">
                                <input type="text" class="form-control" v-model="data.name">
                            </div>
                        </div>
                        <div class="form-group row">
                            <label class="col-sm-4 col-form-label">Host</label>
                            <div class="col-sm-8">
                                <input type="text" class="form-control" v-model="data.host">
                            </div>
                        </div>
                        <div class="form-group row">
                            <label class="col-sm-4 col-form-label">Port</label>
                            <div class="col-sm-8">
                                <input type="text" class="form-control" v-model="data.port">
                            </div>
                        </div>
                    </div>
                    <div slot="footer">
                        <button v-on:click="Action()" class="btn btn-success">Save Changes</button>
                        <button v-on:click="Close()" class="btn btn-secondary">Cancel</button>
                    </div>
                </modal>
            `,
            methods: {
                Open(){
                    this.$set(this, 'data', {
                        name: null,
                        host: null,
                        port: null
                    })
                    this.visible = true;
                },
                Close(){
                    this.visible = false;
                    this.$emit("closed");
                },
                Action(){
                    this.$store.dispatch("DEVICE_ADD", this.data);
                    this.Close();
                }
            }
        },
        'configs_modal': {
            props: ['opened'],
            watch: { 
                opened: function(newVal, oldVal) {
                    if(!oldVal && newVal) {
                        this.Open();
                    }
                    
                    if(oldVal && !newVal) {
                        this.Close();
                    }
                }
            },
            data: () => ({
                visible: false,
                processing: false,
                error: false,
                show: null
            }),
            template: `
                <modal v-if="visible" v-on:close="Close()">
                    <div slot="header">
                        <h1 class="mb-3">  Configs </h1>
                    </div>
                    <div slot="body" class="form-horizontal">
                        <div class="alert alert-info" v-if="processing">Processing...</div>
                        <div class="alert alert-danger" v-if="error">{{ error }}</div>
                        <button @click="Load()">Load all</button>
                        <div v-for="(devices, type) in configs">
                            <h2> {{ type }} <button @click="Load(type)">Load</button><button @click="Update(type)">Update</button></h2>
                            <ul>
                                <li v-for="(config, device) in devices">
                                    <button @click="Load(type, device)">Load</button>
                                    <button @click="Update(type, device)">Update</button>
                                    <span @click="show = config">{{ device }}</span>
                                </li>
                            </ul>
                        </div>

                        <pre>{{show}}</pre>
                    </div>
                </modal>
            `,
            computed: {
                devices() {
                    return this.$store.state.devices;
                },
                configs() {
                    return this.$store.state.configs;
                },
            },
            methods: {
                Open(){
                    this.visible = true;
                },
                Close(){
                    this.visible = false;
                    this.$emit("closed");
                },
                Action(action, type, device){
                    this.processing = true;
                    this.error = false;
                    
                    return store.dispatch('CONFIGS', {action, type, device}).catch((err) => {
                        this.error = String(err);
                    }).finally(() => {
                        this.processing = false;
                    })
                },
                Update(type, device){
                    return this.Action("update", type, device);
                },
                Load(type, device){
                    return this.Action("load", type, device);
                }
            }
        },
        'gns_load_modal': {
            props: ['opened'],
            watch: { 
                opened: function(newVal, oldVal) {
                    if(!oldVal && newVal) {
                        this.Open();
                    }
                    
                    if(oldVal && !newVal) {
                        this.Close();
                    }
                }
            },
            data: () => ({
                visible: false,
                step: 1,
                error: false,

                login: {},
                projects: {},
                project_nodes: {},
                project_links: {}
            }),
            template: `
                <modal v-if="visible" v-on:close="Close()">
                    <template v-if="step == 1">
                        <div slot="header">
                            <h1 class="mb-3"> Login to GNS </h1>
                        </div>
                        <div slot="body" class="form-horizontal">
                            <div class="form-group row">
                                <label class="col-sm-4 col-form-label">URL</label>
                                <div class="col-sm-8">
                                    <input type="text" class="form-control" v-model="login.url">
                                </div>
                            </div>
                            <div class="form-group row">
                                <label class="col-sm-4 col-form-label">Username</label>
                                <div class="col-sm-8">
                                    <input type="text" class="form-control" v-model="login.name">
                                </div>
                            </div>
                            <div class="form-group row">
                                <label class="col-sm-4 col-form-label">Password</label>
                                <div class="col-sm-8">
                                    <input type="text" class="form-control" v-model="login.pass">
                                </div>
                            </div>
                            <div class="alert alert-danger" v-if="error"> {{ error }} </div>
                        </div>
                        <div slot="footer">
                            <button v-on:click="Action()" class="btn btn-success">Next &gt;</button>
                            <button v-on:click="Close()" class="btn btn-secondary">Cancel</button>
                        </div>
                    </template>

                    <template v-if="step == 2">
                        <div slot="header">
                            <h1 class="mb-3"> Select Project  </h1>
                        </div>
                        <div slot="body" class="form-horizontal">
                            <div class="text-center">
                                <template v-for="{name, status, project_id} in projects">
                                    <button class="btn m-2" :class="status == 'opened' ? 'btn-success' : 'btn-outline-success'" @click="Action(project_id)">{{ name }} ({{ status }})</button>
                                </template>
                            </div>
                        </div>
                        <div slot="footer">
                            <button v-on:click="step = 1" class="btn btn-secondary">&lt; Back</button>
                        </div>
                    </template>

                    <template v-if="step == 3">
                        <div slot="header">
                            <h1 class="mb-3"> Parsed data  </h1>
                        </div>
                        <div slot="body" class="form-horizontal">
                            <h5>Devices</h5>
                            <ul>
                                <li v-for="node in project_nodes" v-if="node.console_type == 'telnet'">
                                    {{ node.name }} @ {{ node.console_host }}:{{ node.console }}
                                </li>
                            </ul>
                        </div>
                        <div slot="footer">
                            <button v-on:click="Action()" class="btn btn-success">Add Devices</button>
                            <button v-on:click="step = 2" class="btn btn-secondary">&lt; Back</button>
                        </div>
                    </template>
                </modal>
            `,
            mounted() {
                this.$set(this, 'login', this.$store.state.gns.login);
            },
            methods: {
                Open(){
                    document.body.style.overflow = "hidden";
                    this.visible = true;
                },
                Close(){
                    document.body.style.overflow = "auto";
                    this.visible = false;
                    this.$emit("closed");
                },
                Action(input = null){
                    if(this.step == 1) {
                        if(/\/\/(.*):(.*)@/.test(this.login.url)) {
                            var m = this.login.url.match(/\/\/(.*):(.*)@/)
                            this.login.name = m[1];
                            this.login.pass = m[2];

                            this.login.url = this.login.url.replace(/\/\/(.*):(.*)@/, "//")
                        }

                        this.$store.commit('GNS_LOGIN', this.login)
                        this.$store.dispatch("GNS_API", "/v2/projects").then((res) => {
                            if(res.error === true) {
                                this.error = res.message;
                                return;
                            }

                            this.$set(this, 'projects', res.data)
                            this.step = 2;
                        })
                        return ;
                    }
                    if(this.step == 2) {
                        this.$store.commit("GNS_PUT", {
                            key: 'project',
                            data: this.projects.find(p => p.project_id == input)
                        });

                        Promise.all([
                            this.$store.dispatch("GNS_API", "/v2/projects/" + input + "/nodes"),
                            this.$store.dispatch("GNS_API", "/v2/projects/" + input + "/links")
                        ]).then((responses) => {
                            // Catch errors
                            for (const res of responses) {
                                if(res.error === true) {
                                    this.error = res.message;
                                    return;
                                }
                            }

                            this.$set(this, 'project_nodes', responses[0].data)
                            this.$set(this, 'project_links', responses[1].data)
                            this.$store.commit("GNS_PUT", {
                                key: 'project_nodes',
                                data: this.project_nodes
                            });
                            this.$store.commit("GNS_PUT", {
                                key: 'project_links',
                                data: this.project_links
                            });
        
                            this.step = 3;
                        })
                    }
                    if(this.step == 3) {
                        // DEVICES
                        var devs = [];
                        var ports = {};
                        
                        var node_ports = {};
                        for(var node of this.project_nodes) {
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
                        this.$store.commit("GNS_PUT", {
                            key: 'ports',
                            data: ports
                        });

                        // LINKS
                        var links = [];
                        for(var link of this.project_links) {
                            //link.link_id
                            //link.link_type
                            var nodes = link.nodes.map(node => {
                                return node_ports[node.node_id][node.adapter_number + "_" + node.port_number];
                            })

                            links.push(nodes);
                        }
                        this.$store.commit("GNS_PUT", {
                            key: 'links',
                            data: links
                        });

                        this.$store.dispatch("DEVICES_PUT", devs).then(() => {
                            this.Close()
                        })
                    }
                }
            }
        }
    }
})
