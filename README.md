# Drone Management Server

This is software for a server that collects data from connected drones, analyses this with the aid of IBM cloud services, and can then send return commands to the drones.

It also contains a dashboard for clients to interact with, to view live and legacy data, and change drone settings.

Installation steps for dependencies differ for each system, so no automatic installation script is provided. Follow the steps below:

## To Run the server locally

1. Install [Node.js](https://nodejs.org/en/download/) and npm
2. <code>git clone -b multidrone https://github.com/jake2184/drone.git</code>
3. cd into the app directory
4. Run `npm install` to install the app's dependencies. Note some of these require a C/C++ compilation environment, see [node-gyp](https://github.com/nodejs/node-gyp). An additional installation script to generate documentation is called with `bash install.sh`. This either requires a bash environment to be set up, or the lines inside the script can be run manually.
If neither of these happen, the server still functions but no static files will work (documentation or dashboard)
5. Run `npm start` to start the app
6. Access the running app in a browser at http://localhost:8080

## To Run on Bluemix
1. Create a [Bluemix](https://console.ng.bluemix.net/registration/) account
2. Push the app using [Cloud Foundry](https://github.com/cloudfoundry/cli). Instructions for this are found on the Bluemix dashboard, under 'Start Coding'
3. (Optional) Use devOps to create a pipeline. Again, instructions are found in the top right of Bluemix Dashboard


=======

The server supports a static dashboard, which can be found at http://localhost:8080/dashboard/app.
The server has an API available, which is how the majority of devices connect. Once the server is running, API documentation should be available at http://localhost:8080/documentation/api/index.html

=======

## Configuration and Credentials

The server relies on a set of IBM cloud services. These are:
- Visual Recognition
- Speech To Text
- Cloudant
- DashDB
- Internet Of Things MQTT

Without credentials for these services (automatic in the cloud, otherwise saved in node_modules/vcap_services/VCAP_SERVICES.JSON) the server will throw an error and not start.

The SQL database, DashDB, needs prior configuration before use. The tables must be defined before the system will operate correctly. SQL table definitions are provided in this repository.

Although new users and drones can be added through the api, a first admin user must be created manually through the database dashboard. This will allow the admin user to be authorised, and hence allowed access to the POST api endpoints.

