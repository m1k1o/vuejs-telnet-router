Vue.component('devices', {
    data: () => ({
        input: "",
        new_device_modal: false
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
            </div>

            <device_modal
                :opened="new_device_modal"
                @closed="new_device_modal = false"
            />
        </div>
    `,
	computed: {
		devices() {
			return this.$store.state.devices;
		}
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
        }
    }
})
