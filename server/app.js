

const express = require('express');
const cors = require('cors')
const history = require('connect-history-api-fallback');
const mongoose = require('mongoose')
const { getUser, getUsersInRoom, addUser, deleteUser  } = require('./users')

const app = express()

const http = require('http').createServer(app);

const io = require("socket.io")(http, {
    cors: {
      origin: "http://localhost:8080",
      methods: ["GET", "POST"]
    }
});

if(process.env.NODE_ENV === 'production') {
  //static folder
  app.use(express.static(__dirname + '/public'))

  // //handle SPA
  // app.get(/.*/, (req, res) => res.sendFile(__dirname, '/public/index.html'));
  
  app.use(history(
    {
      index: '/index.html'
    }
  ));
  app.use(express.static(__dirname + '/public'))
}

const PORT = process.env.PORT || 5000

app.use(cors())
app.disable('x-powered-by')

io.on('connection', async(socket) => {
   
      //when a user joins a room
      socket.on('newUser',  async ({ username, chatroom }, callback) => {

        const { error, user} = addUser({
          id: socket.id,
          username,
          chatroom
        })

        if(error) {
          return callback(error)
        }

        if(user !== undefined) {
          socket.emit('adminMsg', {user: `admin`, msg: `Hey ${user.username}, welcome to the ${user.chatroom} room`})

          socket.to(user.chatroom).emit('adminMsg', {user: `admin`, msg: `${user.username} joined the room`})

          socket.join(user.chatroom)
        }

        callback()
      }) 

      socket.on('clientMsg', async(msg, callback) => {
        const user = getUser(socket.id)

        if(user !== undefined) {
          io.to(user.chatroom).emit('clientMessage', { user: user.username, msg })
        } else {
          console.log(`page disconnected`)
          return callback('User disconnected please refresh page')
        }

        callback()

      })
      
      //when a user leaves a room or disconnects
      socket.on('disconnect', async() => {
        const user = getUser(socket.id)

        if(user !== undefined) {
          socket.to(user.chatroom).emit('adminMsg', { user: 'admin', msg: `${user.username} left the room` })
        }

        deleteUser(socket.id)
      })
})

http.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
