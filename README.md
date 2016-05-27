# Drone Management Server

This is software for a server that collects data from connected drones, analyses this with the aid of IBM cloud services, and can then send return commands to the drones.

It also contains a dashboard for clients to interact with, to view live and legacy data, and change drone settings.

## To Run the app locally

1. [Install Node.js and npm][]
2. <code>git clone https://github.com/jake2184/drone.git</code>
3. cd into the app directory
4. Run `npm install` to install the app's dependencies
5. Run `npm start` to start the app
6. Access the running app in a browser at http://localhost:8080

## To Run on Bluemix
1. Create a Bluemix account
2. Push the app using cloud foundry
3. (Optional) Use devOps to create a pipeline

[Install Node.js]: https://nodejs.org/en/download/
=======

The server relies on a set of IBM cloud services. These are:
- Visual Recognition
- Speech To Text
- Cloudant
- DashDB
- Internet Of Things MQTT

Without credentials for these services (automatic in the cloud, otherwise saved in node_modules/vcap_services/VCAP_SERVICES.JSON) the server will throw an error and not start.

The server has an API available, which is how the majority of devices connect. Once the server is running, API documentation should be available at /documentation/api/index.html

