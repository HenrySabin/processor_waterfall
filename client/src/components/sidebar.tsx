import { Link, useLocation } from "wouter";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "fas fa-tachometer-alt", current: true },
  { name: "Processors", href: "/processors", icon: "fas fa-server", current: false },
  { name: "Transactions", href: "/transactions", icon: "fas fa-list-alt", current: false },
  { name: "Health", href: "/health", icon: "fas fa-heart", current: false },
  { name: "Configuration", href: "/config", icon: "fas fa-cogs", current: false },
  { name: "Smart Contracts", href: "/contracts", icon: "fas fa-link", current: false },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-card shadow-lg border-r border-border" data-testid="sidebar">
      <div className="p-6 border-b border-border">
        <div className="flex items-center">
          <i className="fas fa-credit-card text-primary text-2xl mr-3" data-testid="logo-icon"></i>
          <h1 className="text-xl font-bold text-foreground" data-testid="app-title">PayFlow</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1" data-testid="app-subtitle">Waterfall System</p>
      </div>
      
      <nav className="mt-6">
        {navigation.map((item) => {
          const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center px-6 py-3 transition-all cursor-pointer ${
                  isActive
                    ? "text-primary bg-accent border-r-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <i className={`${item.icon} mr-3`}></i>
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
