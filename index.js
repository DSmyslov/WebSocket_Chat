const express = require('express')
const queryString = require('query-string')
const websocket = require('./ws')

const app = express()

app.use(express.static(__dirname + '/public'));

const port = process.env.PORT || 8080

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/pages/StartPage.html')
})

app.get('/chat', (req, res) => {
    const [_path, params] = req.url.split("?");
    const connectionParams = queryString.parse(params);
    if (connectionParams.id === '0' || connectionParams.id === '1') res.sendFile(__dirname + '/public/pages/ChatPage.html')
    else res.send('Такого пользователя нет')
})

const server = app.listen(port, () => {
    console.log(`сервер запущен на ${port} порту`);
    console.log(`http://localhost:${port}/`)
})

websocket(server)