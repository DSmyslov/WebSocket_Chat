const WebSocket = require('ws')
const queryString = require('query-string')

// структура для хранения текущих подключений пользователей и соотв. очередей
const current_connections = new Map();

// структура для сохранения сообщений, в случае отсутствия подключения кого-либо
const Queues = [new Set(), new Set()];


async function websocket (expressServer) {
    // создаем websocket сервер
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

    // создаем и сохраняем подключение по websocket
    websocketServer.on(
        "connection",
        function connection(websocketConnection, connectionRequest) {
            // получаем параметры запроса для авторизации websocket соединения
            const [_path, params] = connectionRequest?.url?.split("?");
            const user_id = params.match(/id=(\d+)/)[1] - 0;

            // console.log(`Пользователь с ID: ${user_id} пытается установить websocket соединение`);

            //Добавляем данное соединение с пользователем в список
            if (current_connections.has(user_id)) {
                current_connections.get(user_id).set(websocketConnection, new Set(Queues[user_id]))
            }
            else {
                current_connections.set(user_id, new Map().set(websocketConnection, new Set(Queues[user_id])))
            }

            // console.log(current_connections)

            if (current_connections.get(user_id) && 
            current_connections.get(user_id).get(websocketConnection)) {
                // отправляем первое сообщение из очереди
                let message_to_send;
                for (item of current_connections.get(user_id).get(websocketConnection).keys()) {
                    message_to_send = item;
                    break;
                }
                websocketConnection.send(JSON.stringify(message_to_send));
            }

            //обработчик полученных сообщений, обратите внимание, что тело запроса приходит в json, поэтому его нужно предварительно распарсить
            websocketConnection.on("message", message => {
                const server_timestamp = Date.now()
                // console.log(server_timestamp);
                const parsedMessage = JSON.parse(message);
                // console.log(parsedMessage);
                let data_to_send =  {};
                if (parsedMessage.type == 'message') {
                    parsedMessage.server_timestamp = server_timestamp;
                    parsedMessage.status = 'Принято сервером';
                }
                
                data_to_send = parsedMessage;

                const enqueue_msg = async (msg, to_user) => {
                    Queues[to_user].add(msg);
                    if (current_connections.has(to_user)) {
                        for (entry of current_connections.get(to_user).entries()) {
                            entry[1].add(msg);
                            if (entry[1].size == 1) entry[0].send(JSON.stringify(msg));
                        }
                    }
                }

                const dequeue_first_if = async (set, msg) => {
                    if (set && set.size) {
                        let item_to_delete;
                        for (item of set.keys()) {
                            if (item.server_timestamp == msg.server_timestamp) {
                                item_to_delete = item;
                            }
                            break;
                        }
                        if (item_to_delete) {
                            set.delete(item_to_delete);
                        }
                    }
                }

                const dequeue_first_from = async set => {
                    // удаляет первый элемент множества, если таковой имеется
                    if (set && set.size) {
                        let item_to_delete;
                        for (item of set.keys()) {
                            item_to_delete = item;
                            break;
                        }
                        set.delete(item_to_delete);
                    }
                }
                
                const send_first_in_queue_message = async (websocket, queue) => {
                    // отп
                    if (queue && queue.size) {
                        let message_to_send;
                        for (item of queue.keys()) {
                            message_to_send = item;
                            break;
                        }
                        if (message_to_send) websocket.send(JSON.stringify(message_to_send));
                    }
                }

                console.log('Пришедшее сообщение: ');
                console.log(parsedMessage);
                console.log('Сообщение для пересылки;');
                console.log(data_to_send);

                if (data_to_send.type == 'MessageStatusChanged' || data_to_send.type == 'MessageReceived') {
                    // удалить из общей очереди
                    dequeue_first_if(Queues[user_id], data_to_send);

                    // удалить из очереди соответствующего websocket'a
                    dequeue_first_if(current_connections.get(user_id).get(websocketConnection), data_to_send);

                    // отправить ему след. сообщение
                    send_first_in_queue_message(websocketConnection, current_connections.get(user_id).get(websocketConnection));
                }
                else if (data_to_send.type == 'changeMessageStatus') {
                    dequeue_first_if(Queues[1 - data_to_send.to], data_to_send);

                    dequeue_first_if(current_connections.get(1 - data_to_send.to).get(websocketConnection), data_to_send);

                    enqueue_msg(data_to_send, data_to_send.to);
                }
                else {
                    enqueue_msg(data_to_send, 1);
                    enqueue_msg(data_to_send, 0);
                }
                console.log(Queues);
                console.log(current_connections);
            });

            websocketConnection.onclose = event => {
                // console.log(event);
                current_connections.get(user_id).delete(websocketConnection);
                if (current_connections.get(user_id).size == 0) {
                    current_connections.delete(user_id);
                }
                console.log(current_connections);
            }
        }
    );

    return websocketServer;
};

module.exports = websocket