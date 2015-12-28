//We recommend keeping track of connections yourself rather than relying on this [peer.connections] hash.
//Okay!
var dataConnections = {};
var onCanSendStates = new Event('onCanSendStates'); //fired when connected to all peers after join
document.addEventListener('onCanSendStates', function(e)
{
	canSendStates = true;
	//alert("can!");
})
var canSendStates = false;
var peer = new Peer('', {
							host: location.hostname,
							port: location.port || (location.protocol === 'https:' ? 443 : 8000),
							path: '/peerjs',
							debug: 3
						})
						
peer.on('open', function(id)
{
	joinRoom();
	outputSystemMessage("Your id is: "+id);
});

peer.on('connection', function(conn)
{
	connectionHandler(conn);
	conn.on('open', function ()
	{
		//var data = {type:'initialStateSync', };
		//conn.send();
	});
});

$("#retryButton").on('click', function()
{
	session.password = $("#passwordInput").val();
	window.name = JSON.stringify(session);
	joinRoom();
});

function joinRoom()
{
	$.ajax(
	{
		url: "/joinRoom?roomID="+encodeURIComponent(session.roomID)+"&password="+encodeURIComponent(session.password)+"&peerID="+encodeURIComponent(peer.id),
		dataType : "json",
		success: function(data)
		{
			switch (data.type)
			{
				case 'created':
					outputSystemMessage("Room created");
					canSendStates = true;
					break;
				case 'joined':
					outputSystemMessage("Joined room");
					var peersInRoomCount = data.peers.length;
					outputSystemMessage(peersInRoomCount.toString());
					data.peers.forEach(function(value, index, array)
					{
						if (value !== peer.id)
						{
							outputSystemMessage(value.toString());
							var conn = peer.connect(value, {serialization:'json'});
							outputSystemMessage(conn.toString());
							connectionHandler(conn);
							conn.on('open', function ()
							{
								--peersInRoomCount;
								if (peersInRoomCount === 0)
								{
									//canSendStates = true;
									document.dispatchEvent(onCanSendStates);
									outputSystemMessage("Connected to all peers");
								}
							});
							conn.on('error', function()
							{
								--peersInRoomCount;
								if (peersInRoomCount === 0)
								{
									document.dispatchEvent(onCanSendStates);
									outputSystemMessage("Connected to all peers");
								}
							});
						}
						else
						{
							outputSystemMessage("self detected");
							--peersInRoomCount;
							if (peersInRoomCount === 0)
							{
								//canSendStates = true;
								document.dispatchEvent(onCanSendStates);
								outputSystemMessage("Connected to all peers");
							}
						}
					})
					break;
				case 'joinedBefore':
					outputSystemMessage("Already joined");
					break;
				case 'wrongPassword':
					outputSystemMessage("Wrong password");
					break;
				default:
					alert('Unrecognized response');
					break;
			}
		}
	});
}

function outputMessage(data)
{
	var div = document.createElement('div');
	div.textContent=data.nick+": "+data.message+" -- "+currentTimestamp();
	document.getElementById("chat").appendChild(div);
}

function outputSystemMessage(message)
{
	var div = document.createElement('div');
	div.textContent=message;
	document.getElementById("chat").appendChild(div);
}

function connectionHandler(conn)
{
	conn.on('open', function()
	{
		dataConnections[conn.peer]=conn;
		outputSystemMessage("Connected to "+conn.peer);
		conn.on('data', function(data)
		{
			//alert('connection recieved'+data);
			switch (data.type)
			{
				case 'message':
					outputMessage(data);
					break;
				case 'stateChangedNotification':
					playerStateController.updateCurrentState(data.state);
					break;
				default:
					alert('Unrecognized data');
					break;
			}
		});
	});
	
	conn.on('close', function()
	{
		delete dataConnections[conn.peer];
		outputSystemMessage("Closed connection to " + conn.peer);
	});
	
	conn.on('error', function (err)
	{
		outputSystemMessage("Failed to connect to " + conn.peer + " with error " + err.name + ": " + err.message);
	});
}

$("#sendMessageButton").on('click', function()
{
	var data = {type:'message', nick:session.nick||peer.id||"You", message:$("#messageInput").val()+" -- "+currentTimestamp()};
	for (var prop in dataConnections)
	{
		dataConnections[prop].send(data);
	}
	outputMessage(data);
});