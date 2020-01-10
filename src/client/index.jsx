// JavaScript 模块导入（ES6 形式）
import { render } from 'inferno'; // 用于构建用户界面的 JavaScript 库
import { Provider } from 'inferno-redux';
import { BrowserRouter, Route, Switch } from 'inferno-router'; // 路由
import { createBrowserHistory } from 'history'; // React Router 是建立在 history 之上的。一个 history 知道如何去监听浏览器地址栏的变化， 并解析这个 URL 转化为 location 对象， 然后 router 使用它匹配到路由，最后正确地渲染对应的组件。
import { createStore } from 'redux'; // Redux 是 JavaScript 状态容器，提供可预测化的状态管理

import UIkit from 'uikit';
import Icons from 'uikit/dist/js/uikit-icons';

import AudioElement from './components/AudioElement';
import PlayerBar from './components/PlayerBar';
import Player from './routes/Player';
import Work from './routes/Work';
import Works from './routes/Works';
import List from './routes/List';
import Reducer from './reducer';
import Scaner from './routes/Scaner';

import './static/style/uikit.stripped.less';
import './static/style/kikoeru.css';
import ErrorBoundary from './components/ErrorBoundary';
import NavBar from './components/NavBar';

// Enable UIkit icon plugin
UIkit.use(Icons);

const browserHistory = createBrowserHistory();
const store = createStore(Reducer);

const App = () => (
  <Provider store={store}>
    <ErrorBoundary>
      <BrowserRouter history={browserHistory}>
        <NavBar />
        <Switch>
          <Route exact path="/" component={Works} />
          <Route path="/player/" component={Player} />
          <Route path="/work/:rjcode" component={Work} />
          <Route path="/scan" component={Scaner} />

          <Route path="/circle/:id" component={p => <Works restrict="circle" {...p} />} />
          <Route path="/tag/:id" component={p => <Works restrict="tag" {...p} />} />
          <Route path="/va/:id" component={p => <Works restrict="va" {...p} />} />

          <Route path="/circles/" component={p => <List restrict="circle" {...p} />} />
          <Route path="/tags/" component={p => <List restrict="tag" {...p} />} />
          <Route path="/vas/" component={p => <List restrict="va" {...p} />} />      
        </Switch>
        <PlayerBar />
      </BrowserRouter>
    </ErrorBoundary>
    <AudioElement />
  </Provider>
);

render(<App />, document.getElementById('root'));
