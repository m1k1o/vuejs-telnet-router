// register modal component
Vue.component('modal', {
    props: ['full_width'],
    template: `
        <transition name="modal" @keydown.esc="Close()">
            <div style="color:black;">
                <div class="modal fade show" style="display:block;overflow:auto;" v-on:click.self="Close()">
                    <div class="modal-dialog modal-lg" role="document" :style="full_width ? 'max-width:100%;margin:0;' : ''">
                        <div class="modal-content">
                            <div class="modal-header">
                                <slot name="header">
                                    <h5 class="modal-title">Modal title</h5>
                                </slot>
                                <button type="button" class="close" v-on:click.self="Close()">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <slot name="body">
                                    default body
                                </slot>
                            </div>
                            <div class="modal-footer">
                                <slot name="footer">
                                    <button class="btn btn-secondary" @click="Close()">Close</button>
                                </slot>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-backdrop fade show"></div>
            </div>
        </transition>
    `,
    methods: {
        Close() {
            this.$emit('close');
        }
    },
    mounted() {
        window.addEventListener('keydown', (event) => {
            // If  ESC key was pressed...
            if (event.keyCode === 27) {
                // try close your dialog
                this.Close();
            }
        });
    }
})
