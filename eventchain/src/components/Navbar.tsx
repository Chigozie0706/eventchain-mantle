"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Ticket, Calendar } from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [avatar, setAvatar] = useState<string>("");

  const menuRef = useRef<HTMLDivElement>(null);
  const walletDropdownRef = useRef<HTMLDivElement>(null);

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Generate blockies avatar
  useEffect(() => {
    let mounted = true;

    if (address) {
      import("ethereum-blockies")
        .then((blockiesModule) => {
          if (!mounted) return;
          const blockies = blockiesModule.default;
          const canvas = blockies.create({
            seed: address.toLowerCase(),
            size: 8,
            scale: 4,
          });
          setAvatar(canvas.toDataURL());
        })
        .catch((error) => {
          console.error("Failed to load blockies:", error);
        });
    } else {
      setAvatar("");
    }

    return () => {
      mounted = false;
    };
  }, [address]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (
        walletDropdownRef.current &&
        !walletDropdownRef.current.contains(e.target as Node)
      ) {
        setWalletDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setWalletDropdownOpen(false);
  }, [pathname]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setWalletDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Logout handler
  const handleLogout = () => {
    disconnect();
    setWalletDropdownOpen(false);
  };

  // Navigation items configuration
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/view_events", label: "Events" },
    { href: "/create_event", label: "Create Event" },
  ];

  const userMenuItems = [
    { href: "/event_tickets", label: "My Tickets", icon: Ticket },
    { href: "/view_created_events", label: "Created Events", icon: Calendar },
  ];

  return (
    <nav className="flex items-center justify-between bg-white px-6 py-4 shadow-md fixed w-full z-50 top-0">
      {/* Logo */}
      <Link
        href="/"
        className="text-orange-500 text-xl font-bold hover:text-orange-600 transition-colors"
        aria-label="EventChain Home"
      >
        EventChain
      </Link>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Hamburger menu for mobile */}
        <button
          className="md:hidden text-gray-700 hover:text-orange-500 transition-colors p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Navigation Links */}
        <div
          ref={menuRef}
          className={`absolute md:static top-16 left-0 w-full md:w-auto bg-white shadow-md md:shadow-none transition-all duration-300 ease-in-out ${
            menuOpen
              ? "opacity-100 visible translate-y-0"
              : "opacity-0 invisible -translate-y-2 md:opacity-100 md:visible md:translate-y-0"
          } md:flex md:gap-6 md:items-center`}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="flex flex-col md:flex-row md:gap-6 px-6 py-4 md:p-0 space-y-4 md:space-y-0">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-orange-600 ${
                  pathname === item.href
                    ? "text-orange-600 font-bold"
                    : "text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile-only user menu items */}
            {isConnected && menuOpen && (
              <>
                <div className="border-t border-gray-200 pt-4 md:hidden" />
                {userMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-orange-600 transition-colors"
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Wallet Avatar + Dropdown */}
        {isConnected && address ? (
          <div className="relative" ref={walletDropdownRef}>
            <button
              onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 px-3 py-2 rounded-xl text-xs font-medium text-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
              aria-label="Wallet menu"
              aria-expanded={walletDropdownOpen}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="Wallet avatar"
                  className="w-6 h-6 rounded-lg ring-2 ring-orange-300"
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-orange-300 animate-pulse" />
              )}

              <span className="hidden sm:inline">
                {`${address.slice(0, 6)}...${address.slice(-4)}`}
              </span>

              <ChevronDown
                size={14}
                className={`text-gray-600 transition-transform duration-200 ${
                  walletDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {walletDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                role="menu"
              >
                {/* Wallet Address Display */}
                <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
                  <p className="text-xs text-gray-500 mb-1">Connected Wallet</p>
                  <p className="text-sm font-mono font-semibold text-gray-800 truncate">
                    {address}
                  </p>
                </div>

                {/* User Menu Items */}
                {userMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors group"
                      role="menuitem"
                    >
                      <Icon
                        size={16}
                        className="text-gray-500 group-hover:text-orange-600 transition-colors"
                      />
                      <span className="text-gray-700 group-hover:text-orange-600 transition-colors">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}

                {/* Disconnect Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors border-t border-gray-200 group"
                  role="menuitem"
                >
                  <X
                    size={16}
                    className="group-hover:rotate-90 transition-transform duration-200"
                  />
                  <span className="font-medium">Disconnect Wallet</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:block">
            <ConnectButton />
          </div>
        )}

        {/* Mobile Connect Button */}
        {!isConnected && (
          <div className="md:hidden">
            <ConnectButton showBalance={false} />
          </div>
        )}
      </div>
    </nav>
  );
}
