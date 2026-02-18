'use client';

export default function Footer() {
  return (
      <footer className="bg-amber-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 text-center sm:text-left">
            {/* About */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">My Bakery</h3>
              <p className="text-amber-100 text-xs sm:text-sm">
                Freshly baked with love every day. Your happiness is our priority.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Quick Links</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-amber-100 text-xs sm:text-sm">
                <li><a href="/bakery" className="hover:text-white transition">🥐 Bakery</a></li>
                <li><a href="/drink" className="hover:text-white transition">☕ Drinks</a></li>
                <li><a href="/cake" className="hover:text-white transition">🎂 Cakes</a></li>
                <li><a href="/checkout" className="hover:text-white transition">🛒 Checkout</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Contact Us</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-amber-100 text-xs sm:text-sm">
                <li>📞 Phone: 02-xxx-xxxx</li>
                <li>📧 Email: info@mybakery.com</li>
                <li>📍 Bangkok, Thailand</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-amber-700 mt-6 sm:mt-8 pt-4 sm:pt-6 text-center text-amber-200 text-xs sm:text-sm">
            <p>© 2025 My Bakery. All rights reserved. Made with ❤️</p>
          </div>
        </div>
      </footer>
  );
}