Vue.component('telnet-router', {
	template: `
	<div v-if="!running" id="telnet-router" class="py-2">
		<div class="container py-2">
			<h1> Experimental web-based configurer </h1>
			<div class="form-horizontal">
				<div class="form-group row">
					<label class="col-sm-4 col-form-label">Websocket Url</label>
					<div class="col-sm-8">
						<input type="text" class="form-control" v-model="ws_url">
					</div>
				</div>
				<div class="form-group row">
					<label class="col-sm-4 col-form-label"></label>
					<div class="col-sm-8">
						<button v-on:click="Connect(ws_url)" class="btn btn-success">Connect</button>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div v-else id="telnet-router" class="container-fluid py-2">
		<div class="row">
			<div class="col-6">
				<!--<button @click="socket.emit('restart_routers')" class="float-right">Restart all</button>-->
				<h1>Routers</h1>
				<ul v-for="(router, name) in routers">
					<li>
						<button @click="socket.emit('remove_router', name)">X</button>
						{{ name }} @ {{ router.host }}:{{ router.port }} ({{ router.status }})
						<button v-if="room == name" @click="Room(null)">Unselect</button>
						<span v-if="room == name">selected... </span>
						<button v-else @click="Room(name)">Select</button>
					</li>
				</ul>

				<div class="mb-2">
					<button @click="NewRouter()">+ Add Router</button>
					<button @click="AutoAdd()">+ Auto Add</button>
				</div>

				<h1>Batch</h1>
				<textarea class="batch" v-model="batch" rows="5"></textarea>
				<div class="mb-2">
					<button @click="Send(batch)">Send to All</button>
					<button @click="Send(batch, [room])" :readonly="room == null">Send to Selected</button>
				</div>
				
				<button @click="interfaces_modal = true">Interfaces</button>
			</div>
			<div class="col-6 terminal" ref="terminal">
				<h1>{{ room || '--inactive--' }} terminal</h1>
				<div class="terminal_pre" v-if="room">{{ terminal }}<input class="input" type="test" v-model="input" v-on:keyup.enter="Send(input, [room]);input='';" placeholder="Enter command here"><button @click="Send('\x03', [room]) ">CTRL+C</button></div>
			</div>
		</div>
				
		<modal v-if="new_router"  @close="new_router = false" style="color:black;">
			<div slot="header">
				<h1 class="mb-0"> + Add Router </h1>
			</div>
			<div slot="body" class="form-horizontal">

				<div class="form-group row">
					<label class="col-sm-4 col-form-label">Name</label>
					<div class="col-sm-8">
						<input type="text" class="form-control" v-model="new_router.name">
					</div>
				</div>
				<div class="form-group row">
					<label class="col-sm-4 col-form-label">Host</label>
					<div class="col-sm-8">
						<input type="text" class="form-control" v-model="new_router.host">
					</div>
				</div>
				<div class="form-group row">
					<label class="col-sm-4 col-form-label">Port</label>
					<div class="col-sm-8">
						<input type="text" class="form-control" v-model="new_router.port">
					</div>
				</div>
			</div>
			<div slot="footer">
				<button v-on:click="socket.emit('add_router', new_router);new_router = false;" class="btn btn-success">+ Add Router</button>
				<button v-on:click="new_router = false" class="btn btn-secondary">Cancel</button>
			</div>
		</modal>

		<interfaces_modal
			:routers="routers"

			:opened="interfaces_modal"
			@closed="interfaces_modal = false"
			@execute="Execute($event)"
		></interfaces_modal>
	</div>
	`,
    data: () => ({
        interfaces_modal: false,

        room: null,
        socket: null,

        terminal: "",
        input: '',

        routers: {},
        new_router: false,
		
		ws_url: "ws://127.0.0.1:8090",
        batch: '',
		
		running: false
    }),
    methods: {
        Room(name) {
            this.socket.emit('room', name);
            this.room = name;

            this.terminal = '';
            this.input = '';
        },
        AutoAdd() {
            var total = prompt("How many routers do you wish to add?", "5");
            if (total != null) {
                for(var i = 0; i < total; i++) {
                    this.socket.emit('add_router', {
                        name: "R"+(i+1),
                        host: "127.0.0.1",
                        port: "500"+i
                    });
                }
            }
        },
        NewRouter() {
            this.$set(this, 'new_router', {
                name: "R1",
                host: "127.0.0.1",
                port: "5000"
            });
        },
        Send(data, to = null) {
            console.log("sending", data, "to", to);
            this.socket.emit("data", {
                data, to
            });
        },
        Receive(data) {
            this.terminal += data;
            
			// Auto scroll
            this.$refs.terminal.scrollTop = this.$refs.terminal.scrollHeight;
        },
        Execute(cmds) {
            for (const cmd of cmds) {
                this.Send(cmd.data, cmd.to);
            }
        },
		Connect(url) {
			if(this.socket != null) {
				this.socket.close()
			}
			
			this.socket = io.connect(url);
			this.socket.on("data", (data) => this.Receive(data));
			this.socket.on("routers", (routers) => this.routers = routers);
			this.socket.on("connect", () => this.running = true);
			this.socket.on("disconnect", () => this.running = false);
        }
    },
    mounted() {},
    components: {
        'interfaces_modal': {
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
        },
    }
});
