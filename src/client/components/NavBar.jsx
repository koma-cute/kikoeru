import { Link, withRouter } from 'inferno-router';
import UIkit from 'uikit';

const closeOffCanvasNav = () => {
  const element = document.getElementById('offcanvas-nav');
  UIkit.offcanvas(element).hide();
};

/**
 * 
 * @param {*} props 
 * 每个组件对象都会有props（properties的简写）属性,组件标签的所有属性都保存在props中
 * 作用：通过标签属性从组件外 向组件内传递数据
 */
const OffCanvasNav = (props) => {
  const { location } = props;
  const path = location.pathname; // 获取当前的路由地址

  return (
    <div id="offcanvas-nav" uk-offcanvas="mode: reveal; overlay: true; flip: true">
      <div className="uk-offcanvas-bar uk-flex uk-flex-column">
        <ul className="uk-nav uk-nav-primary uk-nav-center uk-margin-auto-vertical">
          <li className="k-logo k-logo-muted" />
          <li className="uk-nav-header">Browse</li>
          
          <li className={path === '/' ? 'uk-active' : 'uk-parent'}>
            {/**路径跳转组件Link */}
            <Link to="/" onClick={closeOffCanvasNav}>
              <span className="uk-margin-small-right" uk-icon="icon: thumbnails" />
              Works
            </Link>
          </li>

          <li className={path === '/circles/' ? 'uk-active' : 'uk-parent'}>
            <Link to="/circles/" onClick={closeOffCanvasNav}>
              <span className="uk-margin-small-right" uk-icon="icon: users" />
              Circles
            </Link>
          </li>

          <li className={path === '/tags/' ? 'uk-active' : 'uk-parent'}>
            <Link to="/tags/" onClick={closeOffCanvasNav}>
              <span className="uk-margin-small-right" uk-icon="icon: tag" />
              Tags
            </Link>
          </li>

          <li className={path === '/vas/' ? 'uk-active' : 'uk-parent'}>
            <Link to="/vas/" onClick={closeOffCanvasNav}>
              <span className="uk-margin-small-right" uk-icon="icon: microphone" />
              VAs
            </Link>
          </li>

          <li className={path === '/scan/' ? 'uk-active' : 'uk-parent'}>
            <Link to="/scan/" onClick={closeOffCanvasNav}>
              <span className="uk-margin-small-right" uk-icon="icon: search" />
              Scan
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

/**
 * 将一个组件包裹进Route里面, 然后react-router的三个对象history, location, match就会被放进这个组件的props属性中.
 * 所以withRouter的作用就是, 如果我们某个东西不是一个Router, 
 * 但是我们要依靠它去跳转一个页面, 比如点击页面的logo, 返回首页, 这时候就可以使用withRouter来做.
 */
const OffCanvasNavWithRouter = withRouter(OffCanvasNav);

const NavBar = (props) => {
  const { location } = props;
  const transparent = location.pathname === '/player/';

  return (
    <>
      <div className={`uk-navbar uk-navbar-container uk-navbar-transparent ${transparent ? '' : 'uk-background-secondary'}`} uk-navbar>
        <div className="uk-navbar-left uk-dark">
          <div className="uk-navbar-item uk-logo">
            <span className="k-logo" />
          </div>
        </div>

        <div className="uk-navbar-right">
          <button type="button" className="uk-navbar-toggle" uk-toggle="target: #offcanvas-nav" uk-navbar-toggle-icon />
          <OffCanvasNavWithRouter />
        </div>
      </div>
    </>
  );
};

export default withRouter(NavBar);
