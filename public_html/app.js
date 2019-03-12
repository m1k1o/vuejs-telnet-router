Vue.component('telnet-router', {
	store,
	template: `
	<div v-if="!running" id="telnet-router" class="py-2">
		<connect />
	</div>
	<div v-else-if="workspace != 'default'" id="telnet-router" style="position: relative;">
		<button style="position:absolute;left:0;top:0;z-index:100;" @click="$store.commit('SET_WORKSPACE')">&lt; Back</button>
		<compnent :is="workspace" />
	</div>
	<div v-else id="telnet-router" class="container-fluid py-2">
		<div class="row">
			<div class="col-6">
				<h1>Devices</h1>
				<devices />

				<h1>Batch</h1>
				<textarea class="batch" v-model="batch" rows="5"></textarea>
				<div class="mb-2">
					<button class="btn btn-light" @click="SendBatch()">Send to All</button>
				</div>
				
				<gns />
				
				<button class="btn btn-light" @click="gui.interfaces = true" :disabled="!is_running_config">Interfaces</button> <span v-if="!is_running_config">Needs running config...</span>
			</div>
			<div class="col-6">
				<terminal />
			</div>
		</div>
		
		<interfaces
			:opened="gui.interfaces"
			@closed="gui.interfaces = false"
		></interfaces>
	</div>
	`,
    data: () => ({
		gui: {
			interfaces: false
		},
        batch: ''
	}),
	computed: {
		workspace() {
			return this.$store.state.workspace;
		},
		devices() {
			return this.$store.state.devices;
		},
		running() {
			return this.$store.state.running;
		},
		configs() {
			return this.$store.state.configs;
		},
		is_running_config(){
			return this.$store.getters.is_running_config;
		}
	},
    methods: {
        SendBatch() {
			this.$store.dispatch("EXECUTE", this.batch)
        }
	},
	mounted() {
		this.$store.dispatch('INIT')
	}
});
