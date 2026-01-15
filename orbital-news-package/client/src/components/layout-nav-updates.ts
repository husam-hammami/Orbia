// ============================================
// NAVIGATION UPDATES FOR ORBITAL NEWS
// Update these sections in your layout.tsx file
// ============================================

// 1. ADD IMPORT at the top of layout.tsx:
// import { Newspaper } from "lucide-react";
// (Add Newspaper to your existing lucide-react import)

// 2. UPDATE SIDEBAR LINKS ARRAY (around line 62-70):
const sidebarLinks = [
  { href: "/", label: "Daily Tracker", icon: "ClipboardList" },
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/orbit", label: "Orbia", icon: "Orbit" },
  { href: "/career", label: "Goals & Vision", icon: "Briefcase" },
  { href: "/news", label: "Orbital News", icon: "Newspaper" },  // <-- ADD THIS LINE
  { href: "/finance", label: "Finance", icon: "Wallet" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];

// 3. UPDATE MOBILE NAV ITEMS ARRAY (around line 134-140):
const mobileNavItems = [
  { href: "/", label: "Today", icon: "ClipboardList" },
  { href: "/dashboard", label: "Insights", icon: "LayoutDashboard" },
  { href: "/orbit", label: "Orbia", icon: "Orbit", special: true },
  { href: "/career", label: "Goals", icon: "Briefcase" },
  { href: "/news", label: "News", icon: "Newspaper" },  // <-- ADD THIS LINE
];
