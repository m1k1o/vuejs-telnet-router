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

        interfaces: {}
    }),
    template: `
        <modal v-if="visible" v-on:close="Close()" style="color:black;">
            <div slot="header">
                <h1 class="mb-3"> Interfaces </h1>
            </div>
            <div slot="body" class="form-horizontal">
                <table class="table" v-if="build.length == 0">
                    <template v-for="(interfaces, device_name) in interfaces">
                        <tr>
                            <td colspan="4">
                                <h3 class="mb-0">{{ device_name }}</h3>
                            </td>
                        </tr>
                        <tr v-for="(iface, iface_name) in interfaces" class="my-2" :class="{
                            'table-success': iface.running,
                            'table-secondary': !iface.ip_address
                        }">
                            <td><span class="form-control-plaintext">{{ iface_name }}</span></td>
                            <td><input class="form-control" type="text" v-model="iface.ip_address" placeholder="IP"></td>
                            <td><input class="form-control" type="text" v-model="iface.mask" placeholder="Mask"></td>
                            <td><input type="checkbox" value="1" v-model="iface.running" class="form-check-input"> Running</td>
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
		running_config() {
			return this.$store.state.configs.running_config;
		}
	},
    methods: {
        Open(){
            var interfaces = {};
            Object.keys(this.running_config).map((key, index) => {
                interfaces[key] = this.running_config[key].interfaces;
            });
            
            this.$set(this, 'interfaces', interfaces);
            this.build = [];
            this.visible = true;
        },
        Close(){
            this.visible = false;
            this.$emit("closed");
        },
        Action(){
			this.$store.dispatch("EXECUTE", this.build)
            this.Close();
        },
        Build(){
            var result = [];
            for (const device_name in this.interfaces) {
                var device_ifaces = this.interfaces[device_name];

                var cmds = "";
                for (const iface_name in device_ifaces) {
                    var iface = device_ifaces[iface_name];

                    if(!iface.ip_address || !iface.mask) continue;

                    cmds += 
                        "int "+iface_name+"\n"+
                        "ip add "+iface.ip_address+" "+iface.mask+"\n"+
                        (!iface.running ? '' : 'no ')+"sh\n" +
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
