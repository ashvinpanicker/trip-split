import '@/components/marketing/marketing.css';
import Nav from '@/components/marketing/Nav';
import Footer from '@/components/marketing/Footer';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white px-3 py-2 rounded-lg z-50">
        Skip to content
      </a>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
