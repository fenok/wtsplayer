For some reason the original peerJS server wasn't able to emit 'connection'. PeerJS server was improved a bit to emit 'clientAdded' and 'clientRemoved' events. Now it is in the 'temp' folder cuz peerJS from npm seems to work fine now =/

peer.js manually updated to the latest version with wsport support (25.12.2015)

npm install express --save
npm install timesync --save
npm install peer --save
npm install node-uuid --save
npm install ejs --save

remember that OpenShift works on 8000 port!