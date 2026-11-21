import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import { Layout } from './components/Layout.jsx';
import IntroLoader from './components/IntroLoader.jsx';
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay.jsx';
import { NewsletterPopup } from './components/NewsletterSignup.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import CollectionsPage from './pages/CollectionsPage.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Customize from './pages/Customize.jsx';
import CustomQuote from './pages/CustomQuote.jsx';
import CartPage from './pages/CartPage.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import FaqPage from './pages/FaqPage.jsx';
import SitemapPage from './pages/SitemapPage.jsx';
import PoliciesPage from './pages/PoliciesPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import NotFound from './pages/NotFound.jsx';
import GuidesPage from './pages/GuidesPage.jsx';
import { Seo } from './components/Seo.jsx';
import { scrollToTop, setSmoothScrollInstance } from './lib/smoothScroll.js';
import { api } from './lib/api.js';
import { initializeAnalytics, track } from './lib/analytics.js';
import { privateRoute } from './lib/seoMetadata.js';

function CustomerSessionMonitor() {
  const navigate = useNavigate();

  useEffect(() => {
    let eventSource;
    const disconnect = () => eventSource?.close();
    const connect = () => {
      eventSource?.close();
      const baseURL = (api.defaults.baseURL || '/api/v1').replace(/\/+$/, '');
      const currentSource = new EventSource(`${baseURL}/account/session-events`, { withCredentials: true });
      eventSource = currentSource;
      currentSource.addEventListener('session-revoked', (event) => {
        currentSource.close();
        const { reason } = JSON.parse(event.data);
        navigate(`/login?reason=${reason === 'account-blocked' ? 'account-blocked' : 'session-ended'}`, { replace: true });
      });
    };

    connect();
    window.addEventListener('zavikoo:customer-session-created', connect);
    window.addEventListener('zavikoo:customer-session-ended', disconnect);
    return () => {
      eventSource?.close();
      window.removeEventListener('zavikoo:customer-session-created', connect);
      window.removeEventListener('zavikoo:customer-session-ended', disconnect);
    };
  }, [navigate]);

  return null;
}

export default function App() {
  const location = useLocation();
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return sessionStorage.getItem('zavikoo-intro-seen') !== 'true';
    } catch {
      return false;
    }
  });
  const [revealHome, setRevealHome] = useState(false);

  useEffect(() => {
    initializeAnalytics();
  }, []);

  useEffect(() => {
    if (!privateRoute.test(location.pathname)) {
      track('page_view', { page_path: location.pathname });
    }
  }, [location.pathname]);

  useEffect(() => {
    const lenis = new Lenis({
      allowNestedScroll: true,
      anchors: true,
      autoRaf: true,
      lerp: 0.1,
      respectReducedMotion: true,
      smoothWheel: true,
    });
    setSmoothScrollInstance(lenis);

    return () => {
      lenis.destroy();
      setSmoothScrollInstance(null);
    };
  }, []);

  useEffect(() => {
    if (!location.hash) scrollToTop({ immediate: true });
  }, [location.pathname, location.hash]);

  if (location.pathname.startsWith('/admin')) {
    return (
      <>
        <Seo noindex />
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </>
    );
  }

  const completeIntro = () => {
    try {
      sessionStorage.setItem('zavikoo-intro-seen', 'true');
    } catch {
      setShowIntro(false);
    }
    setShowIntro(false);
    setRevealHome(true);
  };

  return (
    <>
      <Seo />
      {!showIntro && <CustomerSessionMonitor />}
      <div
        className={!showIntro && revealHome ? 'storefront-rise-in' : ''}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setRevealHome(false);
        }}
      >
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:slug" element={<CollectionsPage />} />
            <Route path="/categories/:slug" element={<CategoryPage />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/customize" element={<Customize />} />
            <Route path="/customize/:productId" element={<Customize />} />
            <Route path="/custom-quote" element={<CustomQuote />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/sitemap" element={<SitemapPage />} />
            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/guides/:slug" element={<GuidesPage />} />
            <Route path="/size-guide" element={<PoliciesPage type="size-guide" />} />
            <Route path="/shipping-policy" element={<PoliciesPage type="shipping" />} />
            <Route path="/returns-exchanges" element={<PoliciesPage type="returns" />} />
            <Route path="/privacy-policy" element={<PoliciesPage type="privacy" />} />
            <Route path="/terms-and-conditions" element={<PoliciesPage type="terms" />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
            <Route path="/reset-password" element={<AuthPage mode="reset" />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/orders" element={<AccountPage tab="orders" />} />
            <Route path="/account/orders/:orderNumber" element={<AccountPage tab="orders" />} />
            <Route path="/account/addresses" element={<AccountPage tab="addresses" />} />
            <Route path="/account/profile" element={<AccountPage tab="profile" />} />
            <Route path="/account/designs" element={<AccountPage tab="designs" />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </div>
      {!showIntro && location.pathname === '/' && <NewsletterPopup />}
      {showIntro && <IntroLoader onComplete={completeIntro} />}
      {!showIntro && <GlobalLoadingOverlay />}
    </>
  );
}
