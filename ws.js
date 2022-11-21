const WebSocket = require('ws')
const queryString = require('query-string')

//Структура для хранения вебсокетов пользователей
const current_connections = new Map();

async function websocket (expressServer) {
    //создаем сервер websocket
    const websocketServer = new WebSocket.Server({
        noServer: true,
        path: "/websockets",
    });

    // ловим обновление http сервера
    expressServer.on("upgrade", (request, socket, head) => {
        websocketServer.handleUpgrade(request, socket, head, (websocket) => {
            //вызываем подключение
            websocketServer.emit("connection", websocket, request);
        });
    });

    // создаем подключение по websocket
    websocketServer.on(
        "connection",
        function connection(websocketConnection, connectionRequest) {
            // получаем параметры запроса
            const [_path, params] = connectionRequest?.url?.split("?");
            const user_id = params.match(/id=(\d+)/)[1] - 0;

            /** получить параметры запроса бывает важно, например, когда вы хотите сделать запрос авторизованным */
            // console.log(connectionParams);

            //Добавляем данный вебсокет соединение с пользователем в список
            if (user_id) {
                console.log(`Новое websocket соединение установлено для пользователя с id: ${user_id}`)
                current_connections.set(user_id, websocketConnection);
            }
            else {
                websocketConnection.send(JSON.stringify({message: 'Вы не авторизованы'}));
                websocketConnection.close(1000,JSON.stringify({message: 'Соединение закрыто'}));
            }

            //после подключения отправляем юзеру приветсвенное сообщение
            websocketConnection.send(JSON.stringify({message: 'WebSocket соединение установлено'}));

            //обработчик полученных сообщений, обратите внимание, что тело запроса приходит в json, поэтому его нужно предварительно распарсить
            websocketConnection.on("message", (message) => {
                const parsedMessage = JSON.parse(message);
                console.log(parsedMessage);
                current_connections.get(parsedMessage.to_user)
                .send(JSON.stringify({ message: parsedMessage.message }));
            });
        }
    );

    return websocketServer;
};

module.exports = websocket