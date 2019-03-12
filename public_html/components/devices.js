Vue.component('devices', {
    data: () => ({
        input: "",

        new_device_modal: false,
        configs_modal: false
    }),
    template: `
        <div>
            <ul>
                <li v-for="(device, name) in devices" class="py-1">
                    <button class="btn btn-light btn-sm" @click="Remove(name)">X</button>
                    {{ name }} @ {{ device.host }}:{{ device.port }} ({{ device.status }})
                </li>
            </ul>

            <div class="mb-2">
                <button class="btn btn-light" @click="new_device_modal = true">+ Add Device</button>
                <button class="btn btn-light" @click="AutoAdd()">+ Auto Add</button>
                <button class="btn btn-light" @click="configs_modal = true">Configs</button>
            </div>

            <device_modal
                :opened="new_device_modal"
                @closed="new_device_modal = false"
            />

            <configs_modal
                :opened="configs_modal"
                @closed="configs_modal = false"
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
                        <h1 class="mb-0"> Configs <button class="btn btn-info" @click="Load()">Load all</button></h1>
                    </div>
                    <div slot="body" class="form-horizontal">
                        <div class="alert alert-info" v-if="processing">Processing...</div>
                        <div class="alert alert-danger" v-if="error">{{ error }}</div>
                        
                        <div v-for="(devices, type) in configs">
                            <div class="py-2">
                                <div class="float-left mr-1">
                                    <button class="btn btn-info btn-sm my-1" @click="Load(type)">Load</button>
                                    <button class="btn btn-success btn-sm my-1" @click="Update(type)">Update</button>
                                </div>
                                <h2>{{ type }}</h2>
                            </div>
                            <ul>
                                <li v-for="(config, device) in devices" class="py-1">
                                    <button class="btn btn-info btn-sm" @click="Load(type, device)">Load</button>
                                    <button class="btn btn-success btn-sm" @click="Update(type, device)">Update</button>
                                    <span @click="show = (show == config ? undefined : config)">{{ device }}</span>
                                </li>
                            </ul>
                        </div>

                        <pre v-if="show"><span v-for="line in show.debug" :class="String(line).startsWith('_________________ ') ? 'text-danger' : 'text-success'">{{ line.replace(/^_________________ /, '') }}\n</span></pre>
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
        }
    }
})
