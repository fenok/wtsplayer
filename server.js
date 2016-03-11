var events = require( 'events' );
var util   = require( 'util' );

function initServer()
{
	var self = this;
	events.EventEmitter.call( this );
	var server_port       = process.env.OPENSHIFT_NODEJS_PORT || 8000;
	var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

	var express = require( 'express' );
	var app     = express();

	app.use( express.static( './views' ) );
	app.use( express.static( './views/assets/js/original' ) );
	app.use( express.static( './views/assets/js/custom' ) );
	app.use( express.static( './views/assets/css/original' ) );
	app.use( express.static( './views/assets/css/custom' ) );

	app.engine( '.html', require( 'ejs' ).renderFile );
	app.enable( 'trust proxy' );

	app.get( /^\/room\/[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/, function( req, res )
	{
		res.render( 'room.html' );
	} );

	app.get( '/testing', function( req, res )
	{
		res.render( 'testing.html' );
	} );

	app.get( '/', function( req, res, next )
	{
		console.log( "/" );
		//res.sendfile('./public/start.html');
		res.render( 'start.html' );
	} );

	app.get( '/getRoomID', function( req, res )
	{
		self.emit( 'getRoomID', req, res );
	} );
	app.get( '/joinRoom', function( req, res )
	{
		self.emit( 'joinRoom', req, res );
	} );
	app.get( '/getRoomStatus', function( req, res )
	{
		self.emit( 'getRoomStatus', req, res );
	} );
	app.get( '/getPeers', function( req, res )
	{
		self.emit( 'getPeers', req, res );
	} );

	var ExpressPeerServer = require( 'peer' ).ExpressPeerServer;
	var server            = require( 'http' ).createServer( app );
	var expresspeerserver = ExpressPeerServer( server, { debug : true } );

	expresspeerserver.on( 'connection', function( id )
	{
		self.emit( 'peerConnection', id );
	} );
	expresspeerserver.on( 'disconnect', function( id )
	{
		self.emit( 'peerDisconnect', id );
	} );

	this.peerServer = expresspeerserver;

	app.use( '/peerjs', expresspeerserver );

	var timesyncServer = require( 'timesync/server' );
	app.use( '/timesync', timesyncServer.requestHandler );

	server.listen( server_port, server_ip_address );
}
util.inherits( initServer, events.EventEmitter );

module.exports = new initServer();