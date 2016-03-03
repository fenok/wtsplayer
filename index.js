var server = require("./server");
var uuid = require('node-uuid');

var rooms = {}; // roomID : peerID list
var peers = {}; // peerID : roomID
var passwords = {}; // roomID : password

server.on('peerConnection', function(id)
{
	console.log('connection: '+id);
});
server.on('peerDisconnect', function(id)
{
	console.log('disconnect: '+id);
	if (id in peers)
	{
		var roomID = peers[id];
		var array = rooms[roomID];
		array.splice(array.indexOf(id), 1);
		if (array.length == 0)
		{
			delete rooms[roomID];
			delete passwords[roomID];
			console.log('room '+roomID+' deleted');
		}
		delete peers[id];
	}
});

server.on('getPswdNotEmpty', function(req, res)
{
	console.log('getPswdNotEmpty');
	res.json( passwords[ req.query.roomID ] === undefined ? false : passwords[ req.query.roomID ] !== '' );
});

server.on('getRoomID', function(req, res)
{
	console.log('getRoomID');
	res.json(getRandomRoomID());
});

server.on('joinRoom', function(req, res)
{
	var peerID = req.query.peerID;
	var roomID = req.query.roomID;
	var password = req.query.password;
	if (peerID in this.peerServer._clients['peerjs'])
	//this PeerID is registered internally
	//bad style but whatever
	{
		if (roomID in rooms) //room exists, join
		{
			if (passwords[roomID] === password) //can join
			{
				if (peerID in peers)
				{
					res.json({type:'joinedBefore'});
					console.log('joinedBefore');
				}
				else
				{
					res.json({type:'joined', peers:rooms[roomID]}); // return all current peers and add new peer
					
					peers[peerID] = roomID;
					rooms[roomID].push(peerID);
					/*rooms[roomID].forEach(function(item, i, arr)
					{
						console.log( i + ": " + item + " (массив:" + arr + ")" );
					});*/
					
					console.log('joined');
				}
			}
			else //go fuck yourself
			{
				res.json({type:'wrongPassword'});
				console.log('wrongPassword');
			}
		}
		else //create room
		{
			peers[peerID] = roomID;
			rooms[roomID] = [peerID];
			passwords[roomID] = req.query.password;
			res.json({type:'created'});
			console.log('created');
		}
	}
});

function getRandomRoomID()
{
	return uuid.v1();
}