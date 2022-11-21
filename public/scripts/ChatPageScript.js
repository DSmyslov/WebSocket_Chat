// получаем id пользователя
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

// дополняем информацию на странице
show_user_id.innerHTML += user_id;
show_nickname.innerHTML = input_nickname.value === '' ? 
`Аноним_${user_id}` : input_nickname.value

// обработчики элементов страницы
set_nickname.onclick = event => {
    event.preventDefault()
    show_nickname.innerHTML = input_nickname.value === '' ? 
    `Аноним_${user_id}` : input_nickname.value
}

// обработчики websocket соединения
const ws_onopen = event => {
    // console.log(event.target)
    console.log('Устанволено соединение')
}

connect_ws.onclick = event => {
    event.preventDefault()
    if (websocket.readyState === 3) {
        websocket = new WebSocket(`ws://${location.host}/websockets?id=${user_id}`)
        websocket.onclose = null;
        websocket.onopen = ws_onopen;
        websocket.onmessage = null;
        websocket.onerror = null;
    }
    else alert('Подключение уже установлено')
}

// описываем подключение к вебсокет серверу
let websocket = new WebSocket(`ws://${location.host}/websockets?id=${user_id}`)
websocket.onclose = null;
websocket.onopen = ws_onopen;
websocket.onmessage = null;
websocket.onerror = null;