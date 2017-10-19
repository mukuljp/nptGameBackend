// app.js
var express = require('express');  
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);
var lodash = require("lodash");


app.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});

server.listen(4300); 
var rooms=[];
io.on('connection', function(client) {  
    console.log('Client connected...');

    client.on('createRoom', function(data) {
        console.log(data);
        data.data.gameName= data.data.gameName+"_"+client.id;
        client.room=data.data.gameName;
        client.roomOwner=true;
        
         client.join(data.data.gameName);
         data.data.playerList=[{
         	name:data.data.playerName,
         	id:client.id,
         	rounds:[],
         	votes:[]
         }];
         rooms.push(data.data);
         console.log(rooms);
         var emitData={
         	
         		playerName:data.data.playerName,
         		playerId:client.id,
         		room:data.data,
         		rooms:[]
         	
         }
        client.emit('roomCreated',emitData);
        io.sockets.in("global_room").emit('updatedRooms', {
        	rooms:rooms
        	});
        
    });

    client.on('joinGame', function(data) {
    	console.log(data,"tish");
    	client.room=data.data.gameName;
        client.roomOwner=true;
        client.nameVal=data.data.playerName;
    	client.join("global_room");
        client.emit('clientJoined', {
        	playerName:data.data.playerName,
        	playerId:client.id,
        	room:null,
        	rooms:rooms
        });

    });
    client.on('joinRoom', function(data) {
    	var room=lodash.find(rooms,function(o){
    	   return o.gameName===data.roomName;
    	});

    	console.log(room,"blaa");

    	console.log(data,"tish");

    	if (room.playerList.length<room.maxPlayerCount){
	    	var oldRoom=client.room;
	    	client.leave(oldRoom);
	    	client.join(data.roomName);
	    	client.room=data.roomName;
	    	room.playerList.push({
	    		name:client.nameVal,
	    		id:client.id,
	    			rounds:[],
         			votes:[]
	    	});
	        io.sockets.in(data.roomName).emit('newPlayerJoined', {
	        	room:room
	        	});

	        if (room.playerList.length===room.maxPlayerCount){
	        	console.log("room is now full");
	        	room.gamestarted=true;
	        	room.round=0;
	        	 io.sockets.in(data.roomName).emit('startGame', {
	        	room:room
	        	});
	        	var filteredRooms= lodash.filter(rooms,(obj)=>{
	        	 	
	        	 	return obj.gamestarted!=true;
	        	 });
	        	console.log("tis",filteredRooms);
	        	 io.sockets.in("global_room").emit('updatedRooms', {
	        	rooms:filteredRooms
	        	});
	        }
   		 }

    });


    
 client.on('playerReady', function(data) {
var roomid=data.roomId;
var playerId=data.playerId;
console.log(data,"onplayerready");
var room=lodash.find(rooms,function(o){
    	   return o.gameName===roomid;
    	});

var player=lodash.find(room.playerList,function(o){
    	   return o.id===playerId;
    	});

player.ready=true;
room.startRound=false;
 io.sockets.in(data.roomId).emit('otherPlayerReady', {
	        	
	        	room:room
	        	});

 var playerReadyList=lodash.filter(room.playerList,function(o){
 	return o.ready==true;
 });

 if (playerReadyList.length===room.playerList.length){
 	console.log("let the battleegin");
 	room.round++;
 	room.startRound=true;
 	io.sockets.in(data.roomId).emit('otherPlayerReady', {
	        	 	room:room
	        	});
 }


 });


 client.on('roundData', function(data) {
 	var roomid=data.roomID;
 	var playerId=client.id;
 	

 	var room=lodash.find(rooms,function(o){
    	   return o.gameName===roomid;
    	});
 	var fieldLength=room.fieldNamerray.length;

var player=lodash.find(room.playerList,function(o){
    	   return o.id===playerId;
    	});
player.rounds.push(data.roundData);

var maxrows=room.round*room.playerList.length;

var totalRounds=0;
lodash.each(room.playerList,function(o){
	totalRounds+=o.rounds.length;
});

if (maxrows===totalRounds){
	console.log("let the voting begin");	

    io.sockets.in(roomid).emit('startVoting', {
	        	 	room:room
	        	});

}


 });






    client.on('disconnect', function() {
      console.log('Got disconnect!');

    
   });


});

