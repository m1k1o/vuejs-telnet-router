const store = new Vuex.Store({
    state: {

    },
    mutations: {
        INITIALIZE(state, data) {
            Object.assign(state, data);
            state.running = true;
        },
        STOP(state) {
            state.running = false;
        }
    },
    getters: {
        
    },
    actions: {
        INITIALIZE({commit}) {
            return ajax("Global", "Initialize")
            .then((data) => commit('INITIALIZE', data));
        }
    }
})
