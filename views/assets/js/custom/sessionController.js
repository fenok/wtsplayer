var wtsplayer = wtsplayer || {};

wtsplayer.sessionController = function()
{
	this.externals = {};

	var _self = this;
	
	var _session = {};

	if( window.name ) //Session has been set before
	{
		_session = JSON.parse( window.name );
		//To be sure that roomID is set according to URL
		_session.roomID = location.pathname.indexOf( 'room' ) === -1 ? null : location.pathname.substr( 6 );
		window.name = JSON.stringify( _session );
	}
	else //New session
	{
		_session.password = '';
		//If the client is on (hostname)/room/..., we know the roomID as a part of url (...).
		//null otherwise
		_session.roomID = location.pathname.indexOf( 'room' ) === -1 ? null : location.pathname.substr( 6 );
		//session.nick = undefined;
		window.name = JSON.stringify( _session );
	}

	this.setPassword = function( password )
	{
		_session.password = password;
		window.name = JSON.stringify( _session );
	};

	this.setRoomID = function( roomID )
	{
		_session.roomID = roomID;
		window.name = JSON.stringify( _session );
	};

	this.setNick = function( nick )
	{
		_session.nick = nick;
		window.name = JSON.stringify( _session );
	};
	
	this.getNick = function()
	{
		return _session.nick;
	};

	this.getRoomID = function()
	{
		return _session.roomID;
	};
	
	this.getPassword = function()
	{
		return _session.password;
	};
};