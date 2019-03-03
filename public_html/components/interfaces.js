Vue.component('interfaces', {
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
        build: [],

        data: {},
        iface: { ip: '', mask: '255.255.255.0' }
    }),
    template: `
        <modal v-if="visible" v-on:close="Close()" style="color:black;">
            <div slot="header">
                <h1 class="mb-3"> Interfaces </h1>
            </div>
            <div slot="body" class="form-horizontal">
                <table class="table" v-if="build.length == 0">
                    <template v-for="(device, device_name) in devices">
                        <tr>
                            <td colspan="3">
                                <h3 class="mb-0">{{ device_name }} <small>{{ device.host }}:{{ device.port }} ({{ device.status }})</small></h3>
                            </td>
                            <td><button class="btn btn-success" @click="AddIface(device_name)" tabindex="-1">+</button></td>
                        </tr>
                        <tr v-for="(iface, iface_name) in data[device_name]" class="my-2">
                            <td><span class="form-control-plaintext">{{ iface_name }}</span></td>
                            <td><input class="form-control" type="text" v-model="iface.ip" placeholder="IP"></td>
                            <td><input class="form-control" type="text" v-model="iface.mask" placeholder="Mask"></td>
                            <td><button class="btn btn-danger" @click="$delete(data[device_name], iface_name)" tabindex="-1">X</button></td>
                        </tr>
                    </template>
                </table>
                <template v-for="obj in build">
                    <h3>{{ obj.to }}</h3>
                    <pre>{{ obj.cmds }}</pre>
                </template>
            </div>
            <div slot="footer">
                <button v-on:click="Build()" class="btn btn-success" v-if="build.length == 0">Build</button>
                <button v-on:click="Action()" class="btn btn-success" v-if="build.length > 0">Execute</button>
                <button v-on:click="build = []" class="btn btn-info" v-if="build.length > 0">Edit</button>
                <button v-on:click="Close()" class="btn btn-secondary">Cancel</button>
            </div>
        </modal>
    `,
	computed: {
		devices() {
			return this.$store.state.devices;
		},
		running() {
			return this.$store.state.running;
		}
	},
    methods: {
        AddIface(device_name) {
            var iface_name = prompt("What name do you wish new interface should have?", "fa0/3");
            if (iface_name != null) {
                this.$set(this.data[device_name], iface_name, { ...this.iface });
            }
        },
        Open(){
            document.body.style.overflow = "hidden";
            
            var ifaces = {};
            for (const device in this.devices) {
                ifaces[device] = {
                    "fa0/0": { ...this.iface },
                    "fa0/1": { ...this.iface }
                };
            }

            this.$set(this, 'data', ifaces);
            this.visible = true;
        },
        Close(){
            document.body.style.overflow = "auto";
            this.visible = false;
            this.build = [];
            this.$emit("closed");
        },
        Action(){
			this.$store.dispatch("EXECUTE", this.build)
            this.Close();
        },
        Build(){
            var result = [];
            for (const device_name in this.data) {
                var device_ifaces = this.data[device_name];

                var cmds = "";
                for (const iface_name in device_ifaces) {
                    var iface = device_ifaces[iface_name];

                    if(!iface.ip || !iface.mask) continue;

                    cmds += 
                        "int "+iface_name+"\n"+
                        "ip add "+iface.ip+" "+iface.mask+"\n"+
                        "no sh\n" +
                        "exit\n";
                }

                result.push({
                    cmds,
                    to: [device_name]
                });
            }

            this.build = result;
        }
    }
})
