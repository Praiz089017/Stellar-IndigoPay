import { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { AnimatePresence } from "framer-motion";
import SkipToContent from "@/components/SkipToContent";
import PageTransition from "@/components/PageTransition";
import { ThemeTiedToaster } from "@/components/ThemeTiedToaster";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { PriceProvider } from "@/lib/priceContext";
import { WalletProvider, useWallet } from "@/lib/WalletProvider";
import { ErrorBoundary } from "@/lib/ErrorBoundary";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import ConnectivityBanner from "@/components/ConnectivityBanner";
import OfflineFallback from "@/components/OfflineFallback";
import InstallPrompt from "@/components/InstallPrompt";
import { syncQueuedDonations } from "@/lib/offlineDonationQueue";
import { recordDonation } from "@/lib/api";
import Navbar from "@/components/Navbar";
import GlobalSearchModal from "@/components/GlobalSearchModal";
import { useShortcuts } from "@/hooks/useShortcuts";
import "@/styles/globals.css";

function AppContent({ Component, pageProps }: { Component: any; pageProps: any }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { publicKey, connect, disconnect } = useWallet();
  const [searchOpen, setSearchOpen] = useState(false);

  useShortcuts([
    { key: "k", meta: true, handler: () => setSearchOpen(true), description: "Open search" },
    { key: "h", ctrl: true, handler: () => router.push("/"), description: "Go home" },
    { key: "d", ctrl: true, handler: () => router.push("/dashboard"), description: "Dashboard" },
  ]);

  useEffect(() => {
    const handleRouteChange = () => {
      setTimeout(() => {
        const mainContent = document.getElementById("main-content");
        if (mainContent) {
          mainContent.focus();
        } else {
          document.querySelector("h1")?.focus();
        }
      }, 100);
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleOnlineSync = () => {
      void syncQueuedDonations(async (payload) => {
        try {
          await recordDonation({
            ...payload,
            transactionHash: payload.transactionHash || "queued-offline",
          });
          return true;
        } catch {
          return false;
        }
      });
    };

    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "sync-queued-donations") {
        handleOnlineSync();
      }
    });
    window.addEventListener("online", handleOnlineSync);

    handleOnlineSync();

    return () => {
      window.removeEventListener("online", handleOnlineSync);
    };
  }, []);

  const isWidget = router.pathname.startsWith("/widget");

  return (
    <>
      <ConnectivityBanner isOnline={isOnline} />
      {!isWidget && <SkipToContent />}
      {!isWidget && (
        <Navbar
          publicKey={publicKey}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      )}
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <OfflineFallback isOnline={isOnline} />
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={router.asPath}>
            <Component {...pageProps} />
          </PageTransition>
        </AnimatePresence>
      </main>
      <InstallPrompt />
      {searchOpen && <GlobalSearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <PriceProvider>
            <WalletProvider>
              <Head>
                <title>
                  Stellar-IndigoPay — Fund the planet. One XLM at a time.
                </title>
                <meta
                  name="description"
                  content="Donate directly to verified climate projects on Stellar. 100% on-chain, zero fees, maximum impact."
                />
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1"
                />
              </Head>
              <AppContent Component={Component} pageProps={pageProps} />
              <ThemeTiedToaster />
            </WalletProvider>
          </PriceProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
