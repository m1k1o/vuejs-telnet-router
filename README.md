# vuejs-telnet-router
Telnet client for sending batch commands to (cisco) routers written in Vue.js and Node.js.

**EXPERIMENTAL**: Should not be used in Production.

![Screenshot](Screenshot.png?raw=true "Screenshot")

## How to run using docker
Build docker image using:
```
docker build --tag vuejs-telnet-router .
```

And then run your image:
```
docker run -p 8080:8080 vuejs-telnet-router
```

Navigate browser to `http://localhost:8080`.

## Features
* Connect to GNS.
* Load running configs.
* View your GNS project with running-config data at one place.
