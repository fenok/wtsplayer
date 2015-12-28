var session = {};

if(window.name) //session has been set before
{
	session = JSON.parse(window.name);
	//sanity
	session.roomID = location.pathname.indexOf("room") === -1 ? null : location.pathname.substr(6);
	window.name = JSON.stringify(session);
}
else //fresh session
{
	session.password = '';
	//if the client is on (hostname)/room/..., we know the roomID as a part of url (...).
	//null otherwise
	session.roomID = location.pathname.indexOf("room") === -1 ? null : location.pathname.substr(6);
	//session.nick = undefined;
	window.name = JSON.stringify(session);
}

var sessionHandler = {}; //so we don't stringify it

sessionHandler.setPassword = function(password)
{
	session.password = password;
	window.name = JSON.stringify(session);
}

sessionHandler.setRoomID = function(roomID)
{
	session.roomID = roomID;
	window.name = JSON.stringify(session);
}

sessionHandler.setNick = function(nick)
{
	session.nick = nick;
	window.name = JSON.stringify(session);
}