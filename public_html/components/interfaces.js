Vue.component('interfaces', {
    props: ['opened', 'routers'],
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
                    <template v-for="(router, router_name) in routers">
                        <tr>
                            <td colspan="4">
                                <button class="btn btn-success float-right" @click="AddIface(router_name)" tabindex="-1">+</button>
                                <h3 class="mb-0">{{ router_name }} <small>{{ router.host }}:{{ router.port }} ({{ router.status }})</small></h3>
                            </td>
                        </tr>
                        <tr v-for="(iface, iface_name) in data[router_name]" class="my-2">
                            <td><button class="btn btn-danger" @click="$delete(data[router_name], iface_name)" tabindex="-1">X</button></td>
                            <td><span class="form-control-plaintext">{{ iface_name }}</span></td>
                            <td><input class="form-control" type="text" v-model="iface.ip" placeholder="IP"></td>
                            <td><input class="form-control" type="text" v-model="iface.mask" placeholder="Mask"></td>
                        </tr>
                    </template>
                </table>
                <template v-for="cmd in build">
                    <h3>{{ cmd.to }}</h3>
                    <pre>{{ cmd.data }}</pre>
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
    methods: {
        AddIface(router_name) {
            var iface_name = prompt("What name do you wish new interface should have?", "fa0/3");
            if (iface_name != null) {
                this.$set(this.data[router_name], iface_name, { ...this.iface });
            }
        },
        Open(){
            var iface = { ip: '', mask: '' };

            var ifaces = {};
            for (const router in this.routers) {
                ifaces[router] = {
                    "fa0/0": { ...this.iface },
                    "fa0/1": { ...this.iface }
                };
            }

            this.$set(this, 'data', ifaces);
            this.visible = true;
        },
        Close(){
            this.visible = false;
            this.build = [];
            this.$emit("closed");
        },
        Action(){
            this.$emit("execute", this.build);
            this.Close();
        },
        Build(){
            var result = [];
            for (const router_name in this.data) {
                var router_ifaces = this.data[router_name];

                var cmds = "";
                for (const iface_name in router_ifaces) {
                    var iface = router_ifaces[iface_name];

                    if(!iface.ip || !iface.mask) continue;

                    cmds += 
                        "int "+iface_name+"\n"+
                        "ip add "+iface.ip+" "+iface.mask+"\n"+
                        "no sh\n" +
                        "exit\n";
                }

                result.push({
                    data: cmds,
                    to: [router_name]
                });
            }

            this.build = result;
        }
    }
})
