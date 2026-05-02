import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/components/ecommerce/cart/cart-provider";
import { CartSheet } from "@/components/ecommerce/cart/cart-sheet";
import { AddToCartConfirmationDialog } from "@/components/ecommerce/cart/add-to-cart-confirmation-dialog";
import { OptionalClerkProvider } from "@/components/auth/optional-clerk-provider";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Manewax - Premium Equine Care Products",
  description: "Hand-made wax products for horse health, beauty and grooming. Premium equine care for riders, owners, and groomers.",
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32' }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var dbpr=100;if(Math.random()*100>100-dbpr){var d="dbbRum",w=window,o=document,a=addEventListener,scr=o.createElement("script");scr.async=!0;w[d]=w[d]||[];w[d].push(["presampling",dbpr]);["error","unhandledrejection"].forEach(function(t){a(t, function (e) { w[d].push([t, e]) });});scr.src="https://cdn.debugbear.com/Z017oEMltBEK.js";o.head.appendChild(scr);}})()`}} />
      </head>
      <body className="min-h-full flex flex-col">
        <OptionalClerkProvider>
          <CartProvider>
            <TooltipProvider>
              <header className="border-b bg-white">
              <div className="container mx-auto grid h-16 grid-cols-[1fr_auto_1fr] items-center px-4">
                <div className="justify-self-start">
                  <Link href="/" className="flex items-center space-x-2">
                    <Image
                      src="/manewax-logo.png"
                      alt="Mane Logo"
                      width={32}
                      height={32}
                      className="h-8 w-auto"
                    />
                    <span className="text-xl font-bold text-slate-800">ManeWax</span>
                  </Link>
                </div>

                <nav className="hidden md:flex items-center justify-self-center space-x-6">
                  {/* <Link href="/shop" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                    Shop
                  </Link>
                  <Link href="/resources" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                    Resources
                  </Link> */}
                  <span className="text-lg font-bold text-slate-800">
                    Welcome to Kari's Grooming Room!
                  </span>
                </nav>  

                <div className="flex items-center justify-self-end space-x-3">
                  <Suspense>
                    <CartSheet />
                    <AddToCartConfirmationDialog />
                  </Suspense>
                </div>
              </div>
            </header>
              <main className="flex-1">
                {children}
              </main>
            </TooltipProvider>
          </CartProvider>
        </OptionalClerkProvider>
      </body>
    </html>
  );
}
