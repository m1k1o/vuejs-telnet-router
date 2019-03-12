async function vuejs_telnet_router(Initialize, base_path = "") {
    var loadJS = function(url){
        return new Promise((resolve, reject) => {
            var scriptTag = document.createElement('script');
            scriptTag.src = url;
    
            scriptTag.onload = resolve;
            scriptTag.onreadystatechange = resolve;
    
            document.body.appendChild(scriptTag);
        })
    }
    
    var resources = [
        'libs/vue.js',
        'libs/vuex.js',
        'libs/socket.io.js',
    
        'components/modal.js',
        'components/connect.js',
        'components/devices.js',
        'components/terminal.js',
        'components/gns.js',
        
        'components/interfaces.js',
        'components/interfaces_old.js',

        'configs/gns_project.js',
        'configs/gns_link.js',
        'configs/gns_node.js',
        
        'store.js',
        'app.js'
    ];

    for(const resource of resources) {
        await loadJS(base_path+resource)
    }

    await Initialize();
}
