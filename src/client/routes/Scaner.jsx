import { Component } from 'inferno';
import io from 'socket.io-client'; // socket.io 是一个 websocket 库


// 使用 ES6 class 语法来定义 Scaner 组件
class Scaner extends Component {
  constructor(props) { // 构造器
    super(props);

    this.sendScanOder = this.sendScanOder.bind(this); // 绑定是必要的，这样 'this' 才能在回调函数中使用

    this.socket = io(); // 实例化socket对象，io() 没有指定 URL，默认将尝试连接到提供当前页面的主机

    this.socket.on('scan log', (data) => { // 接收到 'scan log' 事件时触发
      var temp = this.state.items;
      temp.push(data[0]);
      this.setState({items: temp});
    });

    // react 会监视 state 的变化，一旦发生变化就会根据 state 更新界面，
    // 只需更新组件的 state，然后根据新的 state 重新渲染用户界面（不要操作 DOM）
    this.state = {
      items: [],
    };
  }

  // 当使用 ES6 class 语法来定义一个组件的时候，事件处理器会成为类的一个方法
  sendScanOder() {
    this.socket.emit('perform scan', 'PERFORM SCAN'); // 发送一个 'perform scan' 事件
  }

  componentDidMount() {
    document.title = 'Scanner - Kikoeru';
  }

  render() {
    const { items } = this.state;
    const elementList = items.map(item => {
      if (item.result === 'failed') {
        return (
          <div class="uk-alert-danger uk-width-1 uk-margin-small-bottom" uk-alert>
            <button class="uk-alert-close" type="button" uk-close=""></button>
            {item.detail}
          </div>
        );
      } else {
        return (
          <div class="uk-alert-success uk-width-1 uk-margin-small-bottom" uk-alert>
            <button class="uk-alert-close" type="button" uk-close=""></button>
            {item.detail}
          </div>
        );
      }
    });

    return (
      <div className="uk-container">
        <h2 className="uk-margin-top">Scan</h2>
        <button className="uk-button uk-button-default uk-width-1 uk-margin-small-bottom" onClick={this.sendScanOder}>
          PERFORM SCAN
        </button>

        <div className="uk-align-center">
          {elementList}
        </div>
      </div>
    );
  }
}


export default Scaner;
