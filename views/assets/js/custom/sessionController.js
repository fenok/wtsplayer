var wtsplayer = wtsplayer || {};

wtsplayer.sessionController = function()
{
	this.externals = {};

	var _self = this;

	this.vars = Object.freeze( {
		PASSWORD : 0,
		ROOM_ID  : 1,
		NICK     : 2
	} );

	var _session = {};

	function initSession()
	{
		if ( window.name ) //Session has been set before
		{
			_session = JSON.parse( window.name );
			//To be sure that roomID is set according to URL
			_session[_self.vars.ROOM_ID] = location.pathname.indexOf( 'room' ) === -1 ? null : location.pathname.substr( 6 );
			window.name     = JSON.stringify( _session );
		}
		else //New session
		{
			_session[_self.vars.PASSWORD] = '';
			//If the client is on (hostname)/room/..., we know the roomID as a part of url (...).
			//null otherwise
			_session[_self.vars.ROOM_ID] = location.pathname.indexOf( 'room' ) === -1 ? null : location.pathname.substr( 6 );
			window.name = JSON.stringify( _session );
		}
	}

	this.set = function(what, data)
	{
		_session[what] = data;
		window.name       = JSON.stringify( _session );
	};

	this.get = function(what)
	{
		return _session[what];
	};

	initSession();
};