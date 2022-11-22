const WebSocket = require('ws')
const queryString = require('query-string')

//Структура для хранения подключений пользователей
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

            //Добавляем данное соединение с пользователем в список
            if (current_connections.get(user_id)) {
                current_connections.get(user_id).push(websocketConnection)
            }
            else {
                current_connections.set(user_id, [websocketConnection])
            }

            // console.log(current_connections)

            //обработчик полученных сообщений, обратите внимание, что тело запроса приходит в json, поэтому его нужно предварительно распарсить
            websocketConnection.on("message", message => {
                const server_timestamp = Date.now()
                const parsedMessage = JSON.parse(message);
                console.log(parsedMessage);
                let data_to_send =  {};
                if (parsedMessage.type == 'changeMessageStatus') {
                    data_to_send = parsedMessage;
                }
                else {
                    parsedMessage.server_timestamp = server_timestamp;
                    parsedMessage.status = 'Принято сервером';
                    data_to_send = parsedMessage;
                }
                if (current_connections.get(parsedMessage.to)) {
                    current_connections.get(parsedMessage.to).forEach(websocket => {
                        websocket.send(JSON.stringify(data_to_send));                        
                    });
                }
                else {
                    // как-то сохранить сообщение и отправить потом
                }
                if (current_connections.get(1 - parsedMessage.to)) {
                    current_connections.get(1 - parsedMessage.to).forEach(websocket => {
                        websocket.send(JSON.stringify(data_to_send));                        
                    });
                }
                else {
                    // как-то сохранить сообщение и отправить потом
                }
            });
        }
    );

    return websocketServer;
};

module.exports = websocket