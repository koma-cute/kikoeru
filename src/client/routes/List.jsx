import { Component } from 'inferno';
import { Link } from 'inferno-router';

/**
 * Generic link list (used for circles, tags and VAs).
 */
class List extends Component {
  constructor(props) { // 构造器
    super(props);

    this.onFilter = this.onFilter.bind(this); // 绑定是必要的，这样 `this` 才能在回调函数中使用

    // react 会监视 state 的变化，一旦发生变化就会根据 state 更新界面，
    // 只需更新组件的 state，然后根据新的 state 重新渲染用户界面（不要操作 DOM）
    this.state = {
      items: null,
      filteredItems: null,
    };
  }

  componentDidMount() { // 在第一次渲染后调用
    const { restrict } = this.props;

    fetch(`/api/${restrict}s/`)
      .then(res => res.json())
      .then(res => this.setState({
        items: res,
      }))
      .catch((err) => {
        throw new Error(`Failed to fetch /api/${restrict}s/: ${err}`);
      });
      document.title = 'All {restrict}s - Kikoeru';
  }

  // 当使用 ES6 class 语法来定义一个组件的时候，事件处理器会成为类的一个方法
  onFilter(evt) {
    evt.preventDefault(); // 阻止标签的默认行为(例如<a>标签默认的点击跳转行为)
    const data = new FormData(evt.target); // evt.target 事件的目标节点(触发该事件的节点)
    const { items } = this.state;

    this.setState({
      items,
      filteredItems: items.filter(x => x.name.toLowerCase().indexOf(data.get('filter_str').toLowerCase()) !== -1),
    });
  }

  render() {
    const { restrict } = this.props;
    const { items, filteredItems } = this.state;

    if (!items) {
      return (
        <div className="uk-cover-container" uk-height-viewport>
          <div className="uk-position-center" uk-spinner="ratio: 2" />
        </div>
      );
    }

    const visibleItems = filteredItems || items;
    const elementList = visibleItems.map(item => (
      <Link
        to={`/${restrict}/${item.id}`}
        className="uk-button uk-button-default uk-width-1 uk-margin-small-bottom"
      >
        {item.name}
      </Link>
    ));

    return (
      <div className="uk-container">
        <h2 className="uk-margin-top">All {restrict}s</h2>
        <form onSubmit={this.onFilter}>
          <input name="filter_str" className="uk-input uk-width-1" type="text" placeholder={`Search for a ${restrict}...`} />
        </form>
        <div className="uk-align-center">
          {elementList}
        </div>
      </div>
    );
  }
}

export default List;
