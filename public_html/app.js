Vue.component('telnet-router', {
	store,
	template: `
	<div v-if="!running" id="telnet-router" class="py-2">
		<connect />
	</div>
	<div v-else id="telnet-router" class="container-fluid py-2">
		<div class="row">
			<div class="col-6">
				<h1>Devices</h1>
				<devices />

				<h1>Batch</h1>
				<textarea class="batch" v-model="batch" rows="5"></textarea>
				<div class="mb-2">
					<button @click="SendBatch()">Send to All</button>
				</div>
				
				<gns />
				
				<button @click="gui.interfaces_old = true">Interfaces (old)</button>
				<button @click="gui.interfaces = true" :disabled="!is_running_config">Interfaces</button> <span v-if="!is_running_config">Needs running config...</span>
			</div>
			<div class="col-6">
				<terminal />
			</div>
		</div>

		<interfaces_old
			:opened="gui.interfaces_old"
			@closed="gui.interfaces_old = false"
		></interfaces_old>
		
		<interfaces
			:opened="gui.interfaces"
			@closed="gui.interfaces = false"
		></interfaces>
	</div>
	`,
    data: () => ({
		gui: {
			interfaces_old: false,
			interfaces: false
		},
        batch: ''
	}),
	computed: {
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
