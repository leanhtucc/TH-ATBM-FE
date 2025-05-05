/* eslint-disable prettier/prettier */
import ReactDOM from 'react-dom/client'
import './index.css'  // This is correct - you're already using CSS not SCSS
import reportWebVitals from './reportWebVitals'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, Empty } from 'antd'
import { HelmetProvider } from 'react-helmet-async'
import ErrorBoundary from 'components/ErrorBoundary'
import { configAntd } from 'config/antd'
import { store } from './redux/store'  // Fixed import path
import router from 'router/router'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element not found");
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <HelmetProvider>
    <ErrorBoundary>
      <ConfigProvider
        renderEmpty={() => <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có dữ liệu" />}
        theme={configAntd}
      >
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      </ConfigProvider>
    </ErrorBoundary>
  </HelmetProvider>
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()