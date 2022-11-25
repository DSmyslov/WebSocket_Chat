// получаем id текущего пользователя
const [_path, params] = document.URL.split("?");
const user_id = params.match(/id=(\d+)/)[1] - 0;


// получаем элементы страницы
const show_user_id = document.getElementById('user-id');
const show_nickname = document.getElementById('current-nickname');
const show_connection_status = document.getElementById('current-connection-status');
const input_nickname = document.getElementById('input-nickname');
const set_nickname = document.getElementById('accept-nickname');
const connect_ws = document.getElementById('connect-ws-server');
const disconenct_ws = document.getElementById('disconnect-ws-server');
const send_message = document.getElementById('send-message');
const message_text = document.getElementById('input-message');
const messages = document.getElementById('messages');


// дополняем информацию на странице
show_user_id.innerHTML += user_id;
show_nickname.innerHTML = input_nickname.value === '' ? 
`Аноним_${user_id}` : input_nickname.value;
show_connection_status.innerHTML = 'Соединение не установлено';
show_connection_status.style.color = 'red';


// обработчики элементов страницы
set_nickname.onclick = event => {
    event.preventDefault();
    show_nickname.innerHTML = input_nickname.value == '' ? 
    `Аноним_${user_id}` : input_nickname.value;

    // синхронизировать никнейм с другими вкладками данного юзера ???

}

connect_ws.onclick = event => {
    event.preventDefault();
    if (websocket.readyState == 3) {
        websocket = new WebSocket(`ws://${location.host}/websockets?id=${user_id}`);
        websocket.onclose = ws_onclose;
        websocket.onopen = ws_onopen;
        websocket.onmessage = ws_onmessage;
        websocket.onerror = ws_onerror;
    }
    else alert('Подключение к websocket серверу уже установлено')
}

disconenct_ws.onclick = event => {
    event.preventDefault();
    if (websocket.readyState == 1) {
        websocket.close(1000, JSON.stringify({ message: 'соединение закрыто пользователем' }));
    }
    else alert('Соединение с websocket сервером еще не установлено');
}

send_message.onclick = event => {
    event.preventDefault();
    if (websocket.readyState == 1) {
        const text = message_text.value
        // валидация сообщения
        if (text == '') {
            alert('Нельзя отправить пустое сообщение')
        }
        else {
            const data_to_send = {
                type: 'message',
                message: text, 
                from_nickname: show_nickname.innerHTML, 
                to: user_id ? 0 : 1,
                server_timestamp: 0,
                status: 'Отправлено на сервер'
            }
            websocket.send(JSON.stringify(data_to_send));
            message_text.value = '';
        }
    }
    else alert('Соединение с websocket сервером не установлено');
}

const showMessage = parsedMessage => {
    const new_msg_sender = document.createElement('div');
    new_msg_sender.innerHTML = parsedMessage.from_nickname;

    const new_msg_text = document.createElement('div');
    new_msg_text.innerHTML = parsedMessage.message;

    const new_msg_info = document.createElement('div');
    new_msg_info.style.display = 'flex';
    new_msg_info.style.justifyContent = 'space-between';
    new_msg_info.style.gap = '10px';
    new_msg_info.style.width = '100%';

    const new_msg = document.createElement('div');
    new_msg.setAttribute('class', 'message');
    new_msg.setAttribute('id', parsedMessage.server_timestamp);

    if (parsedMessage.to !== user_id) {
        new_msg.style.alignSelf = 'end';
        new_msg.style.marginRight = '2px';
        new_msg.style.alignItems = 'end';
        new_msg.style.borderBottomLeftRadius = '20px';
        new_msg.style.border = 'solid green';
        new_msg_info.innerHTML = `<div class="status">${parsedMessage.status}</div>
    <div class="timestamp">${new Date(parsedMessage.server_timestamp).toLocaleTimeString('ru')}</div>`;
    }
    else {
        new_msg.style.marginLeft = '2px';
        new_msg.style.borderBottomRightRadius = '20px';
        new_msg.style.border = 'solid blue';
        new_msg_info.innerHTML = `<div class="timestamp">${new Date(parsedMessage.server_timestamp).toLocaleTimeString('ru')}</div>`;
    }

    new_msg.appendChild(new_msg_sender);
    new_msg.appendChild(new_msg_text);
    new_msg.appendChild(new_msg_info);
    messages.appendChild(new_msg);

    if (parsedMessage.to == user_id) {
        new_msg.scrollIntoView();
    }
    else {
        new_msg.scrollIntoView({block: "end"});
    }
}


// обработчики websocket соединения
const ws_onopen = event => {
    // console.log(event.target)
    console.log('Соединение с websocket сервером установлено');
    show_connection_status.innerHTML = 'Соединение установлено';
    show_connection_status.style.color = 'green';
}

const ws_onerror = err => {
    console.log(err);
}

const ws_onclose = event => {
    console.log(event);
    show_connection_status.innerHTML = 'Соединение не установлено';
    show_connection_status.style.color = 'red';
}

const ws_onmessage = event => {
    // event.data
    const parsedMessage = JSON.parse(event.data);

    if (parsedMessage.type == 'changeMessageStatus') {
        let msg_to_change = document.getElementById(parsedMessage.server_timestamp);
        msg_to_change.getElementsByClassName('status')[0].innerHTML = parsedMessage.status;
        const data_to_send = {
            type: 'MessageStatusChanged',
            status: 'Отправитель получил уведомление о доставке',
            this_msg_sender: 1 - parsedMessage.to,
            server_timestamp: parsedMessage.server_timestamp
        }
        websocket.send(JSON.stringify(data_to_send));
        return;
    }

    else if (parsedMessage.type == 'message') {
        // Сообщим серверу, что получили сообщение
        const data_to_send = {
            type: 'MessageReceived',
            status: 'Получено отправителем',
            this_msg_sender: user_id,
            server_timestamp: parsedMessage.server_timestamp
        }
        websocket.send(JSON.stringify(data_to_send));
    }

    showMessage(parsedMessage);
    
    // Если пришло сообщение, и мы - получатель, то отправим сообщение о его получении
    if (parsedMessage.to == user_id) {
        const data_to_send = {
            type: 'changeMessageStatus',
            status: 'Доставлено получателю',
            to: 1 - parsedMessage.to,
            server_timestamp: parsedMessage.server_timestamp
        }
        websocket.send(JSON.stringify(data_to_send));
    }
}


// описываем подключение к вебсокет серверу
let websocket = new WebSocket(`ws://${location.host}/websockets?id=${user_id}`);
websocket.onclose = ws_onclose;
websocket.onopen = ws_onopen;
websocket.onmessage = ws_onmessage;
websocket.onerror = ws_onerror;