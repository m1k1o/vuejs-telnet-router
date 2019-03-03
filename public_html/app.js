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
				
				<button @click="interfaces = true">Interfaces</button>
			</div>
			<div class="col-6">
				<terminal />
			</div>
		</div>
		
		<interfaces
			:opened="interfaces"
			@closed="interfaces = false"
		></interfaces>
	</div>
	`,
    data: () => ({
        interfaces: false,
        batch: ''
	}),
	computed: {
		devices() {
			return this.$store.state.devices;
		},
		running() {
			return this.$store.state.running;
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
